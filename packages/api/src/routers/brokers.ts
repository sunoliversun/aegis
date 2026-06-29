import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const brokersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["PENDING", "SUBMITTED", "CONFIRMED", "REAPPEARED", "FAILED"]).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.brokerRemoval.findMany({
        where: {
          member: { householdId: member.householdId },
          ...(input.status && { status: input.status }),
        },
        include: { member: { select: { firstName: true, lastName: true } } },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: input.limit,
      });
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    const [total, confirmed, pending, reappeared, failed] = await Promise.all([
      ctx.db.brokerRemoval.count({ where: { member: { householdId: member.householdId } } }),
      ctx.db.brokerRemoval.count({ where: { member: { householdId: member.householdId }, status: "CONFIRMED" } }),
      ctx.db.brokerRemoval.count({ where: { member: { householdId: member.householdId }, status: { in: ["PENDING", "SUBMITTED"] } } }),
      ctx.db.brokerRemoval.count({ where: { member: { householdId: member.householdId }, status: "REAPPEARED" } }),
      ctx.db.brokerRemoval.count({ where: { member: { householdId: member.householdId }, status: "FAILED" } }),
    ]);

    return { total, confirmed, pending, reappeared, failed, protectedPct: total > 0 ? Math.round((confirmed / total) * 100) : 0 };
  }),
});
