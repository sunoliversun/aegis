import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? "0".repeat(64), "hex");

function encrypt(value: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encData = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  return Buffer.concat([decipher.update(encData), decipher.final()]).toString("utf8");
}

function hashValue(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

function maskValue(type: string, decrypted: string): string {
  if (type === "SSN") return `***-**-${decrypted.slice(-4)}`;
  if (type === "CREDIT_CARD") return `**** **** **** ${decrypted.slice(-4)}`;
  if (type === "EMAIL") {
    const [local, domain] = decrypted.split("@");
    return `${local[0]}***@${domain}`;
  }
  if (type === "BANK_ACCOUNT") return `****${decrypted.slice(-4)}`;
  return decrypted;
}

export const assetsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    const assets = await ctx.db.monitoredAsset.findMany({
      where: { member: { householdId: member.householdId } },
      include: {
        breachRecords: { orderBy: { detectedAt: "desc" }, take: 3 },
        member: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return assets.map((a) => ({
      ...a,
      maskedValue: maskValue(a.type, decrypt(a.valueEncrypted)),
      valueEncrypted: undefined,
    }));
  }),

  add: protectedProcedure
    .input(z.object({
      type: z.enum(["EMAIL", "SSN", "PHONE", "CREDIT_CARD", "BANK_ACCOUNT", "PASSPORT", "ADDRESS", "USERNAME", "DOMAIN"]),
      value: z.string().min(1),
      label: z.string().optional(),
      memberId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentMember = await ctx.db.householdMember.findFirst({
        where: { userId: ctx.session.user.id },
        include: { household: true },
      });
      if (!currentMember) throw new TRPCError({ code: "NOT_FOUND" });

      const targetMemberId = input.memberId ?? currentMember.id;

      if (input.memberId) {
        const targetMember = await ctx.db.householdMember.findFirst({
          where: { id: input.memberId, householdId: currentMember.householdId },
        });
        if (!targetMember) throw new TRPCError({ code: "FORBIDDEN" });
      }

      const valueHash = hashValue(input.value);
      const valueEncrypted = encrypt(input.value);

      return ctx.db.monitoredAsset.upsert({
        where: { memberId_valueHash: { memberId: targetMemberId, valueHash } },
        create: { memberId: targetMemberId, type: input.type, valueEncrypted, valueHash, label: input.label },
        update: { type: input.type, label: input.label },
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const asset = await ctx.db.monitoredAsset.findFirst({
        where: { id: input.id, member: { householdId: member.householdId } },
      });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.monitoredAsset.delete({ where: { id: input.id } });
    }),

  breachHistory: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.householdMember.findFirst({ where: { userId: ctx.session.user.id } });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const asset = await ctx.db.monitoredAsset.findFirst({
        where: { id: input.assetId, member: { householdId: member.householdId } },
        include: { breachRecords: { orderBy: { detectedAt: "desc" } } },
      });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });
      return asset.breachRecords;
    }),
});
