import { NextRequest, NextResponse } from "next/server";
import { db } from "@aegis/db";
import { runScan, saveScan } from "@aegis/api";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusherServer";
import { z } from "zod";

const schema = z.object({
  sender: z.string(),
  body: z.string(),
});

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const session = await db.session.findUnique({
    where: { sessionToken: token },
    select: { userId: true, expires: true },
  });
  return session && session.expires > new Date() ? session.userId : null;
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { sender, body: messageBody } = parsed.data;

  const member = await db.householdMember.findFirst({
    where: { userId },
    select: { id: true, householdId: true },
  });
  if (!member) return NextResponse.json({ error: "No household" }, { status: 404 });

  const result = await runScan({ type: "CALL", content: messageBody, sender });
  const scan = await saveScan({
    memberId: member.id,
    householdId: member.householdId,
    type: "CALL",
    content: messageBody,
    sender,
    result,
  });

  if (result.verdict !== "SAFE") {
    await pusherServer.trigger(CHANNELS.household(member.householdId), EVENTS.NEW_ALERT, {
      scanId: scan.id,
      type: "CALL",
      verdict: result.verdict,
      riskScore: result.riskScore,
      summary: result.summary,
      sender,
    });
  }

  return NextResponse.json({ verdict: result.verdict, riskScore: result.riskScore, summary: result.summary });
}
