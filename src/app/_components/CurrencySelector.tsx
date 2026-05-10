"use client";

import React from "react";

type Currency = "CZK" | "USD" | "EUR" | "GBP";

interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  label?: boolean;
}

const currencies: Array<{ code: Currency; flag: string }> = [
  { code: "CZK", flag: "🇨🇿" },
  { code: "USD", flag: "🇺🇸" },
  { code: "EUR", flag: "🇪🇺" },
  { code: "GBP", flag: "🇬🇧" },
];

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  label = true,
}) => {
  return (
    <div className="flex items-center">
      {label && (
        <label className="mr-2 text-xs font-medium tracking-wider text-slate-600 uppercase">
          Zobrazit v:
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Currency)}
        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {currencies.map(({ code, flag }) => (
          <option key={code} value={code}>
            {flag} {code}
          </option>
        ))}
      </select>
    </div>
  );
};
