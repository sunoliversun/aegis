import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@aegis/api";
import { auth } from "@/lib/auth";

const handler = async (req: Request) => {
  const raw = await auth();
  const session =
    raw?.user?.id && raw?.user?.email
      ? { user: { id: raw.user.id, email: raw.user.email, name: raw.user.name ?? null } }
      : null;

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
