/**
 * Mapování kódů burz z Interactive Brokers na přípony Yahoo Finance
 */
export const exchangeSuffixMap: Record<string, string> = {
  "IBIS": ".DE",
  "IBIS2": ".DE",
  "XETRA": ".DE",
  "GETTEX": ".DE",
  "LSE": ".L",
  "LSEETF": ".L",
  "LSEIOB1": ".IL",
  "SEHK": ".HK",
  "TSX": ".TO",
  "TSXV": ".V",
  "ASX": ".AX",
  "AEB": ".AS",
  "SBF": ".PA",
  "SIX": ".SW",
  "VSE": ".VI",
  "TYO": ".T",
  "OSL": ".OL",
  "PAXOS": "",
};

export function getYahooSymbol(assetSymbol: string, listingExchange: string): string {
  const suffix = exchangeSuffixMap[listingExchange.toUpperCase()] ?? "";
  return assetSymbol.replace(" ", ".") + suffix;
}