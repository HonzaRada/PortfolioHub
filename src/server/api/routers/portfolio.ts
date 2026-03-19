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

  // NOVÉ: Stažení živých cen z Finnhub API
  getPrices: protectedProcedure
    .input(z.object({ symbols: z.array(z.string()) }))
    .query(async ({ input }) => {
      const prices: Record<string, number> = {};
      const apiKey = process.env.FINNHUB_API_KEY; // Načteme klíč z .env

      // Ochrana: pokud zapomeneme přidat klíč do .env
      if (!apiKey) {
        console.error("Chybí FINNHUB_API_KEY v .env souboru!");
        return prices; 
      }

      for (const symbol of input.symbols) {
        try {
          // Zeptáme se Finnhubu na aktuální cenu (Quote endpoint)
          const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
          );

          if (!response.ok) continue;

          const data = await response.json();

          // Finnhub vrací aktuální cenu pod písmenem 'c' (current price)
          // Pokud symbol neexistuje, 'c' je obvykle 0
          if (data && data.c > 0) {
            prices[symbol] = data.c;
          }
        } catch (error) {
          console.log(`Cena nenalezena pro symbol: ${symbol}`);
        }
      }
      return prices;
    }),

    // NOVÉ: Stažení aktuálních kurzů měn
    getExchangeRates: protectedProcedure.query(async () => {
      try {
        // Stáhneme kurzy vůči USD (1 USD = X CZK, X EUR atd.)
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        return data.rates as Record<string, number>;
      } catch (error) {
        console.error("Chyba při stahování kurzů");
        return { USD: 1, CZK: 23.5, EUR: 0.92, GBP: 0.79 }; // Nouzová záloha
      }
    }),
});