"use client";

import Papa from "papaparse";
import { useState, useMemo, useRef } from "react";
import { api } from "~/trpc/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { CreateTransactionModal } from "~/app/_components/CreateTransactionModal";
import { ConfirmModal } from "~/app/_components/ConfirmModal";

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
    const router = useRouter();
    const utils = api.useUtils();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- NOVÝ STAV PRO PŘEPÍNAČ MĚN ---
    const [displayCurrency, setDisplayCurrency] = useState<"CZK" | "USD" | "EUR" | "GBP">("CZK");

    const { data: portfolio, isLoading: isPortfolioLoading } = api.portfolio.getById.useQuery({ id: portfolioId });
    const { data: transactions, isLoading: isTransactionsLoading } = api.transaction.getAll.useQuery({ portfolioId });

    // 1. Zjistíme zůstatky a jejich originální měny
    const holdings = useMemo(() => {
        if (!transactions) return [];
        const balances: Record<string, { quantity: number; currency: string }> = {};

        transactions.forEach((tx) => {
            if (!balances[tx.assetSymbol]) {
                balances[tx.assetSymbol] = { quantity: 0, currency: tx.currency || "USD" };
            }
            if (tx.type === "BUY") balances[tx.assetSymbol].quantity += tx.quantity;
            else balances[tx.assetSymbol].quantity -= tx.quantity;
        });

        return Object.entries(balances)
            .filter(([_, data]) => data.quantity > 0.000001)
            .map(([symbol, data]) => ({ symbol, quantity: data.quantity, currency: data.currency }))
            .sort((a, b) => b.quantity - a.quantity);
    }, [transactions]);

    // 2. Stáhneme živé ceny z Finnhubu
    const { data: livePrices, isLoading: isPricesLoading } = api.portfolio.getPrices.useQuery(
        { symbols: holdings.map(h => h.symbol) },
        { enabled: holdings.length > 0, refetchInterval: 60000 }
    );

    // 3. Stáhneme živé měnové kurzy
    const { data: exchangeRates } = api.portfolio.getExchangeRates.useQuery(undefined, {
        staleTime: 1000 * 60 * 60, // Stačí obnovovat jednou za hodinu
    });

    // 4. VÝPOČET CELKOVÉ HODNOTY S DYNAMICKÝM PŘEVODEM
    const totalValue = useMemo(() => {
        if (!livePrices || !exchangeRates) return 0;

        return holdings.reduce((sum, h) => {
            const rawPrice = livePrices[h.symbol] || 0;
            const assetCurrency = h.currency || "USD";

            // Převod: (Cena v původní měně / Kurz původní měny) * Kurz vybrané měny
            const rateAssetToUsd = exchangeRates[assetCurrency] || 1;
            const rateUsdToDisplay = exchangeRates[displayCurrency] || 1;
            
            const priceInDisplayCurrency = (rawPrice / rateAssetToUsd) * rateUsdToDisplay;

            return sum + (h.quantity * priceInDisplayCurrency);
        }, 0);
    }, [holdings, livePrices, exchangeRates, displayCurrency]);

    // --- MUTACE A OSTATNÍ LOGIKA ---
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionData | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

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
                        const rawDate = String(row["Date/Time"] || "").split(';')[0].trim();
                        if (!rawDate) continue;
                        
                        let parsedDate = /^\d{8}$/.test(rawDate) 
                            ? new Date(`${rawDate.substring(0,4)}-${rawDate.substring(4,6)}-${rawDate.substring(6,8)}`)
                            : new Date(rawDate);
                        
                        if (isNaN(parsedDate.getTime())) continue;

                        const rawType = String(row["Buy/Sell"] || "").toUpperCase();
                        const type = rawType.includes("BUY") ? "BUY" : (rawType.includes("SELL") ? "SELL" : null);
                        const assetSymbol = String(row["UnderlyingSymbol"] || "").trim();
                        
                        // NOVÉ: Vytažení měny z CSV
                        const currency = String(row["CurrencyPrimary"] || row["Currency"] || "USD").trim().toUpperCase();

                        const quantity = Math.abs(Number(String(row["Quantity"] || "0").replace(",", ".")));
                        const pricePerUnit = Math.abs(Number(String(row["Price"] || "0").replace(",", ".")));

                        if (type && assetSymbol && quantity > 0 && pricePerUnit > 0) {
                            parsedTransactions.push({
                                date: parsedDate, type, assetSymbol, quantity, pricePerUnit, currency
                            });
                        }
                    } catch (e) {}
                }

                if (parsedTransactions.length > 0) {
                    createManyTransactions.mutate({ portfolioId, transactions: parsedTransactions });
                }
                toast.dismiss("csv-upload");
            }
        });
    };

    if (isPortfolioLoading || isTransactionsLoading) return <div className="p-8 text-center text-slate-500">Načítám data...</div>;
    if (!portfolio) return <div className="p-8 text-center text-red-500">Portfolio nenalezeno.</div>;

    return (
        <div className="mx-auto max-w-7xl p-8">
            <div className="mb-8">
                <Link href="/portfolios" className="mb-4 inline-block text-sm text-indigo-600 hover:underline">
                    &larr; Zpět na všechna portfolia
                </Link>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{portfolio.name}</h1>
                        <p className="mt-1 text-slate-500">Detailní přehled tvých transakcí a aktuálních hodnot.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={createManyTransactions.isPending} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                            {createManyTransactions.isPending ? "Importuji..." : "📁 Import CSV"}
                        </button>
                        <button onClick={() => setIsCreateModalOpen(true)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                            + Nová transakce
                        </button>
                    </div>
                </div>
            </div>

            {/* --- FIALOVÁ KARTA S PŘEPÍNAČEM MĚN --- */}
            {holdings.length > 0 && (
                <div className="mb-8 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between">
                    <div>
                        <p className="text-indigo-100 text-sm font-medium mb-1">Aktuální hodnota portfolia</p>
                        <div className="flex items-end gap-3">
                            <h2 className="text-4xl font-bold tracking-tight">
                                {totalValue.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })}
                            </h2>
                            <span className="text-xl font-medium text-indigo-200 mb-1">{displayCurrency}</span>
                        </div>
                        {isPricesLoading && <p className="text-indigo-200 text-xs mt-2 animate-pulse">Aktualizuji data z burzy...</p>}
                    </div>
                    
                    {/* SELECT PRO VÝBĚR MĚNY */}
                    <div className="mt-4 sm:mt-0">
                        <label className="text-xs font-medium text-indigo-200 mr-2 uppercase tracking-wider">Zobrazit v:</label>
                        <select
                            value={displayCurrency}
                            onChange={(e) => setDisplayCurrency(e.target.value as any)}
                            className="rounded-lg border-none bg-white/20 px-4 py-2 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-white/50 cursor-pointer appearance-none"
                        >
                            <option value="CZK" className="text-slate-900">🇨🇿 CZK</option>
                            <option value="USD" className="text-slate-900">🇺🇸 USD</option>
                            <option value="EUR" className="text-slate-900">🇪🇺 EUR</option>
                            <option value="GBP" className="text-slate-900">🇬🇧 GBP</option>
                        </select>
                    </div>
                </div>
            )}

            {/* --- ZŮSTATKY --- */}
            <div className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-slate-900">Aktuální složení portfolia</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                    {holdings.map(({ symbol, quantity, currency }) => {
                        const rawPrice = livePrices?.[symbol];
                        
                        // Převod individuální ceny do vybrané měny
                        const rateAssetToUsd = exchangeRates?.[currency] || 1;
                        const rateUsdToDisplay = exchangeRates?.[displayCurrency] || 1;
                        const priceInDisplayCurrency = rawPrice ? (rawPrice / rateAssetToUsd) * rateUsdToDisplay : undefined;
                        
                        const assetValue = priceInDisplayCurrency ? quantity * priceInDisplayCurrency : 0;

                        return (
                            <div key={symbol} className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                                <span className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">{symbol}</span>
                                <span className="font-mono text-xl font-bold text-slate-900">
                                    {Number.isInteger(quantity) ? quantity : parseFloat(quantity.toFixed(6))}
                                    <span className="ml-1 text-xs font-normal text-slate-400">ks</span>
                                </span>
                                
                                <div className="mt-3 w-full border-t border-slate-100 pt-3">
                                    {isPricesLoading ? (
                                        <span className="text-xs text-slate-400 animate-pulse">Načítám...</span>
                                    ) : priceInDisplayCurrency ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500">Cena: {priceInDisplayCurrency.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} {displayCurrency}</span>
                                            <span className="mt-1 font-mono text-lg font-bold text-indigo-600">
                                                {assetValue.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} {displayCurrency}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-orange-400">Cena nenalezena</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tabulka (Zkráceno pro přehlednost, nech si tam tu svou stávající) */}
             <h2 className="mb-4 text-lg font-bold text-slate-900">Historie transakcí</h2>
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
                                <tr key={t.id} className="group transition-colors hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{t.date.toLocaleDateString("cs-CZ")}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${t.type === "BUY" ? "bg-green-50 text-green-700 ring-green-600/20" : "bg-red-50 text-red-700 ring-red-600/20"}`}>
                                            {t.type === "BUY" ? "NÁKUP" : "PRODEJ"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{t.assetSymbol}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-900">{t.quantity}</td>
                                    <td className="px-6 py-4 text-right font-mono">{t.pricePerUnit.toLocaleString("cs-CZ")}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{(t.quantity * t.pricePerUnit).toLocaleString("cs-CZ")}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button onClick={() => setEditingTransaction(t as any)} className="text-indigo-600 hover:text-indigo-900">✏️</button>
                                            <button onClick={() => setTransactionToDelete(t.id)} className="text-red-400 hover:text-red-700">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateTransactionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} initialData={editingTransaction} portfolioId={portfolioId} />
            <ConfirmModal isOpen={!!transactionToDelete} onClose={() => setTransactionToDelete(null)} onConfirm={() => { if (transactionToDelete) deleteTransaction.mutate({ id: transactionToDelete }); }} isLoading={deleteTransaction.isPending} title="Smazat transakci?" description="Tato akce je nevratná." />
        </div>
    );
}