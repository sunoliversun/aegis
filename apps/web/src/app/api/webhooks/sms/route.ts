import { NextRequest } from "next/server";
import { db } from "@aegis/db";
import { runScan, saveScan } from "@aegis/api";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusherServer";

// Twilio SMS webhook — application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const to = params.get("To");
    const from = params.get("From");
    const messageBody = params.get("Body") ?? "";

    if (!to || !from) {
      return twiml("<Response></Response>");
    }

    const member = await db.householdMember.findFirst({
      where: { twilioNumber: to },
      select: { id: true, householdId: true },
    });

    if (!member) {
      return twiml("<Response></Response>");
    }

    const result = await runScan({
      type: "SMS",
      content: messageBody,
      sender: from,
    });

    const scan = await saveScan({
      memberId: member.id,
      householdId: member.householdId,
      type: "SMS",
      content: messageBody,
      sender: from,
      result,
    });

    if (result.verdict !== "SAFE") {
      await pusherServer.trigger(
        CHANNELS.household(member.householdId),
        EVENTS.NEW_ALERT,
        {
          scanId: scan.id,
          type: "SMS",
          verdict: result.verdict,
          riskScore: result.riskScore,
          summary: result.summary,
          sender: from,
        }
      );
    }

    return twiml("<Response></Response>");
  } catch (err) {
    console.error("[webhook/sms]", err);
    return twiml("<Response></Response>");
  }
}

function twiml(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
