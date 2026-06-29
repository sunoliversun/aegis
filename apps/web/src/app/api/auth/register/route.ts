import { NextResponse } from "next/server";
import { db } from "@aegis/db";
import { createHash } from "crypto";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  plan: z.enum(["LITE", "STANDARD", "HOUSEHOLD", "PREMIUM"]).default("STANDARD"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, plan } = schema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = createHash("sha256").update(password).digest("hex");

    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.join(" ");

    await db.user.create({
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
                name: `${firstName}'s Household`,
                plan,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Registration error:", e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
