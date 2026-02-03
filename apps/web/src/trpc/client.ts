import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@fiskai/trpc';

export const trpc = createTRPCReact<AppRouter>();
