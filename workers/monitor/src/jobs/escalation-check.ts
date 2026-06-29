import { Worker } from "bullmq";
import { db } from "@aegis/db";
import { connection } from "../queue";
import { triggerEscalation } from "../integrations/pagerduty";
import { sendSMS, sendEmail, pushToHousehold, alertEmailHtml } from "../integrations/notifications";

const ESCALATION_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export function startEscalationCheckWorker() {
  return new Worker(
    "escalation-check",
    async () => {
      const now = new Date();
      const threshold = new Date(now.getTime() - ESCALATION_THRESHOLD_MS);

      // Find HIGH/CRITICAL alerts unacknowledged for > 30 minutes
      const unacknowledgedAlerts = await db.alert.findMany({
        where: {
          severity: { in: ["HIGH", "CRITICAL"] },
          status: "NEW",
          createdAt: { lte: threshold },
          escalation: null,
        },
        include: {
          household: {
            include: {
              members: {
                where: { role: "OWNER" },
                include: { user: true },
              },
            },
          },
        },
        take: 20,
      });

      for (const alert of unacknowledgedAlerts) {
        const owner = alert.household.members[0];
        if (!owner) continue;

        // Create escalation record
        const escalation = await db.escalation.create({
          data: {
            householdId: alert.householdId,
            alertId: alert.id,
            summary: `Auto-escalated: ${alert.title}. Unacknowledged for 30+ minutes.`,
            status: "PENDING",
            priority: alert.severity === "CRITICAL" ? "critical" : "high",
          },
        });

        // Trigger PagerDuty
        try {
          const pdKey = await triggerEscalation({
            householdName: alert.household.name,
            alertTitle: alert.title,
            alertDescription: alert.description,
            severity: alert.severity,
            escalationId: escalation.id,
            householdId: alert.householdId,
          });

          await db.escalation.update({
            where: { id: escalation.id },
            data: { pagerdutyId: pdKey, status: "ANALYST_ASSIGNED", assignedAt: new Date() },
          });
        } catch (e) {
          console.error("PagerDuty trigger failed:", e);
        }

        // Update alert status
        await db.alert.update({
          where: { id: alert.id },
          data: { status: "ESCALATED" },
        });

        // Notify owner
        if (owner.user.phone) {
          await sendSMS(
            owner.user.phone,
            `Critical alert: ${alert.title}. An Aegis analyst has been assigned. Check your dashboard.`
          );
        }

        if (owner.user.email) {
          await sendEmail({
            to: owner.user.email,
            subject: `🚨 Analyst assigned to your critical alert`,
            html: alertEmailHtml({
              title: `Analyst assigned: ${alert.title}`,
              description: `This alert has been unacknowledged for 30 minutes. An Aegis security analyst has been assigned and will contact you shortly.`,
              severity: alert.severity,
              dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alert.id}`,
            }),
          });
        }

        // Real-time push
        await pushToHousehold(alert.householdId, "alert-updated", {
          id: alert.id,
          status: "ESCALATED",
          escalationId: escalation.id,
        });
      }

      // Also check for pending escalations already created but not yet assigned (PagerDuty webhook fallback)
      const pendingEscalations = await db.escalation.findMany({
        where: { status: "PENDING", createdAt: { lte: new Date(now.getTime() - 5 * 60 * 1000) } },
        include: { alert: true, household: { include: { members: { where: { role: "OWNER" }, include: { user: true } } } } },
      });

      for (const esc of pendingEscalations) {
        if (!esc.pagerdutyId) {
          // Retry PagerDuty trigger
          try {
            await triggerEscalation({
              householdName: esc.household.name,
              alertTitle: esc.alert.title,
              alertDescription: esc.alert.description,
              severity: esc.alert.severity,
              escalationId: esc.id,
              householdId: esc.householdId,
            });
            await db.escalation.update({ where: { id: esc.id }, data: { status: "ANALYST_ASSIGNED", assignedAt: new Date() } });
          } catch (e) {
            console.error("PagerDuty retry failed for escalation", esc.id);
          }
        }
      }

      return {
        autoEscalated: unacknowledgedAlerts.length,
        retried: pendingEscalations.length,
      };
    },
    { connection, concurrency: 1 }
  );
}
