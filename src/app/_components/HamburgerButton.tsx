"use client";

import { useSidebarStore } from "~/store/sidebarStore";

export function HamburgerButton() {
  const { toggleMobile } = useSidebarStore();

  return (
    <button
      onClick={toggleMobile}
      className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors"
    >
      <span className="block h-0.5 w-6 bg-slate-600"></span>
      <span className="block h-0.5 w-6 bg-slate-600"></span>
      <span className="block h-0.5 w-6 bg-slate-600"></span>
    </button>
  );
}