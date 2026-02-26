import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
// Přidáme import tvé komponenty
import { GuestView } from "~/app/_components/GuestView";

export default async function HomePage() {
  // Zjistíme, jestli je uživatel přihlášený
  const session = await auth();

  // Pokud ANO, přesměrujeme ho rovnou na jeho Dashboard
  if (session) {
    redirect("/dashboard");
  }

  // Pokud NE, vyrenderujeme tvou externí komponentu
  return <GuestView />;
}