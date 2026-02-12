"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { CreateTransactionModal } from "./CreateTransactionModal";

type Transaction = {
    id: string;
    date: Date;
    type: "BUY" | "SELL";
    assetSymbol: string;
    quantity: { toString: () => string } | number;
    pricePerUnit: { toString: () => string } | number;
};

export function DashboardView({
    transactions,
    userName,
}: {
    transactions: Transaction[];
    userName?: string | null;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navigační lišta Dashboardu */}
            <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            P
                        </div>
                        <span>Portfolio</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="hidden text-sm font-medium text-slate-600 sm:block">
                            {userName}
                        </span>
                        <button
                            onClick={() => signOut()}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-red-600"
                        >
                            Odhlásit
                        </button>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl p-6 lg:p-8">
                {/* Hlavička sekce */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Přehled transakcí
                        </h1>
                        <p className="text-slate-500">
                            Zde vidíš historii všech svých investic.
                        </p>
                    </div>

                    {/* Tlačítko pro novou transakci (později ho oživíme) */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        + Nová transakce
                    </button>
                </div>

                {/* Karta s tabulkou */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Datum</th>
                                    <th className="px-6 py-4">Typ</th>
                                    <th className="px-6 py-4">Aktivum</th>
                                    <th className="px-6 py-4 text-right">
                                        Množství
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                        Cena/ks
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                        Celkem
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-16 text-center"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
                                                    📂
                                                </div>
                                                <p className="font-medium text-slate-900">
                                                    Zatím žádná data
                                                </p>
                                                <p className="text-slate-500">
                                                    Přidej svou první transakci
                                                    tlačítkem nahoře.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((t) => (
                                        <tr
                                            key={t.id}
                                            className="transition-colors hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {t.date.toLocaleDateString(
                                                    "cs-CZ",
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                        t.type === "BUY"
                                                            ? "bg-green-50 text-green-700 ring-green-600/20"
                                                            : "bg-red-50 text-red-700 ring-red-600/20"
                                                    }`}
                                                >
                                                    {t.type === "BUY"
                                                        ? "NÁKUP"
                                                        : "PRODEJ"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-800">
                                                {t.assetSymbol}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {Number(t.quantity)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {Number(
                                                    t.pricePerUnit,
                                                ).toLocaleString("cs-CZ")}{" "}
                                                Kč
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                                                {(
                                                    Number(t.quantity) *
                                                    Number(t.pricePerUnit)
                                                ).toLocaleString("cs-CZ")}{" "}
                                                Kč
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <CreateTransactionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            </main>
        </div>
    );
}
