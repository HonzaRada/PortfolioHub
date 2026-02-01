import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  // 1. ZÍSKÁNÍ DAT
  // Zavoláme backend a počkáme na data.
  // Díky 'await' se stránka vyrenderuje na serveru už s daty (SEO friendly).
  const transactions = await api.transaction.getAll();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          
          {/* Nadpis a tlačítko */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-800">
              📊 Moje Portfolio
            </h1>
            <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              + Nová transakce
            </button>
          </div>

          {/* Tabulka s daty */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
            <table className="w-full text-left text-sm text-slate-600">
              
              {/* Hlavička tabulky */}
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Datum</th>
                  <th className="px-6 py-4">Typ</th>
                  <th className="px-6 py-4">Aktivum</th>
                  <th className="px-6 py-4 text-right">Množství</th>
                  <th className="px-6 py-4 text-right">Cena/ks</th>
                  <th className="px-6 py-4 text-right">Celkem</th>
                </tr>
              </thead>

              {/* Tělo tabulky */}
              <tbody className="divide-y divide-slate-100">
                {/* Podmínka: Pokud nejsou data, zobraz zprávu */}
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Zatím nemáš žádné transakce.
                    </td>
                  </tr>
                ) : (
                  // Cyklus: Pokud data jsou, vypiš řádek pro každou transakci
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        {t.date.toLocaleDateString("cs-CZ")}
                      </td>
                      <td className="px-6 py-4">
                        {/* Podmíněné stylování pro Nákup (zelená) / Prodej (červená) */}
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            t.type === "BUY"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {t.type === "BUY" ? "NÁKUP" : "PRODEJ"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {t.assetSymbol}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {Number(t.quantity)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {Number(t.pricePerUnit).toLocaleString("cs-CZ")} Kč
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        {/* Výpočet celkové ceny (Množství * Cena) */}
                        {(Number(t.quantity) * Number(t.pricePerUnit)).toLocaleString("cs-CZ")} Kč
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}