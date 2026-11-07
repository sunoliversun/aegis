import { NextRequest, NextResponse } from "next/server";
import { db } from "@aegis/db";
import { runScan, saveScan } from "@aegis/api";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusherServer";

// SendGrid Inbound Parse sends multipart/form-data
// Recipient format: {memberId}@scan.yourdomain.com
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const to = formData.get("to") as string | null;
    const from = formData.get("from") as string | null;
    const subject = formData.get("subject") as string | null;
    const text = (formData.get("text") as string | null) ?? "";
    const html = formData.get("html") as string | null;

    if (!to) {
      return NextResponse.json({ error: "Missing to address" }, { status: 400 });
    }

    // Extract the local part before @ to match scanEmail
    const toAddress = to.match(/<([^>]+)>/)?.[1] ?? to.trim();

    const member = await db.householdMember.findFirst({
      where: { scanEmail: toAddress },
      select: { id: true, householdId: true },
    });

    if (!member) {
      // Silently accept — don't expose whether a member exists
      return NextResponse.json({ ok: true });
    }

    const content = text || (html ?? "").replace(/<[^>]+>/g, " ").trim();

    const result = await runScan({
      type: "EMAIL",
      content,
      sender: from ?? undefined,
      subject: subject ?? undefined,
    });

    const scan = await saveScan({
      memberId: member.id,
      householdId: member.householdId,
      type: "EMAIL",
      content,
      sender: from ?? undefined,
      subject: subject ?? undefined,
      result,
    });

    if (result.verdict !== "SAFE") {
      await pusherServer.trigger(
        CHANNELS.household(member.householdId),
        EVENTS.NEW_ALERT,
        {
          scanId: scan.id,
          type: "EMAIL",
          verdict: result.verdict,
          riskScore: result.riskScore,
          summary: result.summary,
          sender: from,
          subject,
        }
      );
    }

    return NextResponse.json({ ok: true, verdict: result.verdict, riskScore: result.riskScore });
  } catch (err) {
    console.error("[webhook/email]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
