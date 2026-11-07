import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@aegis/api";
import { auth } from "@/lib/auth";
import { db } from "@aegis/db";

async function resolveSession(req: Request) {
  // Mobile app sends Bearer token; web uses NextAuth cookie session
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const dbSession = await db.session.findUnique({
      where: { sessionToken: token },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (dbSession && dbSession.expires > new Date()) {
      return { user: { id: dbSession.user.id, email: dbSession.user.email!, name: dbSession.user.name } };
    }
    return null;
  }
  const raw = await auth();
  return raw?.user?.id && raw?.user?.email
    ? { user: { id: raw.user.id, email: raw.user.email, name: raw.user.name ?? null } }
    : null;
}

const handler = async (req: Request) => {
  const session = await resolveSession(req);

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers, session }),
    onError: ({ error }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error("tRPC error:", error);
      }
    },
  });
};

export { handler as GET, handler as POST };
