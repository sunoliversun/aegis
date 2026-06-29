export { createTRPCContext, createTRPCRouter, publicProcedure, protectedProcedure } from "./trpc";
export type { Context } from "./trpc";

import { createTRPCRouter } from "./trpc";
import { householdRouter } from "./routers/household";
import { alertsRouter } from "./routers/alerts";
import { assetsRouter } from "./routers/assets";
import { devicesRouter } from "./routers/devices";
import { brokersRouter } from "./routers/brokers";
import { insuranceRouter } from "./routers/insurance";
import { escalationsRouter } from "./routers/escalations";

export const appRouter = createTRPCRouter({
  household: householdRouter,
  alerts: alertsRouter,
  assets: assetsRouter,
  devices: devicesRouter,
  brokers: brokersRouter,
  insurance: insuranceRouter,
  escalations: escalationsRouter,
});

export type AppRouter = typeof appRouter;
