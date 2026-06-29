import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const QUEUES = {
  BREACH_SCAN: "breach-scan",
  DARK_WEB_SCAN: "dark-web-scan",
  BROKER_REMOVAL: "broker-removal",
  DEVICE_SCAN: "device-scan",
  ESCALATION_CHECK: "escalation-check",
  NOTIFICATION: "notification",
} as const;

export function createQueue(name: string) {
  return new Queue(name, { connection, defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } } });
}

export const queues = {
  breachScan: createQueue(QUEUES.BREACH_SCAN),
  darkWebScan: createQueue(QUEUES.DARK_WEB_SCAN),
  brokerRemoval: createQueue(QUEUES.BROKER_REMOVAL),
  deviceScan: createQueue(QUEUES.DEVICE_SCAN),
  escalationCheck: createQueue(QUEUES.ESCALATION_CHECK),
  notification: createQueue(QUEUES.NOTIFICATION),
};
