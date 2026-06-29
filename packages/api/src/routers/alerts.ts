import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const alertsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["NEW", "ACKNOWLEDGED", "IN_REMEDIATION", "RESOLVED", "ESCALATED"]).optional(),
      severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      category: z.enum(["BREACH", "DARK_WEB", "BROKER_EXPOSURE", "CREDIT", "DEVICE_VULN", "NETWORK", "FINANCIAL"]).optional(),
      limit: z.number().min(1).max(100).default(25),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const alerts = await ctx.db.alert.findMany({
        where: {
          householdId: member.householdId,
          ...(input.status && { status: input.status }),
          ...(input.severity && { severity: input.severity }),
          ...(input.category && { category: input.category }),
          ...(input.cursor && { id: { lt: input.cursor } }),
        },
        include: {
          remediationSteps: { orderBy: { order: "asc" } },
          member: { select: { firstName: true, lastName: true } },
          device: { select: { name: true, type: true } },
          escalation: { select: { id: true, status: true, analystName: true } },
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: input.limit + 1,
      });

      const hasMore = alerts.length > input.limit;
      return {
        alerts: hasMore ? alerts.slice(0, -1) : alerts,
        nextCursor: hasMore ? alerts[alerts.length - 2]?.id : undefined,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const alert = await ctx.db.alert.findFirst({
        where: { id: input.id, householdId: member.householdId },
        include: {
          remediationSteps: { orderBy: { order: "asc" } },
          member: { select: { firstName: true, lastName: true } },
          device: true,
          escalation: { include: { messages: { orderBy: { createdAt: "asc" } } } },
          claim: true,
        },
      });
      if (!alert) throw new TRPCError({ code: "NOT_FOUND" });
      return alert;
    }),

  acknowledge: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.alert.update({
        where: { id: input.id, householdId: member.householdId },
        data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
      });
    }),

  resolve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.alert.update({
        where: { id: input.id, householdId: member.householdId },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
    }),

  completeStep: protectedProcedure
    .input(z.object({ stepId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const step = await ctx.db.remediationStep.findFirst({
        where: { id: input.stepId },
        include: { alert: { select: { householdId: true } } },
      });
      if (!step) throw new TRPCError({ code: "NOT_FOUND" });

      const member = await ctx.db.householdMember.findFirst({
        where: { userId: ctx.session.user.id, householdId: step.alert.householdId },
      });
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.remediationStep.update({
        where: { id: input.stepId },
        data: { completedAt: new Date() },
      });
    }),

  requestEscalation: protectedProcedure
    .input(z.object({ alertId: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({
        where: { userId: ctx.session.user.id },
        include: { household: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const alert = await ctx.db.alert.findFirst({
        where: { id: input.alertId, householdId: member.householdId },
      });
      if (!alert) throw new TRPCError({ code: "NOT_FOUND" });

      const escalation = await ctx.db.escalation.upsert({
        where: { alertId: input.alertId },
        create: {
          householdId: member.householdId,
          alertId: input.alertId,
          summary: `${alert.title}: ${alert.description}`,
          status: "PENDING",
        },
        update: { status: "PENDING", updatedAt: new Date() },
      });

      await ctx.db.alert.update({ where: { id: input.alertId }, data: { status: "ESCALATED" } });
      return escalation;
    }),
});
