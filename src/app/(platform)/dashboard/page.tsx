"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { StatCard } from "~/app/_components/StatCard";
import { CurrencySelector } from "~/app/_components/CurrencySelector";
import { useCurrencyStore } from "~/store/currencyStore";
import { chartColors } from "~/lib/chartColors";

export default function DashboardPage() {
  const { displayCurrency, setDisplayCurrency } = useCurrencyStore();

  const { data: portfoliosStats } =
    api.portfolio.getAllPortfoliosStats.useQuery();
  const { data: allPortfoliosValue } =
    api.portfolio.getAllPortfoliosValue.useQuery();
  const { data: exchangeRates } = api.prices.getExchangeRates.useQuery(
    undefined,
    {
      staleTime: 1000 * 60 * 60,
    },
  );
  const { data: accountHistory, isLoading: isHistoryLoading } =
    api.portfolio.getAllPortfoliosHistory.useQuery();

  // Unikátní seznam symbolů ze všech portfolií pro načtení live cen
  const allSymbols = useMemo(() => {
    if (!allPortfoliosValue) return [];
    const symbols = new Set<string>();
    allPortfoliosValue.forEach((portfolio) => {
      portfolio.holdings.forEach((holding) => {
        symbols.add(holding.symbol);
      });
    });
    return Array.from(symbols);
  }, [allPortfoliosValue]);

  const { data: livePrices } = api.prices.getPrices.useQuery(
    { symbols: allSymbols },
    { enabled: allSymbols.length > 0, refetchInterval: 60000 },
  );

  const totalInvestedAllUsd = useMemo(() => {
    if (!portfoliosStats) return 0;
    return portfoliosStats.reduce(
      (sum, portfolio) => sum + portfolio.totalInvested,
      0,
    );
  }, [portfoliosStats]);

  // Celková investovaná částka přepočtená do vybrané měny
  const totalInvestedDisplay = useMemo(() => {
    const rate = exchangeRates?.[displayCurrency] || 1;
    return totalInvestedAllUsd * rate;
  }, [totalInvestedAllUsd, exchangeRates, displayCurrency]);

  // Aktuální tržní hodnota všech portfolií v displayCurrency
  const totalValueAll = useMemo(() => {
    if (!allPortfoliosValue || !livePrices || !exchangeRates) return 0;

    return allPortfoliosValue.reduce((sum, portfolio) => {
      const portfolioValue = portfolio.holdings.reduce(
        (holdingSum, holding) => {
          const price = livePrices[holding.symbol] || 0;
          if (price === 0) return holdingSum;

          // Převeď cenu z měny aktiva do USD a pak do displayCurrency
          const priceInUsd = price / (exchangeRates[holding.currency] || 1);
          const priceInDisplay =
            priceInUsd * (exchangeRates[displayCurrency] || 1);

          return holdingSum + holding.quantity * priceInDisplay;
        },
        0,
      );

      return sum + portfolioValue;
    }, 0);
  }, [allPortfoliosValue, livePrices, exchangeRates, displayCurrency]);

  const totalPnLAll = useMemo(() => {
    return totalValueAll - totalInvestedDisplay;
  }, [totalValueAll, totalInvestedDisplay]);

  const portfolioChartData = useMemo(() => {
    if (!portfoliosStats || !exchangeRates) return [];

    return portfoliosStats
      .map((portfolio) => {
        const portfolioCurrency = portfolio.currency || "USD";
        const rateFromPortfolioCurrency = exchangeRates[portfolioCurrency] || 1;
        const rateToDisplayCurrency = exchangeRates[displayCurrency] || 1;

        const convertedValue =
          (portfolio.totalInvested / rateFromPortfolioCurrency) *
          rateToDisplayCurrency;

        return {
          name: portfolio.portfolioName,
          portfolioId: portfolio.portfolioId,
          invested: convertedValue,
        };
      })
      .sort((a, b) => b.invested - a.invested);
  }, [portfoliosStats, exchangeRates, displayCurrency]);

  const accountChartData = useMemo(() => {
    if (!accountHistory || !exchangeRates) return [];

    return accountHistory.map((point) => ({
      date: point.date,
      value: point.value * (exchangeRates[displayCurrency] || 1),
    }));
  }, [accountHistory, exchangeRates, displayCurrency]);

  if (!portfoliosStats) {
    return (
      <div className="p-8 text-center text-slate-500">Načítám data...</div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Celkový přehled</h1>
          <p className="mt-1 text-slate-500">
            Statistiky všech tvých portfolií na jednom místě.
          </p>
        </div>
        <div>
          <CurrencySelector
            value={displayCurrency}
            onChange={setDisplayCurrency}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Aktuální hodnota"
          value={totalValueAll.toLocaleString("cs-CZ", {
            maximumFractionDigits: 0,
          })}
          subtitle={displayCurrency}
          variant="purple"
        />
        <StatCard
          title="Celkem investováno"
          value={totalInvestedDisplay.toLocaleString("cs-CZ", {
            maximumFractionDigits: 0,
          })}
          subtitle={displayCurrency}
          variant="slate"
        />
        <StatCard
          title="Zisk/Ztráta"
          value={`${totalPnLAll >= 0 ? "+" : ""}${totalPnLAll.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })}`}
          subtitle={displayCurrency}
          variant={totalPnLAll >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Zisk/Ztráta (%)"
          value={`${totalInvestedDisplay > 0 ? (totalPnLAll >= 0 ? "+" : "") + ((totalPnLAll / totalInvestedDisplay) * 100).toFixed(2) : "0.00"}%`}
          variant={totalPnLAll >= 0 ? "green" : "red"}
        />
      </div>

      {/* Graf vývoje hodnoty */}
      {accountChartData.length > 1 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Vývoj hodnoty účtu
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {isHistoryLoading ? (
              <div className="flex h-80 animate-pulse items-center justify-center text-slate-400">
                Načítám historická data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={accountChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    interval="preserveStartEnd"
                    minTickGap={60}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("cs-CZ", {
                        month: "short",
                        year: "2-digit",
                      })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(value) => {
                      if (value < 1000) return value.toString();
                      if (value < 1000000)
                        return (value / 1000).toFixed(0) + "k";
                      return (value / 1000000).toFixed(0) + "M";
                    }}
                  />
                  <RechartsTooltip
                    formatter={(value) => {
                      const num = Number(value);
                      if (isNaN(num)) return "";
                      return (
                        num.toLocaleString("cs-CZ", {
                          maximumFractionDigits: 0,
                        }) +
                        " " +
                        displayCurrency
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Graf srovnání portfolií */}
      {portfolioChartData.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Srovnění portfolií
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={portfolioChartData}
                  dataKey="invested"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={130}
                  innerRadius={70}
                >
                  {portfolioChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <RechartsTooltip
                  formatter={(value) => {
                    const num = Number(value);
                    if (isNaN(num)) return "";
                    const investedSum = portfoliosStats.reduce((sum, p) => {
                      const portfolioCurrency = p.currency || "USD";
                      const rateFromPortfolioCurrency =
                        exchangeRates?.[portfolioCurrency] || 1;
                      const rateToDisplayCurrency =
                        exchangeRates?.[displayCurrency] || 1;
                      const convertedValue =
                        (p.totalInvested / rateFromPortfolioCurrency) *
                        rateToDisplayCurrency;
                      return sum + convertedValue;
                    }, 0);
                    const percentage = ((num / investedSum) * 100).toFixed(1);
                    return [
                      `${num.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} ${displayCurrency}`,
                      `(${percentage}%)`,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Seznam portfolií */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Portfolia</h2>
        {portfoliosStats.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {portfoliosStats.map((portfolio) => {
              const portfolioCurrency = portfolio.currency || "USD";
              const rateFromPortfolioCurrency =
                exchangeRates?.[portfolioCurrency] || 1;
              const rateToDisplayCurrency =
                exchangeRates?.[displayCurrency] || 1;
              const convertedValue =
                (portfolio.totalInvested / rateFromPortfolioCurrency) *
                rateToDisplayCurrency;

              return (
                <div
                  key={portfolio.portfolioId}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="mb-4 text-lg font-bold text-slate-900">
                    {portfolio.portfolioName}
                  </h3>

                  <div className="mb-6 space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium tracking-wider text-slate-500 uppercase">
                        Počet transakcí
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {portfolio.transactionCount}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium tracking-wider text-slate-500 uppercase">
                        Investováno
                      </p>
                      {convertedValue < 0 ? (
                        <>
                          <p className="text-2xl font-bold text-red-600">
                            ⚠️ Chyba v datech
                          </p>
                          <p className="mt-1 text-xs text-red-500">
                            Zkontroluj transakce prodejů
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-indigo-600">
                            {convertedValue.toLocaleString("cs-CZ", {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                          <p className="text-sm text-slate-500">
                            {displayCurrency}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/portfolios/${portfolio.portfolioId}`}
                    className="inline-block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Zobrazit
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
            <p className="font-medium text-slate-700">
              Zatím nemáš žádná portfolia.
            </p>
            <Link
              href="/portfolios"
              className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
            >
              Jdi na stránku portfolií a vytvoř si jedno →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
