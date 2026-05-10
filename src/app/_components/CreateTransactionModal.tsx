"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type TransactionData = {
  id: string;
  date: Date;
  type: "BUY" | "SELL";
  assetSymbol: string;
  quantity: number;
  pricePerUnit: number;
  currency?: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  initialData?: TransactionData | null;
};

const formSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  assetSymbol: z.string().min(1, "Vyberte nebo zadejte symbol aktiva"),
  quantity: z.coerce
    .number({ invalid_type_error: "Zadejte platné číslo" })
    .positive("Množství musí být větší než 0"),
  pricePerUnit: z.coerce
    .number({ invalid_type_error: "Zadejte platné číslo" })
    .positive("Cena musí být větší než 0"),
  date: z.string().min(1, "Vyberte datum transakce"),
  currency: z.string().min(1, "Vyberte měnu"),
});

type FormData = z.infer<typeof formSchema>;

export function CreateTransactionModal({
  isOpen,
  onClose,
  portfolioId,
  initialData,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  // Načtení transakcí portfolia pro výpočet aktuálně držených aktiv
  const { data: transactions } = api.transaction.getAll.useQuery({
    portfolioId,
  });

  // Výpočet symbolů které uživatel aktuálně vlastní (pro výběr při prodeji)
  const ownedAssets = useMemo(() => {
    if (!transactions) return [];

    const balances = transactions.reduce(
      (acc, tx) => {
        const currentAmount = acc[tx.assetSymbol] || 0;
        acc[tx.assetSymbol] =
          currentAmount +
          (tx.type === "BUY" ? Number(tx.quantity) : -Number(tx.quantity));
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(balances)
      .filter(([_, qty]) => qty > 0.000001)
      .map(([symbol]) => symbol)
      .sort();
  }, [transactions]);

  // Při editaci existující transakce přidáme její symbol do seznamu i když ho uživatel už nevlastní
  const availableAssets = useMemo(() => {
    if (
      initialData?.assetSymbol &&
      !ownedAssets.includes(initialData.assetSymbol)
    ) {
      return [...ownedAssets, initialData.assetSymbol].sort();
    }
    return ownedAssets;
  }, [ownedAssets, initialData]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    clearErrors,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "BUY",
      currency: "USD",
    },
  });

  const currentType = watch("type");

  // Když se změní typ na PRODEJ a uživatel nic nemá, nebo má symbol, který nevlastní, vyčistíme políčko
  useEffect(() => {
    clearErrors();
    if (currentType === "SELL") {
      const currentSymbol = watch("assetSymbol");
      if (!availableAssets.includes(currentSymbol)) {
        setValue("assetSymbol", "");
      }
    }
  }, [currentType, availableAssets, setValue, watch]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          type: initialData.type,
          assetSymbol: initialData.assetSymbol,
          quantity: initialData.quantity,
          pricePerUnit: initialData.pricePerUnit,
          date: new Date(initialData.date).toISOString().split("T")[0],
          currency: initialData.currency ?? "USD",
        });
      } else {
        reset({
          type: "BUY",
          assetSymbol: "",
          quantity: "" as unknown as number,
          pricePerUnit: "" as unknown as number,
          date: new Date().toISOString().split("T")[0],
          currency: "USD",
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const createTransaction = api.transaction.create.useMutation({
    onSuccess: () => {
      utils.transaction.getAll.invalidate();
      utils.portfolio.getHoldingsWithStats.invalidate({ portfolioId });
      router.refresh();
      onClose();
      toast.success("Transakce přidána! ✅");
    },
    onError: (error) => toast.error("Chyba serveru: " + error.message),
  });

  const updateTransaction = api.transaction.update.useMutation({
    onSuccess: () => {
      utils.transaction.getAll.invalidate();
      utils.portfolio.getHoldingsWithStats.invalidate({ portfolioId });
      router.refresh();
      onClose();
      toast.success("Transakce upravena! ✏️");
    },
    onError: (error) => toast.error("Chyba serveru: " + error.message),
  });

  const onSubmit = (data: FormData) => {
    const submissionData = {
      ...data,
      currency: data.currency,
      date: new Date(data.date),
    };

    if (initialData) {
      updateTransaction.mutate({ id: initialData.id, ...submissionData });
    } else {
      createTransaction.mutate({ portfolioId, ...submissionData });
    }
  };

  if (!isOpen) return null;

  const isPending = createTransaction.isPending || updateTransaction.isPending;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          {initialData ? "Upravit transakci" : "Nová transakce"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Typ
              </label>
              <input type="hidden" {...register("type")} />

              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setValue("type", "BUY")}
                  className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-all ${
                    currentType === "BUY"
                      ? "bg-white text-green-500 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Nákup
                </button>
                <button
                  type="button"
                  onClick={() => setValue("type", "SELL")}
                  className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-all ${
                    currentType === "SELL"
                      ? "bg-white text-red-600 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Prodej
                </button>
              </div>
            </div>

            {/* Datum */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Datum
              </label>
              <input
                type="date"
                {...register("date")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <p className="mt-1 ml-1 min-h-4 text-xs text-red-500">
                {errors.date?.message ?? "\u00A0"}
              </p>
            </div>
          </div>

          {/* Aktivum (Dynamické vykreslení podle typu) */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Symbol aktiva
            </label>

            {currentType === "BUY" ? (
              <input
                {...register("assetSymbol")}
                placeholder="Např. BTC, AAPL, VWCE"
                className="h-10 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 uppercase transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            ) : availableAssets.length > 0 ? (
              <select
                {...register("assetSymbol")}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 uppercase transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">-- Vyberte k prodeji --</option>
                {availableAssets.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 italic">
                Zatím nevlastníte žádná aktiva k prodeji.
              </div>
            )}
            <p className="mt-1 ml-1 min-h-4 text-xs text-red-500">
              {errors.assetSymbol?.message ?? "\u00A0"}
            </p>
          </div>

          {/* Množství a Cena s měnou */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Množství
              </label>
              <input
                type="number"
                step="any"
                {...register("quantity")}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <p className="mt-1 ml-1 min-h-4 text-xs text-red-500">
                {errors.quantity?.message ?? "\u00A0"}
              </p>
            </div>
          </div>

          {/* Cena a Měna */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Cena za kus
              </label>
              <input
                type="number"
                step="any"
                {...register("pricePerUnit")}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <p className="mt-1 ml-1 min-h-4 text-xs text-red-500">
                {errors.pricePerUnit?.message ?? "\u00A0"}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Měna
              </label>
              <select
                {...register("currency")}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CZK">CZK</option>
                <option value="GBP">GBP</option>
                <option value="HKD">HKD</option>
              </select>
              <p className="mt-1 ml-1 min-h-4 text-xs text-red-500">
                {errors.currency?.message ?? "\u00A0"}
              </p>
            </div>
          </div>

          {/* Tlačítka */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isPending ||
                (currentType === "SELL" && availableAssets.length === 0)
              }
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50"
            >
              {isPending ? "Ukládám..." : "Uložit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
