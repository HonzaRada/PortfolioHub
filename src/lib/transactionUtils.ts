/**
 * Vypočítá aktuální zůstatek aktiva na základě seznamu transakcí
 */
export function calculateBalance(
  transactions: { type: string; quantity: number }[]
): number {
  return transactions.reduce((acc, tx) => {
    return tx.type === "BUY" ? acc + tx.quantity : acc - tx.quantity;
  }, 0);
}