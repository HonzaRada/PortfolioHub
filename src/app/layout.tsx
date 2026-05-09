import "src/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "react-hot-toast";

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
            <body className="bg-slate-50 text-slate-900 antialiased">
                <TRPCReactProvider>
                    {children}
                    <Toaster position="top-right" />
                </TRPCReactProvider>
            </body>
        </html>
    );
}