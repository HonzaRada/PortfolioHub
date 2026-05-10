import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const portfolioRouter = createTRPCRouter({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.portfolio.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!portfolio) {
        throw new Error("Portfolio nenalezeno");
      }

      return portfolio;
    }),

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

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Název je povinný"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.portfolio.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: {
          name: input.name,
        },
      });
    }),

  getHoldingsWithStats: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findFirst({
        where: {
          id: input.portfolioId,
          userId: ctx.session.user.id,
        },
      });

      if (!portfolio) {
        throw new Error("Portfolio nenalezeno");
      }

      const transactions = await ctx.db.transaction.findMany({
        where: {
          portfolioId: input.portfolioId,
        },
      });

      const holdingsMap = new Map<
        string,
        {
          symbol: string;
          quantity: number;
          totalBuyQuantity: number;
          totalBuyCost: number;
          totalSellCost: number;
          currency: string;
        }
      >();

      for (const transaction of transactions) {
        const existing = holdingsMap.get(transaction.assetSymbol) || {
          symbol: transaction.assetSymbol,
          quantity: 0,
          totalBuyQuantity: 0,
          totalBuyCost: 0,
          totalSellCost: 0,
          currency: transaction.currency || "USD",
        };

        if (transaction.type === "BUY") {
          existing.quantity += transaction.quantity.toNumber();
          existing.totalBuyQuantity += transaction.quantity.toNumber();
          existing.totalBuyCost +=
            transaction.quantity.toNumber() *
            transaction.pricePerUnit.toNumber();
        } else if (transaction.type === "SELL") {
          existing.quantity -= transaction.quantity.toNumber();
          existing.totalSellCost +=
            transaction.quantity.toNumber() *
            transaction.pricePerUnit.toNumber();
        }

        holdingsMap.set(transaction.assetSymbol, existing);
      }

      const holdings = Array.from(holdingsMap.values())
        .filter((h) => h.quantity > 0.000001)
        .map((h) => ({
          symbol: h.symbol,
          quantity: h.quantity,
          avgBuyPrice:
            h.totalBuyQuantity > 0 ? h.totalBuyCost / h.totalBuyQuantity : 0,
          totalInvested: h.totalBuyCost - h.totalSellCost,
          currency: h.currency,
        }));

      return holdings;
    }),

  getPortfolioHistory: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findFirst({
        where: {
          id: input.portfolioId,
          userId: ctx.session.user.id,
        },
      });

      if (!portfolio) {
        throw new Error("Portfolio nenalezeno");
      }

      const transactions = await ctx.db.transaction.findMany({
        where: {
          portfolioId: input.portfolioId,
        },
        orderBy: {
          date: "asc",
        },
      });

      // Pokud nejsou žádné transakce, vrať prázdné pole
      if (transactions.length === 0) {
        return [];
      }

      // Zjisti datum první transakce
      const firstDate = new Date(transactions[0]!.date);
      firstDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Vytvoř pole datumů od první transakce do dneška
      const dateRange: Date[] = [];
      const currentDate = new Date(firstDate);
      while (currentDate <= today) {
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Získej unikátní seznam všech symbolů
      const allSymbols = Array.from(
        new Set(transactions.map((t) => t.assetSymbol)),
      );

      // Stáhni historická denní data z Yahoo Finance
      const priceHistory: Record<string, Record<string, number>> = {};

      for (const symbol of allSymbols) {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2y`,
          );

          if (!response.ok) continue;

          const data = await response.json();

          if (data.chart?.result?.[0]) {
            const yahooMeta = data.chart.result[0].meta;
            const isGBp = yahooMeta?.currency === "GBp";
            const timestamps = data.chart.result[0].timestamp;
            const closePrices =
              data.chart.result[0].indicators?.quote?.[0]?.close;

            if (timestamps && closePrices) {
              priceHistory[symbol] = {};
              timestamps.forEach((timestamp: number, index: number) => {
                const date = new Date(timestamp * 1000);
                const dateStr = date.toISOString().split("T")[0] ?? "";
                const closePrice = closePrices[index];
                if (closePrice) {
                  priceHistory[symbol]![dateStr] = isGBp
                    ? closePrice / 100
                    : closePrice;
                }
              });
            }
          }
        } catch (error) {
          console.log(`Historická data nenalezena pro symbol: ${symbol}`);
        }
      }

      // Pro každý datum vypočítej holdings a hodnotu portfolia
      const history: { date: string; value: number }[] = [];

      for (const date of dateRange) {
        // Filtruj pouze pracovní dny (pondělí až pátek)
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dateStr = date.toISOString().split("T")[0];

        // Zjisti holdings v tento den (transakce <= datu)
        const holdingsMap = new Map<
          string,
          {
            quantity: number;
          }
        >();

        for (const transaction of transactions) {
          if (transaction.date <= date) {
            const existing = holdingsMap.get(transaction.assetSymbol) || {
              quantity: 0,
            };

            if (transaction.type === "BUY") {
              existing.quantity += transaction.quantity.toNumber();
            } else if (transaction.type === "SELL") {
              existing.quantity -= transaction.quantity.toNumber();
            }

            holdingsMap.set(transaction.assetSymbol, existing);
          }
        }

        // Vypočítej hodnotu portfolia v tento den
        let dayValue = 0;
        let hasAnyPrice = false;

        for (const [symbol, holding] of holdingsMap) {
          if (holding.quantity <= 0.000001) continue;

          // Najdi nejbližší dostupnou close cenu
          let closePrice: number | null = null;

          // Nejprve zkus přesnou shodu
          if (priceHistory[symbol]?.[dateStr ?? ""]) {
            closePrice = priceHistory[symbol][dateStr ?? ""] ?? null;
          } else {
            // Jinak hledej nejbližší předchozí datum
            let searchDate = new Date(date);
            for (let i = 0; i < 30; i++) {
              // Hledej zpětně až 30 dní
              searchDate.setDate(searchDate.getDate() - 1);
              const searchDateStr =
                searchDate.toISOString().split("T")[0] ?? "";
              if (priceHistory[symbol]?.[searchDateStr]) {
                closePrice = priceHistory[symbol][searchDateStr];
                break;
              }
            }
          }

          if (closePrice !== null) {
            dayValue += holding.quantity * closePrice;
            hasAnyPrice = true;
          }
        }

        // Vynechej dny kde nemáme ceny pro žádný symbol
        if (hasAnyPrice) {
          history.push({
            date: dateStr ?? "",
            value: dayValue,
          });
        }
      }

      return history;
    }),

  getAllPortfoliosStats: protectedProcedure.query(async ({ ctx }) => {
    // Načti aktuální kurzy měn
    const ratesRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const ratesData = await ratesRes.json();
    const rates = ratesData.rates as Record<string, number>;

    const portfolios = await ctx.db.portfolio.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        transactions: true,
      },
    });

    const stats = portfolios.map((portfolio) => {
      let totalInvested = 0;

      portfolio.transactions.forEach((transaction) => {
        const txCurrency = transaction.currency || "USD";
        const valueInUsd =
          (transaction.quantity.toNumber() *
            transaction.pricePerUnit.toNumber()) /
          (rates[txCurrency] || 1);

        if (transaction.type === "BUY") {
          totalInvested += valueInUsd;
        } else if (transaction.type === "SELL") {
          totalInvested -= valueInUsd;
        }
      });

      return {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        totalInvested,
        transactionCount: portfolio.transactions.length,
        currency: "USD",
      };
    });

    return stats;
  }),
  
  getAllPortfoliosValue: protectedProcedure.query(async ({ ctx }) => {
    const portfolios = await ctx.db.portfolio.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        transactions: true,
      },
    });

    const stats = portfolios.map((portfolio) => {
      const holdingsMap = new Map<
        string,
        {
          symbol: string;
          quantity: number;
          currency: string;
        }
      >();

      for (const transaction of portfolio.transactions) {
        const existing = holdingsMap.get(transaction.assetSymbol) || {
          symbol: transaction.assetSymbol,
          quantity: 0,
          currency: transaction.currency || "USD",
        };

        if (transaction.type === "BUY") {
          existing.quantity += transaction.quantity.toNumber();
        } else if (transaction.type === "SELL") {
          existing.quantity -= transaction.quantity.toNumber();
        }

        holdingsMap.set(transaction.assetSymbol, existing);
      }

      const holdings = Array.from(holdingsMap.values()).filter(
        (h) => h.quantity > 0.000001,
      );

      return {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        holdings,
      };
    });

    return stats;
  }),

  getAllPortfoliosHistory: protectedProcedure.query(async ({ ctx }) => {
    const portfolios = await ctx.db.portfolio.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        transactions: true,
      },
    });

    // Spoj všechny transakce ze všech portfolií do jednoho pole, seřadíme vzestupně
    const allTransactions = portfolios
      .flatMap((p) => p.transactions)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Pokud nejsou žádné transakce, vrať prázdné pole
    if (allTransactions.length === 0) {
      return [];
    }

    // Zjisti datum první transakce
    const firstDate = new Date(allTransactions[0]!.date);
    firstDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vytvoř pole datumů od první transakce do dneška
    const dateRange: Date[] = [];
    const currentDate = new Date(firstDate);
    while (currentDate <= today) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Získej unikátní seznam všech symbolů
    const allSymbols = Array.from(
      new Set(allTransactions.map((t) => t.assetSymbol)),
    );

    // Stáhni historická denní data z Yahoo Finance
    const priceHistory: Record<string, Record<string, number>> = {};

    for (const symbol of allSymbols) {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2y`,
        );

        if (!response.ok) continue;

        const data = await response.json();

        if (data.chart?.result?.[0]) {
          const yahooMeta = data.chart.result[0].meta;
          const isGBp = yahooMeta?.currency === "GBp";
          const timestamps = data.chart.result[0].timestamp;
          const closePrices =
            data.chart.result[0].indicators?.quote?.[0]?.close;

          if (timestamps && closePrices) {
            priceHistory[symbol] = {};
            timestamps.forEach((timestamp: number, index: number) => {
              const date = new Date(timestamp * 1000);
              const dateStr = date.toISOString().split("T")[0];
              const closePrice = closePrices[index];
              if (closePrice) {
                priceHistory[symbol]![dateStr ?? ""] = isGBp
                  ? closePrice / 100
                  : closePrice;
              }
            });
          }
        }
      } catch (error) {
        console.log(`Historická data nenalezena pro symbol: ${symbol}`);
      }
    }

    // Pro každý datum vypočítej holdings a hodnotu portfolia
    const history: { date: string; value: number }[] = [];

    for (const date of dateRange) {
      // Filtruj pouze pracovní dny (pondělí až pátek)
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const dateStr = date.toISOString().split("T")[0];

      // Zjisti holdings v tento den (transakce <= datu) ze všech portfolií
      const holdingsMap = new Map<
        string,
        {
          quantity: number;
        }
      >();

      for (const transaction of allTransactions) {
        if (transaction.date <= date) {
          const existing = holdingsMap.get(transaction.assetSymbol) || {
            quantity: 0,
          };

          if (transaction.type === "BUY") {
            existing.quantity += transaction.quantity.toNumber();
          } else if (transaction.type === "SELL") {
            existing.quantity -= transaction.quantity.toNumber();
          }

          holdingsMap.set(transaction.assetSymbol, existing);
        }
      }

      // Vypočítej hodnotu portfolia v tento den
      let dayValue = 0;
      let hasAnyPrice = false;

      for (const [symbol, holding] of holdingsMap) {
        if (holding.quantity <= 0.000001) continue;

        // Najdi nejbližší dostupnou close cenu
        let closePrice: number | null = null;

        // Nejprve zkus přesnou shodu
        if (priceHistory[symbol]?.[dateStr ?? ""]) {
          closePrice = priceHistory[symbol][dateStr ?? ""] ?? null;
        } else {
          // Jinak hledej nejbližší předchozí datum
          let searchDate = new Date(date);
          for (let i = 0; i < 30; i++) {
            // Hledej zpětně až 30 dní
            searchDate.setDate(searchDate.getDate() - 1);
            const searchDateStr = searchDate.toISOString().split("T")[0];
            if (priceHistory[symbol]?.[searchDateStr ?? ""]) {
              closePrice = priceHistory[symbol][searchDateStr ?? ""] ?? null;
              break;
            }
          }
        }

        if (closePrice !== null) {
          dayValue += holding.quantity * closePrice;
          hasAnyPrice = true;
        }
      }

      // Vynechej dny kde nemáme ceny pro žádný symbol
      if (hasAnyPrice) {
        history.push({
          date: dateStr ?? "",
          value: dayValue,
        });
      }
    }

    return history;
  }),

  deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.db.portfolio.deleteMany({
      where: {
        userId: ctx.session.user.id,
      },
    });

    return {
      success: true,
      count: result.count,
    };
  }),
});
