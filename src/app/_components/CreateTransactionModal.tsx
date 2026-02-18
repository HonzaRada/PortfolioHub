"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

// 1. Validace formuláře s rozlišením chyb
const formSchema = z.object({
    assetSymbol: z.string().min(1, "Prosím vyplňte Ticker (např. AAPL)"),
    quantity: z.coerce
        .number()
        .refine((val) => val >= 0, { message: "Množství nesmí být záporné" })
        .refine((val) => val > 0, { message: "Prosím vyplňte množství" }),
    pricePerUnit: z.coerce
        .number()
        .refine((val) => val >= 0, { message: "Cena nesmí být záporná" })
        .refine((val) => val > 0, { message: "Prosím vyplňte cenu" }),
    type: z.enum(["BUY", "SELL"]),
});

type FormData = z.infer<typeof formSchema>;

export function CreateTransactionModal({ isOpen, onClose }: Props) {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        reset,
        formState: { isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "BUY",
            assetSymbol: "",
            quantity: undefined,
            pricePerUnit: undefined,
        },
    });

    const createTransaction = api.transaction.create.useMutation({
        onSuccess: () => {
            router.refresh();
            onClose();
            reset();
            toast.success("Transakce uložena! 🚀");
        },
        // 2. ÚPRAVA ZPRACOVÁNÍ CHYB ZE SERVERU
        // Pokud by náhodou nějaká chyba prošla až na server, tady ji "učesáme"
        onError: (error) => {
            const zodErrorMessages = error.data?.zodError?.fieldErrors;
            if (zodErrorMessages) {
                // Pokud je to chyba validace ze serveru, vezmeme první zprávu
                const firstMessage = Object.values(zodErrorMessages)[0]?.[0];
                toast.error(firstMessage || "Chyba validace dat");
            } else {
                // Jinak zobrazíme obecnou zprávu (ošetříme ten ošklivý JSON)
                toast.error(error.message || "Něco se pokazilo");
            }
        },
    });

    const onSubmit = (data: FormData) => {
        createTransaction.mutate({
            ...data,
            date: new Date(),
        });
    };

    const onError = (errors: any) => {
        const firstErrorKey = Object.keys(errors)[0];
        if (firstErrorKey) {
            toast.error(
                errors[firstErrorKey]?.message || "Zkontrolujte formulář",
            );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="mb-6 text-xl font-bold text-slate-900">
                    Nová Transakce
                </h2>

                <form
                    onSubmit={handleSubmit(onSubmit, onError)}
                    className="space-y-5"
                >
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Ticker (např. AAPL)
                        </label>
                        <input
                            {...register("assetSymbol")}
                            placeholder="AAPL"
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
                                {...register("quantity")}
                                placeholder="10"
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
                                {...register("pricePerUnit")}
                                placeholder="150.50"
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 rounded-lg bg-slate-100 p-1">
                        <label
                            className={`flex-1 cursor-pointer rounded-md py-2 text-center text-sm font-medium text-slate-500 transition hover:text-slate-700 has-[:checked]:bg-white has-[:checked]:text-green-700 has-[:checked]:shadow-sm`}
                        >
                            <input
                                type="radio"
                                value="BUY"
                                {...register("type")}
                                className="hidden"
                            />
                            Nákup
                        </label>

                        <label
                            className={`flex-1 cursor-pointer rounded-md py-2 text-center text-sm font-medium text-slate-500 transition hover:text-slate-700 has-[:checked]:bg-white has-[:checked]:text-red-700 has-[:checked]:shadow-sm`}
                        >
                            <input
                                type="radio"
                                value="SELL"
                                {...register("type")}
                                className="hidden"
                            />
                            Prodej
                        </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                reset();
                                onClose();
                            }}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            disabled={
                                isSubmitting || createTransaction.isPending
                            }
                            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                        >
                            {isSubmitting || createTransaction.isPending
                                ? "Ukládám..."
                                : "Uložit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
