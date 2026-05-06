"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarStore } from "~/store/sidebarStore";

export function Sidebar() {
  const pathname = usePathname();
  const { isMobileOpen, closeMobile } = useSidebarStore();

  const links = [
    { href: "/dashboard", label: "Domů", icon: "🏠" },
    { href: "/portfolios", label: "Portfolia", icon: "💼" },
  ];

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside className={`
        fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white flex flex-col
        transition-transform duration-300
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}>
        <div className="flex h-16 items-center px-6 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold mr-3">
            P
          </div>
          <span className="text-xl font-bold text-slate-900">PortfolioHub</span>
        </div>

        <nav className="flex flex-col gap-1 p-4 flex-1">
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase mb-2">Menu</p>
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Link
            href="/settings"
            onClick={closeMobile}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span>⚙️</span>
            Nastavení
          </Link>
        </div>
      </aside>
    </>
  );
}