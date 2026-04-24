import { Sidebar } from "~/app/_components/Sidebar";
import { auth } from "~/server/auth"; 
import { redirect } from "next/navigation";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-64">
        {children}
      </div>
    </div>
  );
}