import { tr } from "zod/v4/locales";
import { postRouter } from "~/server/api/routers/post";
import { transactionRouter } from "~/server/api/routers/transaction";
import { portfolioRouter } from "~/server/api/routers/portfolio";

import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    post: postRouter,
    transaction: transactionRouter,
    portfolio: portfolioRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
