import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
// 1. Importujeme Auth Provider (ujisti se, že ten soubor existuje - viz níže)
import { NextAuthProvider } from "~/app/_components/NextAuthProvider";

export const metadata: Metadata = {
  title: "Investiční Portfolio",
  description: "Správa investic pro Bakalářskou práci",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" className={`${geist.variable}`}>
      {/* 2. Tady přidáváme barvy: bg-slate-50 (světlé pozadí) a text-slate-900 (tmavý text) */}
      <body className="bg-slate-50 text-slate-900 antialiased">
        {/* 3. Obalíme aplikaci, aby všude fungovalo přihlášení */}
        <NextAuthProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}