"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CreatePortfolioModal } from "~/app/_components/CreatePortfolioModal";
import { ConfirmModal } from "~/app/_components/ConfirmModal";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type PortfolioData = {
    id: string;
    name: string;
};

export default function PortfoliosPage() {
    const router = useRouter();

    const utils = api.useUtils();

    // Stavy pro modály
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPortfolio, setEditingPortfolio] =
        useState<PortfolioData | null>(null);
    const [portfolioToDelete, setPortfolioToDelete] = useState<string | null>(
        null,
    );

    // Načtení dat ze serveru
    const { data: portfolios, isLoading } = api.portfolio.getAll.useQuery();

    const deletePortfolio = api.portfolio.delete.useMutation({
        onSuccess: () => {
            utils.portfolio.getAll.invalidate();
            router.refresh();
            toast.success("Portfolio smazáno 🗑️");
            setPortfolioToDelete(null);
        },
        onError: (error) => {
            toast.error(error.message || "Chyba při mazání");
            setPortfolioToDelete(null);
        },
    });

    const handleEdit = (e: React.MouseEvent, portfolio: PortfolioData) => {
        e.preventDefault(); // Zabrání tomu, abychom při kliku na tužku přešli na detail portfolia
        setEditingPortfolio({ id: portfolio.id, name: portfolio.name });
        setIsModalOpen(true);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // Zabrání prokliknutí
        setPortfolioToDelete(id);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPortfolio(null);
    };

    return (
        <div className="mx-auto max-w-7xl p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Moje Portfolia
                    </h1>
                    <p className="mt-1 text-slate-500">
                        Spravuj své investice na jednom místě.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                    + Založit portfolio
                </button>
            </div>

            {isLoading && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-40 animate-pulse rounded-xl bg-slate-100"
                        />
                    ))}
                </div>
            )}

            {!isLoading && portfolios && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {portfolios.length === 0 ? (
                        <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                            <div className="mb-3 text-4xl">💼</div>
                            <h3 className="text-lg font-medium text-slate-900">
                                Zatím žádná portfolia
                            </h3>
                            <p className="mb-4 text-slate-500">
                                Vytvoř si své první investiční portfolio.
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="font-semibold text-indigo-600 hover:underline"
                            >
                                Vytvořit portfolio
                            </button>
                        </div>
                    ) : (
                        portfolios.map((portfolio) => (
                            <Link
                                key={portfolio.id}
                                href={`/portfolios/${portfolio.id}`}
                                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                            >
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-xl text-indigo-600">
                                            📊
                                        </div>
                                        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                onClick={(e) =>
                                                    handleEdit(e, portfolio)
                                                }
                                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-indigo-600"
                                                title="Upravit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={(e) =>
                                                    handleDelete(
                                                        e,
                                                        portfolio.id,
                                                    )
                                                }
                                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-red-600"
                                                title="Smazat"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 transition group-hover:text-indigo-600">
                                        {portfolio.name}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Vytvořeno{" "}
                                        {portfolio.createdAt.toLocaleDateString(
                                            "cs-CZ",
                                        )}
                                    </p>
                                </div>

                                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                        {portfolio._count.transactions}{" "}
                                        Transakcí
                                    </span>
                                    <span className="translate-x-2 transform text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:translate-x-0 group-hover:opacity-100">
                                        Otevřít &rarr;
                                    </span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            )}

            <CreatePortfolioModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                initialData={editingPortfolio}
            />

            <ConfirmModal
                isOpen={!!portfolioToDelete}
                onClose={() => setPortfolioToDelete(null)}
                onConfirm={() => {
                    if (portfolioToDelete) {
                        deletePortfolio.mutate({ id: portfolioToDelete });
                    }
                }}
                isLoading={deletePortfolio.isPending}
                title="Smazat portfolio?"
                description="Opravdu chcete smazat toto portfolio? Všechny transakce v něm budou nenávratně ztraceny."
            />
        </div>
    );
}
