import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const devicesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    return ctx.db.device.findMany({
      where: { householdId: member.householdId },
      include: {
        vulnerabilities: { where: { resolvedAt: null }, orderBy: { severity: "desc" } },
        _count: { select: { alerts: { where: { status: { in: ["NEW", "ACKNOWLEDGED"] } } } } },
      },
      orderBy: [{ riskScore: "desc" }, { lastSeenAt: "desc" }],
    });
  }),

  register: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["LAPTOP", "DESKTOP", "PHONE", "TABLET", "ROUTER", "IOT", "UNKNOWN"]).default("UNKNOWN"),
      macAddress: z.string().optional(),
      ipAddress: z.string().optional(),
      os: z.string().optional(),
      osVersion: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.device.create({
        data: { ...input, householdId: member.householdId, lastSeenAt: new Date() },
      });
    }),

  agentHeartbeat: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      ipAddress: z.string().optional(),
      osVersion: z.string().optional(),
      openPorts: z.array(z.number()).optional(),
      installedSoftware: z.array(z.object({ name: z.string(), version: z.string() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.device.update({
        where: { id: input.deviceId, householdId: member.householdId },
        data: {
          agentInstalled: true,
          isOnline: true,
          lastSeenAt: new Date(),
          ...(input.ipAddress && { ipAddress: input.ipAddress }),
          ...(input.osVersion && { osVersion: input.osVersion }),
        },
      });
    }),

  latestNetworkScan: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    return ctx.db.networkScan.findFirst({
      where: { householdId: member.householdId },
      orderBy: { scannedAt: "desc" },
    });
  }),
});
