export function formatCurrency(amount: number): string {
  return `GHS ${amount.toFixed(2)}`;
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000) {
    return `GHS ${(amount / 1000).toFixed(1)}k`;
  }
  return `GHS ${amount.toFixed(2)}`;
}
