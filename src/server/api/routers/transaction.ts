import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getYahooSymbol } from "~/lib/exchangeMap";
import { calculateBalance } from "~/lib/transactionUtils";

export const transactionRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findFirst({
        where: { id: input.portfolioId, userId: ctx.session.user.id },
      });

      if (!portfolio) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Portfolio nenalezeno nebo k němu nemáte přístup.",
        });
      }

      return ctx.db.transaction.findMany({
        where: { portfolioId: input.portfolioId },
        orderBy: { date: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        assetSymbol: z.string().min(1),
        type: z.enum(["BUY", "SELL"]),
        quantity: z.number().positive(),
        pricePerUnit: z.number().positive(),
        currency: z.string().optional(),
        date: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findFirst({
        where: { id: input.portfolioId, userId: ctx.session.user.id },
      });

      if (!portfolio) throw new TRPCError({ code: "UNAUTHORIZED" });

      if (input.type === "SELL") {
        const existingTransactions = await ctx.db.transaction.findMany({
          where: {
            portfolioId: input.portfolioId,
            assetSymbol: input.assetSymbol.toUpperCase(),
          },
        });

        const currentBalance = calculateBalance(existingTransactions);

        if (input.quantity > currentBalance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Nedostatek aktiva. Aktuálně vlastníte pouze ${currentBalance} ks ${input.assetSymbol.toUpperCase()}.`,
          });
        }
      }

      return ctx.db.transaction.create({
        data: {
          portfolioId: input.portfolioId,
          assetSymbol: input.assetSymbol.toUpperCase(),
          type: input.type,
          quantity: input.quantity,
          pricePerUnit: input.pricePerUnit,
          currency: input.currency,
          date: input.date,
        },
      });
    }),

  createMany: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        transactions: z.array(
          z.object({
            assetSymbol: z.string().min(1),
            listingExchange: z.string(),
            type: z.enum(["BUY", "SELL"]),
            quantity: z.number().positive(),
            pricePerUnit: z.number().positive(),
            currency: z.string().optional(),
            date: z.date(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findFirst({
        where: { id: input.portfolioId, userId: ctx.session.user.id },
      });
      if (!portfolio) throw new TRPCError({ code: "UNAUTHORIZED" });

      const dataToInsert = input.transactions.map((tx) => {
        // Symbol se převede do Yahoo Finance formátu pomocí kódu burzy
        const yahooSymbol = getYahooSymbol(tx.assetSymbol, tx.listingExchange);

        return {
          portfolioId: input.portfolioId,
          assetSymbol: yahooSymbol.toUpperCase(),
          type: tx.type,
          quantity: tx.quantity,
          pricePerUnit: tx.pricePerUnit,
          currency: tx.currency,
          date: tx.date,
        };
      });

      const result = await ctx.db.transaction.createMany({
        data: dataToInsert,
      });

      // Validace zůstatků po importu
      const allTransactions = await ctx.db.transaction.findMany({
        where: { portfolioId: input.portfolioId },
      });

      const balances = new Map<string, number>();
      const symbols = [...new Set(allTransactions.map((tx) => tx.assetSymbol))];
      symbols.forEach((symbol) => {
        const symbolTransactions = allTransactions.filter(
          (tx) => tx.assetSymbol === symbol,
        );
        balances.set(symbol, calculateBalance(symbolTransactions));
      });

      // Záporné zůstatky neblokujeme — import historických dat může obsahovat prodeje bez předchozích nákupů
      const warnings: string[] = [];
      balances.forEach((balance, symbol) => {
        if (balance < -0.000001) {
          warnings.push(
            `Symbol ${symbol} má záporný zůstatek (${balance.toFixed(4)} ks) — zkontroluj transakce.`,
          );
        }
      });

      return { success: true, count: result.count, warnings };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.db.transaction.findFirst({
        where: { id: input.id },
        include: { portfolio: true },
      });

      if (
        !transaction ||
        transaction.portfolio.userId !== ctx.session.user.id
      ) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.db.transaction.delete({
        where: { id: input.id },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        assetSymbol: z.string().min(1),
        type: z.enum(["BUY", "SELL"]),
        quantity: z.number().positive(),
        pricePerUnit: z.number().positive(),
        date: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.db.transaction.findFirst({
        where: { id: input.id },
        include: { portfolio: true },
      });

      if (
        !transaction ||
        transaction.portfolio.userId !== ctx.session.user.id
      ) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (input.type === "SELL") {
        const existingTransactions = await ctx.db.transaction.findMany({
          where: {
            portfolioId: transaction.portfolioId,
            assetSymbol: input.assetSymbol.toUpperCase(),
            // Při úpravě na SELL vyřadíme upravovanou transakci z výpočtu zůstatku
            id: { not: input.id },
          },
        });

        const currentBalance = calculateBalance(existingTransactions);

        // Pokud nová hodnota prodeje přesahuje dostupný zůstatek, vyhodíme chybu
        if (input.quantity > currentBalance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Nedostatek aktiva. Po této úpravě by zůstatek klesl pod nulu (máte k dispozici: ${currentBalance} ks ${input.assetSymbol.toUpperCase()}).`,
          });
        }
      }

      return ctx.db.transaction.update({
        where: { id: input.id },
        data: {
          assetSymbol: input.assetSymbol.toUpperCase(),
          type: input.type,
          quantity: input.quantity,
          pricePerUnit: input.pricePerUnit,
          date: input.date,
        },
      });
    }),

  exportAll: protectedProcedure.query(async ({ ctx }) => {
    const portfolios = await ctx.db.portfolio.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        transactions: true,
      },
    });

    const transactions: Array<{
      portfolioName: string;
      date: string;
      type: "BUY" | "SELL";
      assetSymbol: string;
      quantity: number;
      pricePerUnit: number;
      currency: string | null;
    }> = [];

    portfolios.forEach((portfolio) => {
      portfolio.transactions.forEach((tx) => {
        transactions.push({
          portfolioName: portfolio.name,
          date: tx.date.toISOString().split("T")[0] ?? "", // Formát YYYY-MM-DD
          type: tx.type,
          assetSymbol: tx.assetSymbol,
          quantity: tx.quantity.toNumber(),
          pricePerUnit: tx.pricePerUnit.toNumber(),
          currency: tx.currency,
        });
      });
    });

    // Seřadíme podle data vzestupně
    transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return transactions;
  }),
});
