/**
 * Vypočítá aktuální zůstatek aktiva na základě seznamu transakcí
 */
export function calculateBalance(
  transactions: { type: string; quantity: { toNumber: () => number } | number }[]
): number {
  return transactions.reduce((acc, tx) => {
    const qty = typeof tx.quantity === "number" ? tx.quantity : tx.quantity.toNumber();
    return tx.type === "BUY" ? acc + qty : acc - qty;
  }, 0);
}