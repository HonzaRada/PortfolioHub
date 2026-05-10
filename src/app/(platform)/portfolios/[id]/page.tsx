"use client";

import Papa from "papaparse";
import { useState, useMemo, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { api } from "~/trpc/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { CreateTransactionModal } from "~/app/_components/CreateTransactionModal";
import { ConfirmModal } from "~/app/_components/ConfirmModal";
import { StatCard } from "~/app/_components/StatCard";
import { HoldingCard } from "~/app/_components/HoldingCard";
import { CurrencySelector } from "~/app/_components/CurrencySelector";
import { useCurrencyStore } from "~/store/currencyStore";
import { chartColors } from "~/lib/chartColors";

type TransactionData = {
  id: string;
  date: Date;
  type: "BUY" | "SELL";
  assetSymbol: string;
  quantity: number;
  pricePerUnit: number;
  currency?: string | null;
};

export default function PortfolioDetailPage() {
  const params = useParams();
  const portfolioId = params.id as string;
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { displayCurrency, setDisplayCurrency } = useCurrencyStore();
  const [historyRange, setHistoryRange] = useState<
    "5D" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "YTD"
  >("1Y");

  const { data: portfolio, isLoading: isPortfolioLoading } =
    api.portfolio.getById.useQuery({ id: portfolioId });
  const { data: transactions, isLoading: isTransactionsLoading } =
    api.transaction.getAll.useQuery({ portfolioId });

  const holdings = useMemo(() => {
    if (!transactions) return [];
    const balances: Record<string, { quantity: number; currency: string }> = {};

    transactions.forEach((tx) => {
      if (!balances[tx.assetSymbol]) {
        balances[tx.assetSymbol] = {
          quantity: 0,
          currency: tx.currency || "USD",
        };
      }
      if (tx.type === "BUY")
        balances[tx.assetSymbol]!.quantity += Number(tx.quantity);
      else balances[tx.assetSymbol]!.quantity -= Number(tx.quantity);
    });

    return Object.entries(balances)
      .filter(([_, data]) => data.quantity > 0.000001)
      .map(([symbol, data]) => ({
        symbol,
        quantity: data.quantity,
        currency: data.currency,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [transactions]);

  const { data: livePrices, isLoading: isPricesLoading } =
    api.prices.getPrices.useQuery(
      { symbols: holdings.map((h) => h.symbol) },
      { enabled: holdings.length > 0, refetchInterval: 60000 },
    );

  const { data: holdingsWithStats } =
    api.portfolio.getHoldingsWithStats.useQuery(
      { portfolioId },
      { enabled: !!portfolioId },
    );

  const { data: portfolioHistory, isLoading: isHistoryLoading } =
    api.portfolio.getPortfolioHistory.useQuery(
      { portfolioId },
      { enabled: !!portfolioId },
    );

  const { data: exchangeRates } = api.prices.getExchangeRates.useQuery(
    undefined,
    {
      staleTime: 1000 * 60 * 60, // Kurzy měn se obnovují jednou za hodinu
    },
  );

  const totalValue = useMemo(() => {
    if (!livePrices || !exchangeRates) return 0;

    return holdings.reduce((sum, h) => {
      const rawPrice = livePrices[h.symbol] || 0;
      const assetCurrency = h.currency || "USD";

      // Převod: (Cena v původní měně / Kurz původní měny) * Kurz vybrané měny
      const rateAssetToUsd = exchangeRates[assetCurrency] || 1;
      const rateUsdToDisplay = exchangeRates[displayCurrency] || 1;

      const priceInDisplayCurrency =
        (rawPrice / rateAssetToUsd) * rateUsdToDisplay;

      return sum + h.quantity * priceInDisplayCurrency;
    }, 0);
  }, [holdings, livePrices, exchangeRates, displayCurrency]);

  const portfolioStats = useMemo(() => {
    if (!holdingsWithStats || !exchangeRates) {
      return { totalInvested: 0, totalPnL: 0, totalPnLPercent: 0 };
    }

    let totalInvestedUsd = 0;

    holdingsWithStats.forEach((h) => {
      const assetCurrency = h.currency || "USD";
      const rateAssetToUsd = exchangeRates[assetCurrency] || 1;
      const investedInUsd = h.totalInvested / rateAssetToUsd;
      totalInvestedUsd += investedInUsd;
    });

    // Převod z USD do vybrané měny
    const rateUsdToDisplay = exchangeRates[displayCurrency] || 1;
    const totalInvested = totalInvestedUsd * rateUsdToDisplay;
    const totalPnL = totalValue - totalInvested;
    const totalPnLPercent =
      totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    return { totalInvested, totalPnL, totalPnLPercent };
  }, [
    holdingsWithStats,
    livePrices,
    exchangeRates,
    displayCurrency,
    totalValue,
  ]);

  const allocationData = useMemo(() => {
    if (!livePrices || !exchangeRates) return [];

    const data = holdings
      .map((h) => {
        const rawPrice = livePrices[h.symbol] || 0;
        const assetCurrency = h.currency || "USD";

        const rateAssetToUsd = exchangeRates[assetCurrency] || 1;
        const rateUsdToDisplay = exchangeRates[displayCurrency] || 1;

        const priceInDisplayCurrency =
          (rawPrice / rateAssetToUsd) * rateUsdToDisplay;
        const value = h.quantity * priceInDisplayCurrency;

        return { name: h.symbol, value };
      })
      .filter((item) => item.value > 0);

    return data;
  }, [holdings, livePrices, exchangeRates, displayCurrency]);

  const chartData = useMemo(() => {
    if (!portfolioHistory || !exchangeRates) return [];

    return portfolioHistory.map((point) => ({
      date: point.date,
      value: point.value * (exchangeRates[displayCurrency] || 1),
    }));
  }, [portfolioHistory, exchangeRates, displayCurrency]);

  // Filtrování dat podle vybraného rozsahu
  const filteredChartData = useMemo(() => {
    if (!chartData.length) return [];
    if (historyRange === "YTD") {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      return chartData.filter((d) => new Date(d.date) >= startOfYear);
    }

    const days = ({ "5D": 5 } as Record<string, number>)[historyRange];
    if (days !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return chartData.filter((d) => new Date(d.date) >= cutoff);
    }

    const months =
      (
        { "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "2Y": 24 } as Record<
          string,
          number
        >
      )[historyRange] ?? 12;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return chartData.filter((d) => new Date(d.date) >= cutoff);
  }, [chartData, historyRange]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionData | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(
    null,
  );

  const deleteTransaction = api.transaction.delete.useMutation({
    onSuccess: () => {
      utils.transaction.getAll.invalidate();
      toast.success("Transakce smazána 🗑️");
      setTransactionToDelete(null);
    },
  });

  const createManyTransactions = api.transaction.createMany.useMutation({
    onSuccess: (data) => {
      utils.transaction.getAll.invalidate();
      toast.success(`Úspěšně naimportováno ${data.count} transakcí! 🎉`);

      // Zobraz warningy pokud existují
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach((warning) => {
          toast.error(warning, { duration: 8000 });
        });
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast.loading("Zpracovávám CSV...", { id: "csv-upload" });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedTransactions: any[] = [];
        for (const row of results.data as any[]) {
          try {
            const rawDate = (
              String(row["Date/Time"] || "").split(";")[0] ?? ""
            ).trim();
            if (!rawDate) continue;

            let parsedDate = /^\d{8}$/.test(rawDate)
              ? new Date(
                  `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`,
                )
              : new Date(rawDate);

            if (isNaN(parsedDate.getTime())) continue;

            const rawType = String(row["Buy/Sell"] || "").toUpperCase();
            const type = rawType.includes("BUY")
              ? "BUY"
              : rawType.includes("SELL")
                ? "SELL"
                : null;

            const assetClass = String(row["AssetClass"] || "")
              .trim()
              .toUpperCase();
            if (assetClass !== "STK" && assetClass !== "CRYPTO") continue;

            const assetSymbol = String(row["Symbol"] || "").trim();
            const listingExchange = String(row["ListingExchange"] || "").trim();
            const currency = String(
              row["CurrencyPrimary"] || row["Currency"] || "USD",
            )
              .trim()
              .toUpperCase();
            const quantity = Math.abs(
              Number(String(row["Quantity"] || "0").replace(",", ".")),
            );
            const pricePerUnit = Math.abs(
              Number(String(row["Price"] || "0").replace(",", ".")),
            );

            if (type && assetSymbol && quantity > 0 && pricePerUnit > 0) {
              parsedTransactions.push({
                date: parsedDate,
                type,
                assetSymbol,
                listingExchange,
                quantity,
                pricePerUnit,
                currency,
              });
            }
          } catch (e) {}
        }

        if (parsedTransactions.length > 0) {
          createManyTransactions.mutate({
            portfolioId,
            transactions: parsedTransactions,
          });
        }
        toast.dismiss("csv-upload");
      },
    });
  };

  if (isPortfolioLoading || isTransactionsLoading)
    return (
      <div className="p-8 text-center text-slate-500">Načítám data...</div>
    );
  if (!portfolio)
    return (
      <div className="p-8 text-center text-red-500">Portfolio nenalezeno.</div>
    );

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <Link
          href="/portfolios"
          className="mb-4 inline-block text-sm text-indigo-600 hover:underline"
        >
          &larr; Zpět na všechna portfolia
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {portfolio.name}
            </h1>
            <p className="mt-1 text-slate-500">
              Detailní přehled tvých transakcí a aktuálních hodnot.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={createManyTransactions.isPending}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {createManyTransactions.isPending
                ? "Importuji..."
                : "📁 Import CSV"}
            </button>
            <button
              onClick={() => {
                setIsCreateModalOpen(true);
                setEditingTransaction(null);
              }}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              + Nová transakce
            </button>
          </div>
        </div>
      </div>

      {/* Statistické karty */}
      <div className="mb-8">
        <div className="mb-4 flex justify-end">
          <CurrencySelector
            value={displayCurrency}
            onChange={setDisplayCurrency}
          />
        </div>

        {holdings.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              title="Aktuální hodnota"
              value={totalValue.toLocaleString("cs-CZ", {
                maximumFractionDigits: 0,
              })}
              subtitle={displayCurrency}
              variant="purple"
              isLoading={isPricesLoading}
              loadingText="Aktualizuji..."
            />
            <StatCard
              title="Investováno"
              value={portfolioStats.totalInvested.toLocaleString("cs-CZ", {
                maximumFractionDigits: 0,
              })}
              subtitle={displayCurrency}
              variant="slate"
            />
            <StatCard
              title="Zisk/Ztráta"
              value={`${portfolioStats.totalPnL >= 0 ? "+" : ""}${portfolioStats.totalPnL.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })}`}
              subtitle={displayCurrency}
              variant={portfolioStats.totalPnL >= 0 ? "green" : "red"}
            />
            <StatCard
              title="Zisk/Ztráta (%)"
              value={`${portfolioStats.totalPnLPercent >= 0 ? "+" : ""}${portfolioStats.totalPnLPercent.toFixed(2)}%`}
              variant={portfolioStats.totalPnLPercent >= 0 ? "green" : "red"}
            />
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Aktuální složení portfolia
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {holdings.map(({ symbol, quantity, currency }) => (
            <HoldingCard
              key={symbol}
              symbol={symbol}
              quantity={quantity}
              currency={currency}
              displayCurrency={displayCurrency}
              livePrice={livePrices?.[symbol]}
              isLoading={isPricesLoading}
              exchangeRates={exchangeRates}
            />
          ))}
        </div>
      </div>

      {allocationData.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Alokace portfolia
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={130}
                  innerRadius={70}
                >
                  {allocationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
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
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {chartData && chartData.length > 1 ? (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Vývoj hodnoty portfolia
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex justify-center gap-2">
              {["5D", "1M", "3M", "6M", "1Y", "2Y", "YTD"].map((range) => (
                <button
                  key={range}
                  onClick={() => setHistoryRange(range as any)}
                  className={`rounded px-3 py-1 text-sm font-medium transition ${
                    historyRange === range
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            {isHistoryLoading ? (
              <div className="flex h-96 items-center justify-center text-slate-400">
                Načítám historická data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={filteredChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    ticks={(() => {
                      if (historyRange === "5D") {
                        return filteredChartData.map((d) => d.date);
                      }
                      if (historyRange === "1M") {
                        return filteredChartData
                          .filter((d, i) => {
                            if (i === 0) return true;
                            const prev = new Date(
                              filteredChartData[i - 1]!.date,
                            );
                            const curr = new Date(d.date);
                            const prevWeek = Math.floor(prev.getDate() / 7);
                            const currWeek = Math.floor(curr.getDate() / 7);
                            return currWeek !== prevWeek;
                          })
                          .map((d) => d.date);
                      }
                      return filteredChartData
                        .filter((d, i) => {
                          if (i === 0) return true;
                          const prev = new Date(filteredChartData[i - 1]!.date);
                          const curr = new Date(d.date);
                          return (
                            curr.getMonth() !== prev.getMonth() ||
                            curr.getFullYear() !== prev.getFullYear()
                          );
                        })
                        .map((d) => d.date);
                    })()}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      if (historyRange === "5D" || historyRange === "1M") {
                        return d.toLocaleDateString("cs-CZ", {
                          day: "numeric",
                          month: "short",
                        });
                      }
                      return d.toLocaleDateString("cs-CZ", {
                        month: "short",
                        year: "2-digit",
                      });
                    }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
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
      ) : null}

      <h2 className="mb-4 text-lg font-bold text-slate-900">
        Historie transakcí
      </h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Datum</th>
                <th className="px-6 py-4">Typ</th>
                <th className="px-6 py-4">Aktivum</th>
                <th className="px-6 py-4 text-right">Množství</th>
                <th className="px-6 py-4 text-right">Cena/ks</th>
                <th className="px-6 py-4 text-right">Celkem</th>
                <th className="px-6 py-4 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions?.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {t.date.toLocaleDateString("cs-CZ")}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${t.type === "BUY" ? "bg-green-50 text-green-700 ring-green-600/20" : "bg-red-50 text-red-700 ring-red-600/20"}`}
                    >
                      {t.type === "BUY" ? "NÁKUP" : "PRODEJ"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {t.assetSymbol}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-900">
                    {Number(t.quantity)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {Number(t.pricePerUnit).toLocaleString("cs-CZ")}
                    <span className="ml-1 text-xs text-slate-400">
                      {t.currency || "USD"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                    {(
                      Number(t.quantity) * Number(t.pricePerUnit)
                    ).toLocaleString("cs-CZ")}
                    <span className="ml-1 text-xs text-slate-400">
                      {t.currency || "USD"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingTransaction({
                            id: t.id,
                            date: t.date,
                            type: t.type as "BUY" | "SELL",
                            assetSymbol: t.assetSymbol,
                            quantity: Number(t.quantity),
                            pricePerUnit: Number(t.pricePerUnit),
                            currency: t.currency,
                          });
                          setIsCreateModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setTransactionToDelete(t.id)}
                        className="text-red-400 hover:text-red-700"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateTransactionModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTransaction(null);
        }}
        initialData={editingTransaction}
        portfolioId={portfolioId}
      />
      <ConfirmModal
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={() => {
          if (transactionToDelete)
            deleteTransaction.mutate({ id: transactionToDelete });
        }}
        isLoading={deleteTransaction.isPending}
        title="Smazat transakci?"
        description="Tato akce je nevratná."
      />
    </div>
  );
}
