import { Sidebar } from "~/app/_components/Sidebar";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-64">{children}</div>
    </div>
  );
}
