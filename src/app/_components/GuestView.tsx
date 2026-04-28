"use client";

import { useRouter } from "next/navigation";

export function GuestView() {
    const router = useRouter();
    return (
        <div className="flex min-h-screen flex-col bg-white">
            {/* 1. Navigační lišta (jednoduchá) */}
            <header className="border-b border-slate-100 py-4">
                <div className="container mx-auto flex items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        {/* Tady může být později logo */}
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
                            P
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">
                            Portfolio
                        </span>
                    </div>
                    <button
                        onClick={() => router.push("/login")}
                        className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
                    >
                        Přihlásit se
                    </button>
                </div>
            </header>

            {/* 2. Hero Sekce (Hlavní obsah) */}
            <main className="flex flex-1 items-center">
                <div className="container mx-auto grid grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
                    {/* Levá část: Text */}
                    <div className="flex flex-col justify-center space-y-8">
                        <div className="space-y-4">
                            <span className="inline-block rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-600">
                                Verze pro Bakalářskou práci 🎓
                            </span>
                            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                                Investujte chytře, <br />
                                <span className="text-indigo-600">
                                    sledujte jednoduše.
                                </span>
                            </h1>
                            <p className="max-w-lg text-lg leading-relaxed text-slate-600">
                                Měj všechny své akcie, kryptoměny a ETF na
                                jednom místě. Přehledné statistiky, historie
                                transakcí a bezpečné uložení dat.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row">
                            <button
                                onClick={() => router.push("/login")}
                                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-indigo-200"
                            >
                                Začít zdarma
                                <svg
                                    className="ml-2 h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                                    />
                                </svg>
                            </button>
                            <a
                                href="#features"
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                            >
                                Jak to funguje?
                            </a>
                        </div>

                        <div className="flex items-center gap-4 pt-4 text-sm text-slate-500">
                            <div className="flex -space-x-2">
                                {/* Falešní avataři pro "social proof" */}
                                <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-200"></div>
                                <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-300"></div>
                                <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-400"></div>
                            </div>
                            <p>Připoj se k ostatním investorům.</p>
                        </div>
                    </div>

                    {/* Pravá část: Vizuál (Zatím placeholder) */}
                    <div className="relative hidden lg:block">
                        {/* Dekorativní prvek na pozadí */}
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-[500px] w-[500px] rounded-full bg-indigo-50/50 blur-3xl"></div>

                        {/* Karta s ukázkou */}
                        <div className="relative rotate-0 rounded-2xl border border-slate-100 bg-white p-8 shadow-2xl transition-transform duration-500 hover:rotate-2">
                            <div className="mb-8 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800">
                                    Moje Portfolio
                                </h3>
                                <span className="text-sm font-bold text-green-500">
                                    +12.5% 📈
                                </span>
                            </div>
                            {/* Falešný graf (jen čáry) */}
                            <div className="space-y-4">
                                <div className="h-3 w-3/4 rounded bg-slate-100"></div>
                                <div className="h-3 w-1/2 rounded bg-slate-100"></div>
                                <div className="flex h-32 w-full items-end justify-around rounded-lg border border-indigo-100 bg-indigo-50 p-2 pb-0">
                                    <div className="h-12 w-8 rounded-t bg-indigo-200"></div>
                                    <div className="h-20 w-8 rounded-t bg-indigo-300"></div>
                                    <div className="h-16 w-8 rounded-t bg-indigo-400"></div>
                                    <div className="h-24 w-8 rounded-t bg-indigo-500"></div>
                                    <div className="h-28 w-8 rounded-t bg-indigo-600"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* 3. Patička */}
            <footer className="border-t border-slate-100 bg-white py-8">
                <div className="container mx-auto px-6 text-center text-sm text-slate-500">
                    © 2026 Investiční Portfolio (Bakalářská práce). Všechna
                    práva vyhrazena.
                </div>
            </footer>
        </div>
    );
}
