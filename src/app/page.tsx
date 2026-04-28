import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GuestView } from "~/app/_components/GuestView";
import { auth } from "~/lib/auth";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return <GuestView />;
}