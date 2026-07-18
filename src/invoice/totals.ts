export type InvoiceItemInput = {
  description: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
};

export type InvoiceItemTotal = InvoiceItemInput & {
  subtotal: number;
  taxAmount: number;
  total: number;
};

export type InvoiceTotals = {
  items: InvoiceItemTotal[];
  subtotal: number;
  taxAmount: number;
  total: number;
};

function roundYen(value: number): number {
  return Math.round(value);
}

export function calculateItemTotal(item: InvoiceItemInput): InvoiceItemTotal {
  const subtotal = roundYen(item.unitPrice * item.quantity);
  const taxAmount = roundYen(subtotal * item.taxRate);

  return {
    ...item,
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

export function calculateTotals(items: InvoiceItemInput[]): InvoiceTotals {
  const itemTotals = items.map(calculateItemTotal);
  const subtotal = itemTotals.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = itemTotals.reduce((sum, item) => sum + item.taxAmount, 0);

  return {
    items: itemTotals,
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

export function formatYen(value: number, language: "ja" | "en" = "ja"): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}
