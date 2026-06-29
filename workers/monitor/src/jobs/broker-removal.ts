import { Worker } from "bullmq";
import { db } from "@aegis/db";
import { connection } from "../queue";
import { pushToHousehold } from "../integrations/notifications";
import axios from "axios";

async function submitOptOut(brokerUrl: string, memberId: string): Promise<"submitted" | "failed"> {
  try {
    // In production: call EasyOptOuts or Optery white-label API
    const res = await axios.post(
      "https://api.easyoptouts.com/v1/optout",
      { url: brokerUrl, profile_id: memberId },
      { headers: { Authorization: `Bearer ${process.env.OPTERY_API_KEY}` }, timeout: 10_000 }
    );
    return res.data.status === "submitted" ? "submitted" : "failed";
  } catch {
    return "failed";
  }
}

export function startBrokerRemovalWorker() {
  return new Worker(
    "broker-removal",
    async (job) => {
      const { householdId } = job.data;
      const now = new Date();

      // Get pending and reappeared removals due for processing
      const removals = await db.brokerRemoval.findMany({
        where: {
          member: { householdId },
          status: { in: ["PENDING", "REAPPEARED"] },
          nextCheckAt: { lte: now },
        },
        include: { member: { select: { householdId: true } } },
        take: 50,
      });

      let submitted = 0;
      let failed = 0;

      for (const removal of removals) {
        const result = await submitOptOut(removal.brokerUrl, removal.memberId);

        if (result === "submitted") {
          await db.brokerRemoval.update({
            where: { id: removal.id },
            data: {
              status: "SUBMITTED",
              submittedAt: now,
              attempts: removal.attempts + 1,
              nextCheckAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // check in 7 days
            },
          });
          submitted++;
        } else {
          await db.brokerRemoval.update({
            where: { id: removal.id },
            data: {
              status: removal.attempts >= 5 ? "FAILED" : "PENDING",
              attempts: removal.attempts + 1,
              lastError: "Submission failed",
              nextCheckAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // retry in 1 day
            },
          });
          failed++;
        }

        await new Promise((r) => setTimeout(r, 500));
      }

      // Check confirmed removals to see if data re-appeared
      const confirmed = await db.brokerRemoval.findMany({
        where: {
          member: { householdId },
          status: "CONFIRMED",
          nextCheckAt: { lte: now },
        },
        take: 30,
      });

      let reappeared = 0;
      for (const r of confirmed) {
        // In production: query broker to verify removal persists
        // For now, schedule re-check in 30 days
        await db.brokerRemoval.update({
          where: { id: r.id },
          data: { nextCheckAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        });
      }

      if (reappeared > 0) {
        await pushToHousehold(householdId, "broker-update", { reappeared });
      }

      return { submitted, failed, checked: confirmed.length, reappeared };
    },
    { connection, concurrency: 3 }
  );
}
