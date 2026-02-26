import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const portfolioRouter = createTRPCRouter({
  // 1. Načíst všechna portfolia přihlášeného uživatele
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.portfolio.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      // Chceme vědět i kolik je tam transakcí (pro info na kartě)
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });
  }),

  // Načíst detail jednoho portfolia
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id, // Opět kontrola bezpečnosti
        },
      });

      if (!portfolio) {
        throw new Error("Portfolio nenalezeno");
      }

      return portfolio;
    }),

  // 2. Vytvořit nové portfolio
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1, "Název je povinný") }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.portfolio.create({
        data: {
          name: input.name,
          userId: ctx.session.user.id,
        },
      });
    }),
    
  // 3. Smazat portfolio (i s transakcemi - díky Cascade v Prismě)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.portfolio.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
    }),

    // 4. Upravit portfolio (NOVÉ)
  update: protectedProcedure
    .input(z.object({ 
      id: z.string(), 
      name: z.string().min(1, "Název je povinný") 
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.portfolio.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id, // Bezpečnostní pojistka
        },
        data: {
          name: input.name,
        },
      });
    }),
});