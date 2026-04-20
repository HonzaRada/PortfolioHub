"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { signOut, useSession } from "next-auth/react";
import { useCurrencyStore } from "~/store/currencyStore";
import { CurrencySelector } from "~/app/_components/CurrencySelector";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { displayCurrency, setDisplayCurrency } = useCurrencyStore();
  const [isExporting, setIsExporting] = useState(false);

  // Query pro export dat (disabled na začátku)
  const { data: exportData, refetch: refetchExport } = api.transaction.exportAll.useQuery(undefined, {
    enabled: false,
  });

  // Mutation pro smazání všech dat
  const deleteAll = api.portfolio.deleteAll.useMutation({
    onSuccess: () => {
      toast.success("Všechna data byla smazána 🗑️");
      router.push("/portfolios");
    },
    onError: (error) => {
      toast.error("Chyba při mazání dat: " + error.message);
    },
  });

  const handleSignOut = async () => {
    if (window.confirm("Opravdu se chceš odhlásit?")) {
      await signOut({ callbackUrl: "/" });
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const { data } = await refetchExport();

      if (!data || data.length === 0) {
        toast.error("Nemáš žádná data k exportu");
        setIsExporting(false);
        return;
      }

      // Vytvoříme CSV header
      const header = ["Portfolio", "Date/Time", "Buy/Sell", "Symbol", "Quantity", "Price", "Currency"];

      // Vytvoříme CSV řádky
      const rows = data.map((row) => [
        `"${row.portfolioName}"`,
        row.date,
        row.type,
        row.assetSymbol,
        row.quantity.toString(),
        row.pricePerUnit.toString(),
        row.currency || "USD",
      ]);

      // Spojíme header a řádky
      const csv = [header, ...rows].map((row) => row.join(",")).join("\n");

      // Vytvoříme blob a downloadujeme
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `investicni-portfolio-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Data byla exportována ✅");
    } catch (error) {
      toast.error("Chyba při exportu dat");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (
      window.confirm(
        "⚠️ VAROVÁNÍ: Chystáš se smazat VŠECHNA portfolia a transakce. Tuto akci nelze vrátit. Opravdu pokračovat?"
      )
    ) {
      deleteAll.mutate();
    }
  };

  if (!session) {
    return <div className="p-8 text-center text-slate-500">Načítám...</div>;
  }

  const userInitial = session.user?.name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Nastavení</h1>
        <p className="mt-2 text-slate-500">Správa účtu a předvoleb.</p>
      </div>

      {/* Sekce 1 — Účet */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Účet</h2>

        <div className="flex items-center gap-4 mb-6">
          {session.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "Avatar"}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
              {userInitial}
            </div>
          )}

          <div>
            <p className="text-lg font-semibold text-slate-900">{session.user?.name}</p>
            <p className="text-sm text-slate-500">{session.user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
        >
          Odhlásit se
        </button>
      </div>

      {/* Sekce 2 — Preference */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Preference</h2>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">Výchozí měna</label>
          <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} label={false} />
          <p className="mt-2 text-sm text-slate-500">
            Tato měna se použije jako výchozí zobrazení na všech stránkách.
          </p>
        </div>
      </div>

      {/* Sekce 3 — Správa dat */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Správa dat</h2>

        <p className="mb-6 text-sm text-slate-500">Exportuj svá data nebo je kompletně smaž.</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? "Exportuji..." : "📥 Exportovat všechna data (CSV)"}
          </button>

          <button
            onClick={handleDeleteAll}
            disabled={deleteAll.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteAll.isPending ? "Mažu..." : "⚠️ Smazat všechna data"}
          </button>
        </div>
      </div>
    </div>
  );
}
