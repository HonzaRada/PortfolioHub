import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { GuestView } from "./_components/GuestView";
import { DashboardView } from "./_components/DashboardView";

export default async function Home() {
  // 1. Zjistíme na serveru, jestli je uživatel přihlášený
  const session = await auth();

  // 2. Pokud NENÍ přihlášený -> Vrátíme Guest Page
  if (!session?.user) {
    return <GuestView />;
  }

  // 3. Pokud JE přihlášený -> Načteme data a vrátíme Dashboard
  // Díky tomu, že jsme uvnitř "if session", víme, že protectedProcedure projde
  const transactions = await api.transaction.getAll();

  return (
    <HydrateClient>
      <DashboardView 
        transactions={transactions} 
        userName={session.user.name} 
      />
    </HydrateClient>
  );
}