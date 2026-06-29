import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@aegis/db";

export type Context = {
  db: typeof db;
  session: {
    user: { id: string; email: string; name?: string | null };
  } | null;
};

export const createTRPCContext = async (opts: {
  headers: Headers;
  session: Context["session"];
}): Promise<Context> => {
  return {
    db,
    session: opts.session,
  };
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
