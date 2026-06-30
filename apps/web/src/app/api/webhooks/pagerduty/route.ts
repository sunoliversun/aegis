import { NextRequest, NextResponse } from "next/server";
import { db } from "@aegis/db";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // PagerDuty sends an array of messages
  const messages: any[] = body.messages ?? [];

  for (const msg of messages) {
    const { event, log_entries } = msg;
    const incident = msg.incident;
    if (!incident) continue;

    // dedup_key = escalationId
    const escalationId = incident.dedup_key ?? incident.id;

    if (event === "incident.acknowledge" || event === "incident.assign") {
      const assignee = log_entries?.[0]?.agent?.name ?? "Analyst";
      await db.escalation.update({
        where: { id: escalationId },
        data: { status: "IN_PROGRESS", analystName: assignee },
      }).catch(() => null);

      await db.escalationMessage.create({
        data: {
          escalationId,
          senderType: "analyst",
          senderName: assignee,
          message: `Analyst ${assignee} has acknowledged this escalation and is actively investigating.`,
        },
      }).catch(() => null);
    }

    if (event === "incident.resolve") {
      await db.escalation.update({
        where: { id: escalationId },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      }).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true });
}
