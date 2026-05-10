import { transactionRouter } from "~/server/api/routers/transaction";
import { portfolioRouter } from "~/server/api/routers/portfolio";
import { pricesRouter } from "~/server/api/routers/prices";

import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  transaction: transactionRouter,
  portfolio: portfolioRouter,
  prices: pricesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
