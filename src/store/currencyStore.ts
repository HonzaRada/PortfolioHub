import { create } from "zustand";
import { persist } from "zustand/middleware";

type Currency = "CZK" | "USD" | "EUR" | "GBP";

interface CurrencyStore {
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => void;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      displayCurrency: "CZK",
      setDisplayCurrency: (currency: Currency) =>
        set({ displayCurrency: currency }),
    }),
    {
      name: "currency-store",
    },
  ),
);
