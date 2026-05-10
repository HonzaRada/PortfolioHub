import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const pricesRouter = createTRPCRouter({
  // Načtení živých cen z Yahoo Finance pro zadané symboly
  getPrices: protectedProcedure
    .input(z.object({ symbols: z.array(z.string()) }))
    .query(async ({ input }) => {
      const prices: Record<string, number> = {};

      const fetchYahooPrice = async (
        symbol: string,
      ): Promise<{ price: number; currency: string } | null> => {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
          );
          if (!response.ok) return null;
          const data = await response.json();
          if (!data.chart?.result?.[0]) return null;
          const closes = data.chart.result[0].indicators?.quote?.[0]?.close as (
            | number
            | null
          )[];
          const currency = data.chart.result[0].meta?.currency as
            | string
            | undefined;
          if (!closes) return null;
          const price =
            [...closes].reverse().find((p) => p !== null && p > 0) ?? null;
          if (price === null) return null;
          return { price, currency: currency ?? "USD" };
        } catch {
          return null;
        }
      };

      // Známé kryptoměny které Yahoo Finance vyžaduje ve formátu SYMBOL-USD
      const knownCrypto = [
        "BTC",
        "ETH",
        "SOL",
        "DOGE",
        "ADA",
        "XRP",
        "DOT",
        "AVAX",
        "MATIC",
        "LINK",
        "UNI",
        "LTC",
        "BCH",
        "XLM",
        "ATOM",
        "ALGO",
        "VET",
        "FIL",
        "TRX",
        "EOS",
      ];

      for (const symbol of input.symbols) {
        let priceData: { price: number; currency: string } | null = null;

        if (knownCrypto.includes(symbol)) {
          priceData = await fetchYahooPrice(`${symbol}-USD`);
        } else {
          priceData = await fetchYahooPrice(symbol);
          if (!priceData && !symbol.includes("-") && !symbol.includes(".")) {
            priceData = await fetchYahooPrice(`${symbol}-USD`);
          }
        }

        if (priceData) {
          let finalPrice = priceData.price;
          // Londýnské akcie jsou kotovány v pencích (GBp) — převedeme na libry (GBP)
          if (priceData.currency === "GBp") {
            finalPrice = priceData.price / 100;
          }
          prices[symbol] = finalPrice;
        }
      }

      return prices;
    }),

  // Načtení aktuálních kurzů měn vůči USD z open.er-api.com
  getExchangeRates: protectedProcedure.query(async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();
      return data.rates as Record<string, number>;
    } catch {
      // Záložní hodnoty pro případ nedostupnosti API
      return { USD: 1, CZK: 23.5, EUR: 0.92, GBP: 0.79 };
    }
  }),
});
