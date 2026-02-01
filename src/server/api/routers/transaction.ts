import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const transactionRouter = createTRPCRouter({
  // Název procedury, kterou budeme volat z frontendu
  getAll: publicProcedure.query(async ({ ctx }) => {
    // Zde probíhá komunikace s databází
    return ctx.db.transaction.findMany({
      orderBy: {
        date: "desc", // Seřadíme transakce podle data (nejnovější nahoře)
      },
    });
  }),
});