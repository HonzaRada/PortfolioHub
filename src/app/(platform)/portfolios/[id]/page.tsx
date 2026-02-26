"use client";

import { useState } from "react";
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
};

export default function PortfolioDetailPage() {
    // Získáme ID portfolia z URL adresy (/portfolios/123 -> id je "123")
    const params = useParams();
    const portfolioId = params.id as string;
    const router = useRouter();

    const utils = api.useUtils();

    // Načteme data portfolia
    const { data: portfolio, isLoading: isPortfolioLoading } = api.portfolio.getById.useQuery({ id: portfolioId });
    
    // Načteme transakce JEN pro toto portfolio
    const { data: transactions, isLoading: isTransactionsLoading } = api.transaction.getAll.useQuery({ portfolioId });

    // Stavy pro modály
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionData | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

    const deleteTransaction = api.transaction.delete.useMutation({
        onSuccess: () => {
            utils.transaction.getAll.invalidate();
            router.refresh();
            toast.success("Transakce smazána 🗑️");
            setTransactionToDelete(null);
        },
        onError: (error) => {
            toast.error(error.message || "Chyba při mazání");
            setTransactionToDelete(null);
        },
    });

    const handleEdit = (t: TransactionData) => {
        setEditingTransaction(t);
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingTransaction(null);
    };

    if (isPortfolioLoading || isTransactionsLoading) {
        return <div className="p-8 text-center text-slate-500">Načítám data portfolia...</div>;
    }

    if (!portfolio) {
        return <div className="p-8 text-center text-red-500">Portfolio nebylo nalezeno.</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/portfolios" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
                    &larr; Zpět na všechna portfolia
                </Link>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{portfolio.name}</h1>
                        <p className="text-slate-500 mt-1">Detailní přehled tvých transakcí v tomto portfoliu.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        + Nová transakce
                    </button>
                </div>
            </div>

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
                            {!transactions || transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
                                                📂
                                            </div>
                                            <p className="font-medium text-slate-900">Zatím žádné transakce</p>
                                            <p className="text-slate-500">Přidej první nákup nebo prodej do tohoto portfolia.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="transition-colors hover:bg-slate-50 group">
                                        <td className="px-6 py-4 font-medium text-slate-900">{t.date.toLocaleDateString("cs-CZ")}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${t.type === "BUY" ? "bg-green-50 text-green-700 ring-green-600/20" : "bg-red-50 text-red-700 ring-red-600/20"}`}>
                                                {t.type === "BUY" ? "NÁKUP" : "PRODEJ"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{t.assetSymbol}</td>
                                        <td className="px-6 py-4 text-right font-mono">{t.quantity}</td>
                                        <td className="px-6 py-4 text-right font-mono">{t.pricePerUnit.toLocaleString("cs-CZ")} Kč</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{(t.quantity * t.pricePerUnit).toLocaleString("cs-CZ")} Kč</td>
                                        
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button onClick={() => handleEdit(t as any)} className="text-indigo-600 hover:text-indigo-900" title="Upravit">✏️</button>
                                                <button onClick={() => setTransactionToDelete(t.id)} className="text-red-400 hover:text-red-700" title="Smazat">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateTransactionModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                initialData={editingTransaction}
                portfolioId={portfolioId} 
            />

            <ConfirmModal 
                isOpen={!!transactionToDelete}
                onClose={() => setTransactionToDelete(null)}
                onConfirm={() => {
                    if (transactionToDelete) deleteTransaction.mutate({ id: transactionToDelete });
                }}
                isLoading={deleteTransaction.isPending}
                title="Smazat transakci?"
                description="Tato akce je nevratná."
            />
        </div>
    );
}