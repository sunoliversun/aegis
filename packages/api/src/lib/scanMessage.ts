import Anthropic from "@anthropic-ai/sdk";
import { db } from "@aegis/db";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

export type ScanVerdict = "SAFE" | "SUSPICIOUS" | "PHISHING";

export interface ScanResult {
  verdict: ScanVerdict;
  riskScore: number;
  summary: string;
  findings: Array<{ flag: string; detail: string; severity: string }>;
}

export async function runScan(opts: {
  type: "EMAIL" | "SMS" | "CALL";
  content: string;
  sender?: string;
  subject?: string;
}): Promise<ScanResult> {
  const userMessage = [
    `Type: ${opts.type}`,
    opts.sender ? `Sender: ${opts.sender}` : null,
    opts.subject ? `Subject: ${opts.subject}` : null,
    `Content:\n${opts.content}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-5-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = (response.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : raw) as ScanResult;
}

export async function saveScan(opts: {
  memberId: string;
  householdId: string;
  type: "EMAIL" | "SMS" | "CALL";
  content: string;
  sender?: string;
  subject?: string;
  result: ScanResult;
}) {
  let alertId: string | undefined;

  if (opts.result.verdict === "PHISHING" || opts.result.verdict === "SUSPICIOUS") {
    const alert = await db.alert.create({
      data: {
        householdId: opts.householdId,
        memberId: opts.memberId,
        category: "PHISHING",
        severity: opts.result.verdict === "PHISHING" ? "HIGH" : "MEDIUM",
        title: `${opts.result.verdict === "PHISHING" ? "Phishing" : "Suspicious"} ${opts.type.toLowerCase()} detected`,
        description: opts.result.summary,
        rawData: {
          type: opts.type,
          sender: opts.sender,
          subject: opts.subject,
          findings: opts.result.findings,
        },
        status: "NEW",
      },
    });
    alertId = alert.id;
  }

  return db.messageScan.create({
    data: {
      memberId: opts.memberId,
      type: opts.type,
      content: opts.content,
      sender: opts.sender,
      subject: opts.subject,
      verdict: opts.result.verdict,
      riskScore: opts.result.riskScore,
      findings: opts.result.findings,
      summary: opts.result.summary,
      ...(alertId && { alertId }),
    },
  });
}
