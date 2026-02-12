"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export function CreateTransactionModal({ isOpen, onClose }: Props) {
    const router = useRouter();

    const [formData, setFormData] = useState({
        assetSymbol: "",
        quantity: "",
        pricePerUnit: "",
        type: "BUY" as "BUY" | "SELL",
    });

    const createTransaction = api.transaction.create.useMutation({
        onSuccess: () => {
            router.refresh();
            onClose();
            setFormData({
                assetSymbol: "",
                quantity: "",
                pricePerUnit: "",
                type: "BUY",
            });
            toast.success("Transakce uložena! 🚀");
        },
        onError: (error) => {
            const message = error.data?.zodError?.fieldErrors
                ? Object.values(error.data.zodError.fieldErrors)[0]?.[0]
                : error.message;
            toast.error(message || "Něco se pokazilo.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const errors: string[] = [];
        if (!formData.assetSymbol) errors.push("Prosím vyplňte ticker");
        if (!formData.quantity) errors.push("Prosím vyplňte množství");
        if (Number(formData.quantity) <= 0) errors.push("Množství musí být větší než 0");
        if (!formData.pricePerUnit) errors.push("Prosím vyplňte cenu");
        if (Number(formData.pricePerUnit) < 0) errors.push("Cena nesmí být záporná");

        if (errors.length > 0) {
            toast.error(errors[0] ?? "Neznámá chyba");
            return;
        }

        createTransaction.mutate({
            assetSymbol: formData.assetSymbol,
            type: formData.type,
            quantity: Number(formData.quantity),
            pricePerUnit: Number(formData.pricePerUnit),
            date: new Date(),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="mb-6 text-xl font-bold text-slate-900">
                    Nová Transakce
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Ticker (např. AAPL)
                        </label>
                        <input
                            type="text"
                            placeholder="AAPL"
                            value={formData.assetSymbol}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    assetSymbol: e.target.value,
                                })
                            }
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Množství
                            </label>
                            <input
                                type="number"
                                step="any"
                                placeholder="10"
                                value={formData.quantity}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        quantity: e.target.value,
                                    })
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Cena za kus
                            </label>
                            <input
                                type="number"
                                step="any"
                                placeholder="150.50"
                                value={formData.pricePerUnit}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        pricePerUnit: e.target.value,
                                    })
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 rounded-lg bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() =>
                                setFormData({ ...formData, type: "BUY" })
                            }
                            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                                formData.type === "BUY"
                                    ? "bg-white text-green-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            Nákup
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setFormData({ ...formData, type: "SELL" })
                            }
                            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                                formData.type === "SELL"
                                    ? "bg-white text-red-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            Prodej
                        </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            disabled={createTransaction.isPending}
                            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                        >
                            {createTransaction.isPending
                                ? "Ukládám..."
                                : "Uložit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
