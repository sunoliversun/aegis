import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const householdRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({
      where: { userId: ctx.session.user.id },
      include: {
        household: {
          include: {
            members: { include: { user: { select: { id: true, email: true, name: true } } } },
            _count: { select: { alerts: { where: { status: { in: ["NEW", "ACKNOWLEDGED"] } } }, devices: true } },
          },
        },
      },
    });
    if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "No household found" });
    return member.household;
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), plan: z.enum(["LITE", "STANDARD", "HOUSEHOLD", "PREMIUM"]).default("STANDARD") }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Already in a household" });

      return ctx.db.household.create({
        data: {
          name: input.name,
          plan: input.plan,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: "OWNER",
              firstName: ctx.session.user.name?.split(" ")[0] ?? "",
              lastName: ctx.session.user.name?.split(" ").slice(1).join(" ") ?? "",
            },
          },
        },
        include: { members: true },
      });
    }),

  addMember: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      role: z.enum(["ADULT", "CHILD"]).default("ADULT"),
    }))
    .mutation(async ({ ctx, input }) => {
      const ownerMember = await ctx.db.householdMember.findFirst({
        where: { userId: ctx.session.user.id, role: "OWNER" },
        include: { household: true },
      });
      if (!ownerMember) throw new TRPCError({ code: "FORBIDDEN", message: "Only owners can add members" });

      let user = await ctx.db.user.findUnique({ where: { email: input.email } });
      if (!user) {
        user = await ctx.db.user.create({ data: { email: input.email, name: `${input.firstName} ${input.lastName}` } });
      }

      return ctx.db.householdMember.create({
        data: {
          householdId: ownerMember.householdId,
          userId: user.id,
          role: input.role,
          firstName: input.firstName,
          lastName: input.lastName,
        },
        include: { user: { select: { id: true, email: true } } },
      });
    }),

  score: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({
      where: { userId: ctx.session.user.id },
      include: { household: true },
    });
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    const [criticalAlerts, highAlerts, assets, breachedAssets, brokerExposures, devices, vulnerableDevices] =
      await Promise.all([
        ctx.db.alert.count({ where: { householdId: member.householdId, severity: "CRITICAL", status: { in: ["NEW", "ACKNOWLEDGED"] } } }),
        ctx.db.alert.count({ where: { householdId: member.householdId, severity: "HIGH", status: { in: ["NEW", "ACKNOWLEDGED"] } } }),
        ctx.db.monitoredAsset.count({ where: { member: { householdId: member.householdId } } }),
        ctx.db.monitoredAsset.count({ where: { member: { householdId: member.householdId }, breachRecords: { some: {} } } }),
        ctx.db.brokerRemoval.count({ where: { member: { householdId: member.householdId }, status: { in: ["PENDING", "REAPPEARED"] } } }),
        ctx.db.device.count({ where: { householdId: member.householdId } }),
        ctx.db.device.count({ where: { householdId: member.householdId, riskScore: { gte: 60 } } }),
      ]);

    // Weighted score calculation
    const alertPenalty = Math.min(35, criticalAlerts * 15 + highAlerts * 7);
    const breachRatio = assets > 0 ? breachedAssets / assets : 0;
    const brokerPenalty = Math.min(15, brokerExposures * 3);
    const deviceRatio = devices > 0 ? vulnerableDevices / devices : 0;

    const score = Math.max(
      0,
      Math.round(
        100 -
          alertPenalty -
          breachRatio * 20 -
          brokerPenalty -
          deviceRatio * 15
      )
    );

    await ctx.db.household.update({ where: { id: member.householdId }, data: { householdScore: score } });

    return {
      score,
      band: score >= 85 ? "protected" : score >= 65 ? "some_risks" : score >= 40 ? "needs_attention" : "at_risk",
      breakdown: {
        alerts: { critical: criticalAlerts, high: highAlerts, penalty: alertPenalty },
        breaches: { total: breachedAssets, of: assets, penalty: Math.round(breachRatio * 20) },
        brokers: { exposed: brokerExposures, penalty: brokerPenalty },
        devices: { vulnerable: vulnerableDevices, total: devices, penalty: Math.round(deviceRatio * 15) },
      },
    };
  }),
});
