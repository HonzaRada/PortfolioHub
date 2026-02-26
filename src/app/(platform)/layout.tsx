import { Sidebar } from "~/app/_components/Sidebar";
import { auth } from "~/server/auth"; 
import { redirect } from "next/navigation";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ZMĚNA: Voláme funkci auth()
  const session = await auth();

  // Pokud uživatel není přihlášen, přesměrujeme ho na přihlášení
  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar - pevná šířka 64 (256px) */}
      <Sidebar />

      {/* Hlavní obsah - odsazený o šířku sidebaru (ml-64) */}
      <div className="ml-64">
        {children}
      </div>
    </div>
  );
}