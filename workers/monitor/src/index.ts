import "dotenv/config";
import cron from "node-cron";
import { queues } from "./queue";
import { startBreachScanWorker } from "./jobs/breach-scan";
import { startEscalationCheckWorker } from "./jobs/escalation-check";
import { startBrokerRemovalWorker } from "./jobs/broker-removal";
import { startDeviceScanWorker } from "./jobs/device-scan";
import { db } from "@aegis/db";

console.log("🛡️  Aegis Monitor starting...");

// Start all workers
const workers = [
  startBreachScanWorker(),
  startEscalationCheckWorker(),
  startBrokerRemovalWorker(),
  startDeviceScanWorker(),
];

workers.forEach((w) => {
  w.on("completed", (job, result) => console.log(`[${job.queueName}] ✓ Job ${job.id} completed`, result));
  w.on("failed", (job, err) => console.error(`[${job?.queueName}] ✗ Job ${job?.id} failed:`, err.message));
});

async function enqueueAllHouseholds(queue: keyof typeof queues) {
  const households = await db.household.findMany({
    where: { subscriptionStatus: "active" },
    select: { id: true },
  });
  for (const h of households) {
    await queues[queue].add(queue, { householdId: h.id }, { jobId: `${queue}-${h.id}-${Date.now()}` });
  }
  console.log(`[scheduler] Enqueued ${queue} for ${households.length} households`);
}

// ─── Cron Schedules ──────────────────────────────────────────────────────────

// Breach scan: every 4 hours
cron.schedule("0 */4 * * *", () => enqueueAllHouseholds("breachScan"));

// Broker removal: daily at 2am
cron.schedule("0 2 * * *", () => enqueueAllHouseholds("brokerRemoval"));

// Device scan: every 2 hours
cron.schedule("0 */2 * * *", () => enqueueAllHouseholds("deviceScan"));

// Escalation check: every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  await queues.escalationCheck.add("escalation-check", {}, { jobId: `escalation-check-${Date.now()}` });
});

// ─── Immediate startup scans ─────────────────────────────────────────────────
setTimeout(async () => {
  console.log("[startup] Running initial scans...");
  await enqueueAllHouseholds("breachScan");
  await enqueueAllHouseholds("deviceScan");
}, 5000);

// ─── Graceful shutdown ───────────────────────────────────────────────────────
async function shutdown() {
  console.log("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  await db.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("✅ Aegis Monitor running. Workers and cron jobs active.");
