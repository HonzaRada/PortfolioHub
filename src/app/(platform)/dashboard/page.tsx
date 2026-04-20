"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { StatCard } from "~/app/_components/StatCard";
import { CurrencySelector } from "~/app/_components/CurrencySelector";
import { useCurrencyStore } from "~/store/currencyStore";

export default function DashboardPage() {
  const { displayCurrency, setDisplayCurrency } = useCurrencyStore();

  const { data: portfoliosStats } = api.portfolio.getAllPortfoliosStats.useQuery();
  const { data: allPortfoliosValue } = api.portfolio.getAllPortfoliosValue.useQuery();
  const { data: exchangeRates } = api.portfolio.getExchangeRates.useQuery(undefined, {
    staleTime: 1000 * 60 * 60,
  });
  const { data: accountHistory, isLoading: isHistoryLoading } = api.portfolio.getAllPortfoliosHistory.useQuery();

  // Deduplikovaný seznam všech symbolů
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

  // Live ceny
  const { data: livePrices } = api.portfolio.getPrices.useQuery(
    { symbols: allSymbols },
    { enabled: allSymbols.length > 0, refetchInterval: 60000 }
  );

  // Celková investovaná částka (v USD)
  const totalInvestedAllUsd = useMemo(() => {
    if (!portfoliosStats) return 0;
    return portfoliosStats.reduce((sum, portfolio) => sum + portfolio.totalInvested, 0);
  }, [portfoliosStats]);

  // Celková investovaná částka v displayCurrency
  const totalInvestedDisplay = useMemo(() => {
    const rate = exchangeRates?.[displayCurrency] || 1;
    return totalInvestedAllUsd * rate;
  }, [totalInvestedAllUsd, exchangeRates, displayCurrency]);

  // Aktuální celková hodnota portfolií
  const totalValueAll = useMemo(() => {
    if (!allPortfoliosValue || !livePrices || !exchangeRates) return 0;

    return allPortfoliosValue.reduce((sum, portfolio) => {
      const portfolioValue = portfolio.holdings.reduce((holdingSum, holding) => {
        const price = livePrices[holding.symbol] || 0;
        if (price === 0) return holdingSum;

        // Převeď cenu z měny aktiva do USD a pak do displayCurrency
        const priceInUsd = price / (exchangeRates[holding.currency] || 1);
        const priceInDisplay = priceInUsd * (exchangeRates[displayCurrency] || 1);

        return holdingSum + holding.quantity * priceInDisplay;
      }, 0);

      return sum + portfolioValue;
    }, 0);
  }, [allPortfoliosValue, livePrices, exchangeRates, displayCurrency]);

  // Celkový P&L (zisk/ztráta)
  const totalPnLAll = useMemo(() => {
    return totalValueAll - totalInvestedDisplay;
  }, [totalValueAll, totalInvestedDisplay]);

  // Procento P&L
  const totalPnLPercent = useMemo(() => {
    if (totalInvestedDisplay === 0) return 0;
    return ((totalPnLAll / totalInvestedDisplay) * 100).toFixed(2);
  }, [totalPnLAll, totalInvestedDisplay]);

  // Data pro koláčový graf — seřazeny sestupně
  const portfolioChartData = useMemo(() => {
    if (!portfoliosStats || !exchangeRates) return [];

    return portfoliosStats
      .map((portfolio) => {
        const portfolioCurrency = portfolio.currency || "USD";
        const rateFromPortfolioCurrency = exchangeRates[portfolioCurrency] || 1;
        const rateToDisplayCurrency = exchangeRates[displayCurrency] || 1;

        const convertedValue = (portfolio.totalInvested / rateFromPortfolioCurrency) * rateToDisplayCurrency;

        return {
          name: portfolio.portfolioName,
          portfolioId: portfolio.portfolioId,
          invested: convertedValue,
        };
      })
      .sort((a, b) => b.invested - a.invested);
  }, [portfoliosStats, exchangeRates, displayCurrency]);

  // Výpočet celkového počtu transakcí
  const totalTransactions = useMemo(() => {
    if (!portfoliosStats) return 0;
    return portfoliosStats.reduce((sum, p) => sum + p.transactionCount, 0);
  }, [portfoliosStats]);

  // Data pro graf vývoje hodnoty účtu
  const accountChartData = useMemo(() => {
    if (!accountHistory || !exchangeRates) return [];

    return accountHistory.map((point) => ({
      date: point.date,
      value: point.value * (exchangeRates[displayCurrency] || 1),
    }));
  }, [accountHistory, exchangeRates, displayCurrency]);

  const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

  if (!portfoliosStats) {
    return <div className="p-8 text-center text-slate-500">Načítám data...</div>;
  }

  const pnlColor = totalPnLAll >= 0 ? "text-green-600" : "text-red-600";
  const pnlBgColor = totalPnLAll >= 0 ? "from-green-50 to-green-100 border-green-200" : "from-red-50 to-red-100 border-red-200";
  const pnlTextColor = totalPnLAll >= 0 ? "text-green-900" : "text-red-900";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Hlavička s názvem a přepínačem měn */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Celkový přehled</h1>
          <p className="text-slate-500 mt-1">Statistiky všech tvých portfolií na jednom místě.</p>
        </div>
        <div>
          <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
        </div>
      </div>

      {/* Čtyři hlavní karty se statistikami */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        <StatCard
          title="Aktuální hodnota"
          value={totalValueAll.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })}
          subtitle={displayCurrency}
          variant="purple"
        />
        <StatCard
          title="Celkem investováno"
          value={totalInvestedDisplay.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })}
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
          value={`${totalInvestedDisplay > 0 ? (totalPnLAll >= 0 ? "+" : "") + (totalPnLAll / totalInvestedDisplay * 100).toFixed(2) : "0.00"}%`}
          variant={totalPnLAll >= 0 ? "green" : "red"}
        />
      </div>

      {/* Sekce "Vývoj hodnoty účtu" — lineární graf */}
      {accountChartData.length > 1 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Vývoj hodnoty účtu</h2>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {isHistoryLoading ? (
              <div className="h-80 flex items-center justify-center text-slate-400 animate-pulse">
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
                      new Date(value).toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(value) => {
                      if (value < 1000) return value.toString();
                      if (value < 1000000) return (value / 1000).toFixed(0) + "k";
                      return (value / 1000000).toFixed(0) + "M";
                    }}
                  />
                  <RechartsTooltip
                    formatter={(value: number) =>
                      value.toLocaleString("cs-CZ", { maximumFractionDigits: 0 }) + " " + displayCurrency
                    }
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString("cs-CZ")
                    }
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

      {/* Sekce "Srovnění portfolií" — donut graf */}
      {portfolioChartData.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Srovnění portfolií</h2>
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
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Legend />
                <RechartsTooltip
                  formatter={(value: number | string | undefined) => {
                    if (typeof value !== "number") return "";
                    const investedSum = portfoliosStats.reduce((sum, p) => {
                      const portfolioCurrency = p.currency || "USD";
                      const rateFromPortfolioCurrency = exchangeRates?.[portfolioCurrency] || 1;
                      const rateToDisplayCurrency = exchangeRates?.[displayCurrency] || 1;
                      const convertedValue = (p.totalInvested / rateFromPortfolioCurrency) * rateToDisplayCurrency;
                      return sum + convertedValue;
                    }, 0);
                    const percentage = ((value / investedSum) * 100).toFixed(1);
                    return [
                      `${value.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} ${displayCurrency}`,
                      `(${percentage}%)`,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sekce "Portfolia" — grid karet */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Portfolia</h2>
        {portfoliosStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfoliosStats.map((portfolio) => {
              const portfolioCurrency = portfolio.currency || "USD";
              const rateFromPortfolioCurrency = exchangeRates?.[portfolioCurrency] || 1;
              const rateToDisplayCurrency = exchangeRates?.[displayCurrency] || 1;
              const convertedValue = (portfolio.totalInvested / rateFromPortfolioCurrency) * rateToDisplayCurrency;

              return (
                <div
                  key={portfolio.portfolioId}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{portfolio.portfolioName}</h3>

                  <div className="space-y-3 mb-6">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                        Počet transakcí
                      </p>
                      <p className="text-2xl font-bold text-slate-900">{portfolio.transactionCount}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                        Investováno
                      </p>
                      {convertedValue < 0 ? (
                        <>
                          <p className="text-2xl font-bold text-red-600">
                            ⚠️ Chyba v datech
                          </p>
                          <p className="text-xs text-red-500 mt-1">Zkontroluj transakce prodejů</p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-indigo-600">
                            {convertedValue.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-sm text-slate-500">{displayCurrency}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/portfolios/${portfolio.portfolioId}`}
                    className="inline-block w-full text-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Zobrazit
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
            <p className="font-medium text-slate-700">Zatím nemáš žádná portfolia.</p>
            <Link href="/portfolios" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
              Jdi na stránku portfolií a vytvoř si jedno →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}