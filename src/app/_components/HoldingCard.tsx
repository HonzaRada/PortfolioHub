'use client';

import React, { useMemo } from 'react';

interface HoldingCardProps {
  symbol: string;
  quantity: number;
  currency: string;
  displayCurrency: string;
  livePrice?: number;
  isLoading?: boolean;
  exchangeRates?: Record<string, number>;
}

export const HoldingCard: React.FC<HoldingCardProps> = ({
  symbol,
  quantity,
  currency,
  displayCurrency,
  livePrice,
  isLoading = false,
  exchangeRates = {},
}) => {
  const { priceInDisplayCurrency, assetValue } = useMemo(() => {
    if (!livePrice) {
      return { priceInDisplayCurrency: undefined, assetValue: 0 };
    }

    const rateAssetToUsd = exchangeRates[currency] || 1;
    const rateUsdToDisplay = exchangeRates[displayCurrency] || 1;
    const price = (livePrice / rateAssetToUsd) * rateUsdToDisplay;

    return {
      priceInDisplayCurrency: price,
      assetValue: quantity * price,
    };
  }, [livePrice, currency, displayCurrency, exchangeRates, quantity]);

  const displayQuantity = Number.isInteger(quantity) ? quantity : parseFloat(quantity.toFixed(6));

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <span className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
        {symbol}
      </span>
      <span className="font-mono text-xl font-bold text-slate-900">
        {displayQuantity}
        <span className="ml-1 text-xs font-normal text-slate-400">ks</span>
      </span>

      <div className="mt-3 w-full border-t border-slate-100 pt-3">
        {isLoading ? (
          <span className="text-xs text-slate-400 animate-pulse">Načítám...</span>
        ) : priceInDisplayCurrency ? (
          <div className="flex flex-col">
            <span className="text-xs text-slate-500">
              Cena: {priceInDisplayCurrency.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} {displayCurrency}
            </span>
            <span className="mt-1 font-mono text-lg font-bold text-indigo-600">
              {assetValue.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} {displayCurrency}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-orange-400">Cena nenalezena</span>
        )}
      </div>
    </div>
  );
};
