"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const handleOAuth = async (provider: "google" | "discord") => {
    setIsLoading(provider);
    await authClient.signIn.social({
      provider,
      callbackURL: "/dashboard",
    });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading("email");

    if (isRegister) {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: "/dashboard",
      });
      if (error) {
        setError(error.message ?? "Chyba při registraci");
        setIsLoading(null);
        return;
      }
    } else {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      });
      if (error) {
        setError(error.message ?? "Nesprávný email nebo heslo");
        setIsLoading(null);
        return;
      }
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg">
            P
          </div>
          <span className="text-2xl font-bold text-slate-900">PortfolioApp</span>
        </Link>

        {/* Chybová hláška z URL */}
        {urlError === "OAuthAccountNotLinked" && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            <p className="font-semibold mb-1">Účet již existuje</p>
            <p>Na tento email již existuje účet přihlášený přes jiného poskytovatele.</p>
          </div>
        )}

        {/* Karta */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {isRegister ? "Vytvořit účet" : "Přihlásit se"}
          </h1>
          <p className="text-slate-500 text-center text-sm mb-8">
            Vyber způsob přihlášení
          </p>

          {/* OAuth tlačítka */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => handleOAuth("google")}
              disabled={isLoading !== null}
              className="flex items-center justify-center gap-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoading === "google" ? "Přihlašuji..." : "Pokračovat s Google"}
            </button>

            <button
              onClick={() => handleOAuth("discord")}
              disabled={isLoading !== null}
              className="flex items-center justify-center gap-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              {isLoading === "discord" ? "Přihlašuji..." : "Pokračovat s Discord"}
            </button>
          </div>

          {/* Oddělovač */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400">nebo</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Email/heslo formulář */}
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            {isRegister && (
              <input
                type="text"
                placeholder="Jméno"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              placeholder="Heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading !== null}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading === "email" ? "Načítám..." : isRegister ? "Vytvořit účet" : "Přihlásit se"}
            </button>
          </form>

          {/* Přepínač registrace/přihlášení */}
          <p className="text-center text-sm text-slate-500 mt-4">
            {isRegister ? "Už máš účet?" : "Nemáš účet?"}{" "}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="text-indigo-600 font-semibold hover:underline"
            >
              {isRegister ? "Přihlásit se" : "Zaregistrovat se"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 Investiční Portfolio (Bakalářská práce)
        </p>
      </div>
    </div>
  );
}