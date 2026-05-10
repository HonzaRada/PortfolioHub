/**
 * Vypočítá aktuální zůstatek aktiva na základě seznamu transakcí.
 * Funkce přijímá jak JavaScript number tak Prisma Decimal objekt
 * a vždy vrací JavaScript number.
 */
export function calculateBalance(
  transactions: {
    type: string;
    quantity: { toNumber: () => number } | number;
  }[],
): number {
  return transactions.reduce((acc, tx) => {
    const qty =
      typeof tx.quantity === "number" ? tx.quantity : tx.quantity.toNumber();
    return tx.type === "BUY" ? acc + qty : acc - qty;
  }, 0);
}
