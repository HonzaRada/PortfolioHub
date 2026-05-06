import { Sidebar } from "~/app/_components/Sidebar";
import { HamburgerButton } from "~/app/_components/HamburgerButton";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:ml-64">
        <div className="flex h-16 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
          <HamburgerButton />
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold ml-3 mr-2">
            P
          </div>
          <span className="text-lg font-bold text-slate-900">PortfolioHub</span>
        </div>
        {children}
      </div>
    </div>
  );
}