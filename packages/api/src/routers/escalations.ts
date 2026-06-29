import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const escalationsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    return ctx.db.escalation.findMany({
      where: { householdId: member.householdId },
      include: {
        alert: { select: { title: true, severity: true, category: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 10 },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const escalation = await ctx.db.escalation.findFirst({
        where: { id: input.id, householdId: member.householdId },
        include: {
          alert: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!escalation) throw new TRPCError({ code: "NOT_FOUND" });
      return escalation;
    }),

  sendMessage: protectedProcedure
    .input(z.object({ escalationId: z.string(), message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({
        where: { userId: ctx.session.user.id },
        include: { household: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const escalation = await ctx.db.escalation.findFirst({
        where: { id: input.escalationId, householdId: member.householdId },
      });
      if (!escalation) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.escalationMessage.create({
        data: {
          escalationId: input.escalationId,
          senderType: "member",
          senderName: `${member.firstName} ${member.lastName}`,
          message: input.message,
        },
      });
    }),
});
