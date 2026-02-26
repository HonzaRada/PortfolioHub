import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const transactionRouter = createTRPCRouter({
  // 1. READ (Načítáme transakce pro konkrétní portfolio)
  getAll: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      // BEZPEČNOST: Zkontrolujeme, jestli portfolio existuje a patří přihlášenému uživateli
      const portfolio = await ctx.db.portfolio.findUnique({
        where: { id: input.portfolioId, userId: ctx.session.user.id },
      });

      if (!portfolio) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED", 
          message: "Portfolio nenalezeno nebo k němu nemáte přístup." 
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
        portfolioId: z.string(), // <--- TADY JE TO TVOJE CHYBĚJÍCÍ ID!
        assetSymbol: z.string().min(1),
        type: z.enum(["BUY", "SELL"]),
        quantity: z.number().positive(),
        pricePerUnit: z.number().positive(),
        date: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // BEZPEČNOST: Kontrola majitele portfolia před přidáním
      const portfolio = await ctx.db.portfolio.findUnique({
        where: { id: input.portfolioId, userId: ctx.session.user.id },
      });
      
      if (!portfolio) throw new TRPCError({ code: "UNAUTHORIZED" });

      return ctx.db.transaction.create({
        data: {
          portfolioId: input.portfolioId, // Napojení na správné portfolio
          assetSymbol: input.assetSymbol.toUpperCase(),
          type: input.type,
          quantity: input.quantity,
          pricePerUnit: input.pricePerUnit,
          date: input.date,
        },
      });
    }),

  // 3. DELETE
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // BEZPEČNOST: Najdeme transakci i s jejím portfoliem, abychom ověřili majitele
      const transaction = await ctx.db.transaction.findUnique({
        where: { id: input.id },
        include: { portfolio: true },
      });

      if (!transaction || transaction.portfolio.userId !== ctx.session.user.id) {
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // BEZPEČNOST: Stejná kontrola jako u mazání
      const transaction = await ctx.db.transaction.findUnique({
        where: { id: input.id },
        include: { portfolio: true },
      });

      if (!transaction || transaction.portfolio.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
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
});