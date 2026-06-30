import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@aegis/db";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = schema.parse(body);

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const hash = crypto.createHash("sha256").update(password).digest("hex");
    if (hash !== user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create a session token (simple random token stored in DB)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.session.create({
      data: {
        sessionToken: token,
        userId: user.id,
        expires,
      },
    });

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    console.error("[mobile-login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
