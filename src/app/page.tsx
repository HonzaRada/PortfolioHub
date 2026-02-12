import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { GuestView } from "./_components/GuestView";
import { DashboardView } from "./_components/DashboardView";

export default async function Home() {
    const session = await auth();

    if (!session?.user) {
        return <GuestView />;
    }

    // 1. Fetch the raw data (contains "Decimal" objects)
    const rawTransactions = await api.transaction.getAll();

    // 2. Convert "Decimal" to simple "numbers"
    const transactions = rawTransactions.map((t) => ({
        ...t,
        quantity: t.quantity.toNumber(), // Convert Quantity
        pricePerUnit: t.pricePerUnit.toNumber(), // Convert Price
        fees: t.fees ? t.fees.toNumber() : 0, // Convert Fees (handle null)
    }));

    return (
        <HydrateClient>
            <DashboardView
                transactions={transactions}
                userName={session.user.name}
            />
        </HydrateClient>
    );
}
