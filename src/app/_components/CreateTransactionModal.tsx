"use client";

import { useEffect } from "react";
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
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  initialData?: TransactionData | null;
};

// 1. Zod schéma s našimi vlastními chybovými hláškami
const formSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  assetSymbol: z.string().min(1, "Zadejte symbol aktiva (např. AAPL, BTC)"),
  // z.coerce automaticky převede text z inputu na číslo
  quantity: z.coerce
    .number({ invalid_type_error: "Zadejte platné číslo" })
    .positive("Množství musí být větší než 0"),
  pricePerUnit: z.coerce
    .number({ invalid_type_error: "Zadejte platné číslo" })
    .positive("Cena musí být větší než 0"),
  date: z.string().min(1, "Vyberte datum transakce"),
});

type FormData = z.infer<typeof formSchema>;

export function CreateTransactionModal({ isOpen, onClose, portfolioId, initialData }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  // 2. Předvyplnění a čištění formuláře (včetně chyb)
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          type: initialData.type,
          assetSymbol: initialData.assetSymbol,
          quantity: initialData.quantity,
          pricePerUnit: initialData.pricePerUnit,
          // Převedeme Date objekt na formát YYYY-MM-DD pro input type="date"
          date: new Date(initialData.date).toISOString().split("T")[0],
        });
      } else {
        reset({
          type: "BUY",
          assetSymbol: "",
          quantity: undefined as unknown as number, // Trik pro prázdné políčko místo nuly
          pricePerUnit: undefined as unknown as number,
          date: new Date().toISOString().split("T")[0], // Dnešní datum
        });
      }
    } else {
      reset(); // Vyčistí vše po zavření
    }
  }, [isOpen, initialData, reset]);

  const createTransaction = api.transaction.create.useMutation({
    onSuccess: () => {
      utils.transaction.getAll.invalidate();
      router.refresh();
      onClose();
      toast.success("Transakce přidána!");
    },
    onError: (error) => toast.error("Chyba serveru: " + error.message),
  });

  const updateTransaction = api.transaction.update.useMutation({
    onSuccess: () => {
      utils.transaction.getAll.invalidate();
      router.refresh();
      onClose();
      toast.success("Transakce upravena! ✏️");
    },
    onError: (error) => toast.error("Chyba serveru: " + error.message),
  });

  const onSubmit = (data: FormData) => {
    // Backend očekává Date objekt, takže textový datum z inputu převedeme zpět
    const submissionData = {
      ...data,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          {initialData ? "Upravit transakci" : "Nová transakce"}
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Typ transakce */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Typ</label>
              <select
                {...register("type")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              >
                <option value="BUY">Nákup</option>
                <option value="SELL">Prodej</option>
              </select>
            </div>

            {/* Datum */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Datum</label>
              <input
                type="date"
                {...register("date")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
              {errors.date && <p style={{ color: "red" }} className="text-xs mt-1 ml-1">{errors.date.message}</p>}
            </div>
          </div>

          {/* Aktivum */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Symbol aktiva</label>
            <input
              {...register("assetSymbol")}
              placeholder="Např. BTC, AAPL, VWCE"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition uppercase"
            />
            {errors.assetSymbol && <p style={{ color: "red" }} className="text-xs mt-1 ml-1">{errors.assetSymbol.message}</p>}
          </div>

          {/* Množství a Cena */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Množství</label>
              <input
                type="number"
                step="any" // Povolí desetinná čísla (např. u krypta)
                {...register("quantity")}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
              {errors.quantity && <p style={{ color: "red" }} className="text-xs mt-1 ml-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cena za kus (Kč)</label>
              <input
                type="number"
                step="any"
                {...register("pricePerUnit")}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
              {errors.pricePerUnit && <p style={{ color: "red" }} className="text-xs mt-1 ml-1">{errors.pricePerUnit.message}</p>}
            </div>
          </div>

          {/* Tlačítka */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isPending}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 transition"
            >
              {isPending ? "Ukládám..." : "Uložit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}