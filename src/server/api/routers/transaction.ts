import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getYahooSymbol } from "~/lib/exchangeMap";
import { calculateBalance } from "~/lib/transactionUtils";

export const transactionRouter = createTRPCRouter({
  // 1. READ (Načítáme transakce pro konkrétní portfolio)
  getAll: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      // BEZPEČNOST: Zkontrolujeme, jestli portfolio existuje a patří přihlášenému uživateli
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

  // 2. CREATE
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
      // BEZPEČNOST: Kontrola majitele portfolia před přidáním
      const portfolio = await ctx.db.portfolio.findFirst({
        where: { id: input.portfolioId, userId: ctx.session.user.id },
      });

      if (!portfolio) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Pokud jde o PRODEJ, zkontrolujeme, jestli má uživatel dostatek aktiva
      if (input.type === "SELL") {
        // Najdeme všechny dosavadní transakce pro tento konkrétní symbol v tomto portfoliu
        const existingTransactions = await ctx.db.transaction.findMany({
          where: {
            portfolioId: input.portfolioId,
            assetSymbol: input.assetSymbol.toUpperCase(),
          },
        });

        const currentBalance = calculateBalance(existingTransactions);

        // Pokud chce prodat víc, než má, vyhodíme chybu!
        if (input.quantity > currentBalance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Nedostatek aktiva. Aktuálně vlastníte pouze ${currentBalance} ks ${input.assetSymbol.toUpperCase()}.`,
          });
        }
      }

      return ctx.db.transaction.create({
        data: {
          portfolioId: input.portfolioId, // Napojení na správné portfolio
          assetSymbol: input.assetSymbol.toUpperCase(),
          type: input.type,
          quantity: input.quantity,
          pricePerUnit: input.pricePerUnit,
          currency: input.currency,
          date: input.date,
        },
      });
    }),

  // 2b. CREATE MNOHO (Hromadné přidávání transakcí, např. z CSV importu)
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

  // 3. DELETE
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // BEZPEČNOST: Najdeme transakci i s jejím portfoliem, abychom ověřili majitele
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

  // 4. UPDATE
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
      // BEZPEČNOST: Stejná kontrola jako u mazání
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

      // 2. KONTROLA ZŮSTATKU (Jen pokud měníme transakci na PRODEJ nebo upravujeme existující prodej)
      if (input.type === "SELL") {
        // Načteme všechny ostatní transakce pro daný symbol (KROMĚ té, kterou právě upravujeme)
        const existingTransactions = await ctx.db.transaction.findMany({
          where: {
            portfolioId: transaction.portfolioId,
            assetSymbol: input.assetSymbol.toUpperCase(),
            id: { not: input.id }, // Vyřadíme aktuální transakci
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

  // 5. EXPORT — Vrátit všechny transakce všech portfolií uživatele
  exportAll: protectedProcedure.query(async ({ ctx }) => {
    // Načteme všechna portfolia uživatele včetně transakcí
    const portfolios = await ctx.db.portfolio.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        transactions: true,
      },
    });

    // Transformujeme všechny transakce do výsledného formátu
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
          date: tx.date.toISOString().split("T")[0] ?? "", // ISO string (YYYY-MM-DD)
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
