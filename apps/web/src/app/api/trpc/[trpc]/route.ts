import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, type Context } from '@fiskai/trpc';
import { db } from '@fiskai/db';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: (): Context => ({
      db,
      // userId and companyId will be added after auth setup
    }),
  });

export { handler as GET, handler as POST };
