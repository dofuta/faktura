import type { InvoiceDraft, InvoiceItem } from "./schema.js";

export type InvoiceItemTotal = InvoiceItem & {
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

export function calculateItemTotal(item: InvoiceItem): InvoiceItemTotal {
  const subtotal = roundYen(item.unitPrice * item.quantity);
  const taxAmount = roundYen(subtotal * item.taxRate);

  return {
    ...item,
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

export function calculateTotals(draft: InvoiceDraft): InvoiceTotals {
  const items = draft.items.map(calculateItemTotal);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);

  return {
    items,
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

export function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}
