import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const insuranceRouter = createTRPCRouter({
  policy: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({
      where: { userId: ctx.session.user.id },
      include: { household: true },
    });
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    const coverageLimits = {
      LITE: { identityTheft: 0, financialFraud: 10_000, ransomware: 0 },
      STANDARD: { identityTheft: 250_000, financialFraud: 50_000, ransomware: 25_000 },
      HOUSEHOLD: { identityTheft: 1_000_000, financialFraud: 100_000, ransomware: 50_000 },
      PREMIUM: { identityTheft: 1_000_000, financialFraud: 250_000, ransomware: 100_000 },
    };

    return {
      policyId: member.household.insurancePolicyId,
      carrier: member.household.insuranceCarrier ?? "HSB / Munich Re",
      plan: member.household.plan,
      coverage: coverageLimits[member.household.plan],
      active: member.household.subscriptionStatus === "active",
    };
  }),

  claims: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    return ctx.db.insuranceClaim.findMany({
      where: { householdId: member.householdId },
      include: { alert: { select: { title: true, category: true, severity: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  fileClaim: protectedProcedure
    .input(z.object({
      type: z.enum(["IDENTITY_THEFT", "FINANCIAL_FRAUD", "RANSOMWARE", "HARASSMENT", "EXTORTION"]),
      description: z.string().min(10),
      amountClaimed: z.number().positive(),
      alertId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({
        where: { userId: ctx.session.user.id },
        include: { household: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (member.household.subscriptionStatus !== "active") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Active subscription required to file claims" });
      }

      return ctx.db.insuranceClaim.create({
        data: {
          householdId: member.householdId,
          alertId: input.alertId,
          type: input.type,
          description: input.description,
          amountClaimed: input.amountClaimed,
          status: "DRAFT",
        },
      });
    }),

  submitClaim: protectedProcedure
    .input(z.object({ claimId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const claim = await ctx.db.insuranceClaim.findFirst({
        where: { id: input.claimId, householdId: member.householdId, status: "DRAFT" },
      });
      if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

      // In production: call carrier API here and get carrierClaimId back
      return ctx.db.insuranceClaim.update({
        where: { id: input.claimId },
        data: { status: "SUBMITTED", carrierClaimId: `CARR-${Date.now()}` },
      });
    }),
});
