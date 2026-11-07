import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusherServer";
import { auth } from "@/lib/auth";
import { db } from "@aegis/db";

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const session = await db.session.findUnique({
      where: { sessionToken: token },
      select: { userId: true, expires: true },
    });
    if (session && session.expires > new Date()) return session.userId;
    return null;
  }
  const raw = await auth();
  return raw?.user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channel = params.get("channel_name");

  if (!socketId || !channel) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Only allow the user to auth for their own household's private channel
  const member = await db.householdMember.findFirst({
    where: { userId },
    select: { householdId: true },
  });
  if (!member) return NextResponse.json({ error: "No household" }, { status: 403 });

  const expectedChannel = `private-household-${member.householdId}`;
  if (channel !== expectedChannel) {
    return NextResponse.json({ error: "Forbidden channel" }, { status: 403 });
  }

  const authData = pusherServer.authorizeChannel(socketId, channel);
  return NextResponse.json(authData);
}
