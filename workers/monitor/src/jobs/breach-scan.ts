import { Worker } from "bullmq";
import { db } from "@aegis/db";
import { connection } from "../queue";
import { checkEmailBreaches } from "../integrations/hibp";
import { pushToHousehold, sendEmail, alertEmailHtml } from "../integrations/notifications";
import { createDecipheriv } from "crypto";

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? "0".repeat(64), "hex");

function decrypt(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encData = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  return Buffer.concat([decipher.update(encData), decipher.final()]).toString("utf8");
}

async function createBreachAlert(householdId: string, memberId: string, assetId: string, breachName: string, dataClasses: string[]) {
  const existingAlert = await db.alert.findFirst({
    where: {
      householdId,
      memberId,
      category: "BREACH",
      rawData: { path: ["breachName"], equals: breachName },
      status: { not: "RESOLVED" },
    },
  });
  if (existingAlert) return null;

  const severity = dataClasses.some((d) =>
    ["Passwords", "Credit cards", "Bank account numbers", "Social security numbers"].includes(d)
  ) ? "HIGH" : "MEDIUM";

  const alert = await db.alert.create({
    data: {
      householdId,
      memberId,
      category: "BREACH",
      severity,
      title: `Data breach: ${breachName}`,
      description: `Your data was found in the ${breachName} breach. Exposed: ${dataClasses.slice(0, 3).join(", ")}${dataClasses.length > 3 ? "..." : ""}.`,
      rawData: { breachName, dataClasses, assetId },
      remediationSteps: {
        create: [
          { order: 1, title: "Change your password immediately", description: `Log into your ${breachName} account and update your password to a unique, strong one.`, actionType: "MANUAL" },
          { order: 2, title: "Enable two-factor authentication", description: "Turn on 2FA on the affected account to prevent unauthorized access.", actionType: "MANUAL" },
          { order: 3, title: "Check for reused passwords", description: "If you reused this password elsewhere, change it on those accounts too.", actionType: "MANUAL" },
          { order: 4, title: "Monitor your accounts", description: "Watch for suspicious activity over the next 30 days.", actionType: "MANUAL" },
        ],
      },
    },
    include: { member: { include: { user: true } } },
  });

  return alert;
}

export function startBreachScanWorker() {
  return new Worker(
    "breach-scan",
    async (job) => {
      const { householdId } = job.data;

      const members = await db.householdMember.findMany({
        where: { householdId },
        include: {
          monitoredAssets: { where: { type: "EMAIL" } },
          user: true,
        },
      });

      let newBreaches = 0;

      for (const member of members) {
        for (const asset of member.monitoredAssets) {
          const email = decrypt(asset.valueEncrypted);

          try {
            const breaches = await checkEmailBreaches(email);

            for (const breach of breaches) {
              const existing = await db.breachRecord.findFirst({
                where: { assetId: asset.id, breachName: breach.Name },
              });

              if (!existing) {
                await db.breachRecord.create({
                  data: {
                    assetId: asset.id,
                    source: "HaveIBeenPwned",
                    breachName: breach.Name,
                    breachDate: breach.BreachDate ? new Date(breach.BreachDate) : null,
                    dataClasses: breach.DataClasses,
                    description: breach.Description,
                  },
                });

                const alert = await createBreachAlert(householdId, member.id, asset.id, breach.Name, breach.DataClasses);
                if (alert) {
                  newBreaches++;

                  // Real-time push
                  await pushToHousehold(householdId, "new-alert", {
                    id: alert.id,
                    title: alert.title,
                    severity: alert.severity,
                    category: alert.category,
                  });

                  // Email for HIGH severity
                  if (alert.severity === "HIGH" && member.user.email) {
                    await sendEmail({
                      to: member.user.email,
                      subject: `🚨 Data breach detected: ${breach.Name}`,
                      html: alertEmailHtml({
                        title: alert.title,
                        description: alert.description,
                        severity: alert.severity,
                        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts`,
                      }),
                    });
                  }
                }
              }
            }

            await db.monitoredAsset.update({
              where: { id: asset.id },
              data: { lastScannedAt: new Date() },
            });

            // HIBP rate limit: 1 request per 1.5 seconds
            await new Promise((r) => setTimeout(r, 1600));
          } catch (e: any) {
            console.error(`Breach scan failed for asset ${asset.id}:`, e.message);
          }
        }
      }

      return { scanned: members.reduce((a, m) => a + m.monitoredAssets.length, 0), newBreaches };
    },
    { connection, concurrency: 2 }
  );
}
