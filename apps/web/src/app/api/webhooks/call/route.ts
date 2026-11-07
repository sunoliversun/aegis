import { NextRequest } from "next/server";
import { db } from "@aegis/db";
import { runScan, saveScan } from "@aegis/api";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusherServer";

// Twilio Voice webhook — fires on incoming call
// Scan runs in the background while the call rings through.
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const to = params.get("To");
    const from = params.get("From") ?? "Unknown";
    const callerName = params.get("CallerName") ?? "";

    if (!to) {
      return twiml("<Response><Reject/></Response>");
    }

    const member = await db.householdMember.findFirst({
      where: { twilioNumber: to },
      select: { id: true, householdId: true },
    });

    if (!member) {
      return twiml("<Response><Reject/></Response>");
    }

    const content = [
      `Incoming call from: ${from}`,
      callerName ? `Caller name: ${callerName}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Scan in background — don't block the TwiML response
    runScan({ type: "CALL", content, sender: from })
      .then((result) =>
        saveScan({
          memberId: member.id,
          householdId: member.householdId,
          type: "CALL",
          content,
          sender: from,
          result,
        }).then((scan) => {
          if (result.verdict !== "SAFE") {
            return pusherServer.trigger(
              CHANNELS.household(member.householdId),
              EVENTS.NEW_ALERT,
              {
                scanId: scan.id,
                type: "CALL",
                verdict: result.verdict,
                riskScore: result.riskScore,
                summary: result.summary,
                sender: from,
                callerName,
              }
            );
          }
        })
      )
      .catch((err) => console.error("[webhook/call] background scan failed", err));

    return twiml(`<Response><Dial>${to}</Dial></Response>`);
  } catch (err) {
    console.error("[webhook/call]", err);
    return twiml("<Response><Reject/></Response>");
  }
}

function twiml(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
