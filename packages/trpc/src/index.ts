import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { db } from '@fiskai/db';

// Context type
export interface Context {
  db: typeof db;
  userId?: string;
  companyId?: string;
}

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Auth middleware (to be implemented with NextAuth)
const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new Error('UNAUTHORIZED');
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Import routers
import { companyRouter } from './routers/company';
import { invoiceRouter } from './routers/invoice';

// App router
export const appRouter = router({
  company: companyRouter,
  invoice: invoiceRouter,
});

export type AppRouter = typeof appRouter;
