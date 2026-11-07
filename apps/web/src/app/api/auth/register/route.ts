import { NextResponse } from "next/server";
import { db } from "@aegis/db";
import { createHash } from "crypto";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  householdName: z.string().min(1).optional(),
  plan: z.enum(["LITE", "STANDARD", "HOUSEHOLD", "PREMIUM"]).default("LITE"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, householdName, plan } = schema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = createHash("sha256").update(password).digest("hex");
    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.join(" ");

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        householdMemberships: {
          create: {
            role: "OWNER",
            firstName: firstName ?? name,
            lastName: lastName ?? "",
            household: {
              create: {
                name: householdName ?? `${firstName}'s Household`,
                plan,
              },
            },
          },
        },
      },
      include: { householdMemberships: { select: { id: true } } },
    });

    // Set the scan email address now that we have the member id
    const memberId = user.householdMemberships[0]?.id;
    if (memberId) {
      await db.householdMember.update({
        where: { id: memberId },
        data: { scanEmail: `${memberId}@scan.aegis.app` },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: e.errors }, { status: 400 });
    }
    console.error("Registration error:", e);
    const message = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
