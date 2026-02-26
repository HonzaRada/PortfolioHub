import { auth } from "~/server/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Uvítání */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">
          Vítej zpět, {session?.user?.name || "investore"}! 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Tohle je tvůj hlavní přehled. Brzy sem přidáme celkové statistiky tvých portfolií.
        </p>
      </div>

      {/* Tři prázdné karty jako zástupci pro budoucí statistiky */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Celková hodnota
          </h3>
          <p className="text-3xl font-bold text-slate-900">--- Kč</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Zisk / Ztráta
          </h3>
          <p className="text-3xl font-bold text-slate-900">--- Kč</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Aktivní portfolia
          </h3>
          <p className="text-3xl font-bold text-slate-900">---</p>
        </div>

      </div>

      {/* Místo pro budoucí graf */}
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
        <div className="text-4xl mb-4">📈</div>
        <p className="font-medium text-slate-700">Zde bude graf vývoje tvého majetku.</p>
        <p className="text-sm mt-1">Ale nejdřív si musíš založit portfolio a přidat nějaké transakce.</p>
      </div>
    </div>
  );
}