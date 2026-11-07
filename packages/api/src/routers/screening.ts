import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Anthropic from "@anthropic-ai/sdk";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ScanTypeSchema = z.enum(["EMAIL", "SMS", "CALL"]);

const SYSTEM_PROMPT = `You are a fraud detection engine. Analyze the provided message for phishing, smishing, vishing, and social engineering attacks.

Return ONLY valid JSON in this exact shape:
{
  "verdict": "SAFE" | "SUSPICIOUS" | "PHISHING",
  "riskScore": <0-100>,
  "summary": "<plain English explanation, 1-2 sentences>",
  "findings": [
    { "flag": "<short label>", "detail": "<explanation>", "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }
  ]
}

Verdict rules:
- SAFE: No meaningful red flags. riskScore 0-20.
- SUSPICIOUS: Some red flags but not conclusive. riskScore 21-69.
- PHISHING: Clear attack indicators. riskScore 70-100.

Red flag categories to check:
- Domain age / lookalike domains (paypa1.com, chase-secure.ru)
- Urgency or threat language
- Requests for credentials, payment, gift cards
- SPF/DKIM failures (mention if sender domain is suspicious)
- Link destinations redirecting to unrelated domains
- Brand impersonation patterns
- Voice clone signatures (for calls)
- Caller ID spoofing indicators
- Grandparent / emergency scam patterns
- IRS / government impersonation
- Prize / lottery scams

For SAFE messages with no findings, return an empty findings array.`;

export const screeningRouter = createTRPCRouter({
  scan: protectedProcedure
    .input(z.object({
      type: ScanTypeSchema,
      content: z.string().min(1).max(10000),
      sender: z.string().optional(),
      subject: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({
        where: { userId: ctx.session.user.id },
        include: { household: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const userMessage = [
        `Type: ${input.type}`,
        input.sender ? `Sender: ${input.sender}` : null,
        input.subject ? `Subject: ${input.subject}` : null,
        `Content:\n${input.content}`,
      ].filter(Boolean).join("\n");

      const response = await anthropic.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const raw = (response.content[0] as { type: string; text: string }).text.trim();
      let result: {
        verdict: "SAFE" | "SUSPICIOUS" | "PHISHING";
        riskScore: number;
        summary: string;
        findings: Array<{ flag: string; detail: string; severity: string }>;
      };

      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse scan result" });
      }

      // Create an alert for PHISHING or SUSPICIOUS
      let alertId: string | undefined;
      if (result.verdict === "PHISHING" || result.verdict === "SUSPICIOUS") {
        const severityMap = { SAFE: "LOW", SUSPICIOUS: "MEDIUM", PHISHING: "HIGH" } as const;
        const alert = await ctx.db.alert.create({
          data: {
            householdId: member.householdId,
            memberId: member.id,
            category: "PHISHING",
            severity: result.verdict === "PHISHING" ? "HIGH" : "MEDIUM",
            title: `${result.verdict === "PHISHING" ? "Phishing" : "Suspicious"} ${input.type.toLowerCase()} detected`,
            description: result.summary,
            rawData: { type: input.type, sender: input.sender, subject: input.subject, findings: result.findings },
            status: "NEW",
          },
        });
        alertId = alert.id;
      }

      const scan = await ctx.db.messageScan.create({
        data: {
          memberId: member.id,
          type: input.type,
          content: input.content,
          sender: input.sender,
          subject: input.subject,
          verdict: result.verdict,
          riskScore: result.riskScore,
          findings: result.findings,
          summary: result.summary,
          ...(alertId && { alertId }),
        },
      });

      return { ...scan, findings: result.findings };
    }),

  list: protectedProcedure
    .input(z.object({
      type: ScanTypeSchema.optional(),
      verdict: z.enum(["SAFE", "SUSPICIOUS", "PHISHING"]).optional(),
      limit: z.number().min(1).max(100).default(25),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const scans = await ctx.db.messageScan.findMany({
        where: {
          memberId: member.id,
          ...(input.type && { type: input.type }),
          ...(input.verdict && { verdict: input.verdict }),
          ...(input.cursor && { id: { lt: input.cursor } }),
        },
        orderBy: { scannedAt: "desc" },
        take: input.limit + 1,
      });

      const hasMore = scans.length > input.limit;
      return {
        scans: hasMore ? scans.slice(0, -1) : scans,
        nextCursor: hasMore ? scans[scans.length - 2]?.id : undefined,
      };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    const [total, phishing, suspicious, byType] = await Promise.all([
      ctx.db.messageScan.count({ where: { memberId: member.id } }),
      ctx.db.messageScan.count({ where: { memberId: member.id, verdict: "PHISHING" } }),
      ctx.db.messageScan.count({ where: { memberId: member.id, verdict: "SUSPICIOUS" } }),
      ctx.db.messageScan.groupBy({
        by: ["type"],
        where: { memberId: member.id },
        _count: { type: true },
      }),
    ]);

    return { total, phishing, suspicious, safe: total - phishing - suspicious, byType };
  }),
});
