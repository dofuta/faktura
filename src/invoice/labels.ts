export type InvoiceLanguage = "ja" | "en";
export type DocumentType = "invoice" | "quotation" | "delivery";

const commonLabels = {
  ja: {
    addresseeSuffix: " 御中",
    issueDate: "発行日",
    registrationNumber: "登録番号",
    subject: "件名",
    description: "品目",
    unitPrice: "単価",
    quantity: "数量",
    taxRate: "税率",
    lineSubtotal: "小計",
    lineTax: "税額",
    lineTotal: "合計",
    subtotal: "小計",
    tax: "消費税",
    total: "合計",
    bankInfo: "振込先",
    notes: "備考",
    draft: "下書き",
  },
  en: {
    addresseeSuffix: "",
    issueDate: "Issue Date",
    registrationNumber: "Registration No.",
    subject: "Subject",
    description: "Description",
    unitPrice: "Unit Price",
    quantity: "Qty",
    taxRate: "Tax Rate",
    lineSubtotal: "Subtotal",
    lineTax: "Tax",
    lineTotal: "Total",
    subtotal: "Subtotal",
    tax: "Tax",
    total: "Total",
    bankInfo: "Bank Details",
    notes: "Notes",
    draft: "DRAFT",
  },
} as const;

const documentTypeLabels = {
  invoice: {
    ja: {
      documentTitle: "INVOICE",
      invoiceNumber: "請求番号",
      dueDate: "支払期限",
      amountDue: "ご請求金額",
    },
    en: {
      documentTitle: "INVOICE",
      invoiceNumber: "Invoice No.",
      dueDate: "Due Date",
      amountDue: "Amount Due",
    },
  },
  quotation: {
    ja: {
      documentTitle: "見積書",
      invoiceNumber: "見積番号",
      dueDate: "有効期限",
      amountDue: "お見積金額",
    },
    en: {
      documentTitle: "QUOTATION",
      invoiceNumber: "Quotation No.",
      dueDate: "Valid Until",
      amountDue: "Estimated Amount",
    },
  },
  delivery: {
    ja: {
      documentTitle: "納品書",
      invoiceNumber: "納品番号",
      dueDate: "納品日",
      amountDue: "合計金額",
    },
    en: {
      documentTitle: "DELIVERY NOTE",
      invoiceNumber: "Delivery No.",
      dueDate: "Delivery Date",
      amountDue: "Total Amount",
    },
  },
} as const;

export function getInvoiceLabels(language: InvoiceLanguage, documentType: DocumentType = "invoice") {
  return { ...commonLabels[language], ...documentTypeLabels[documentType][language] };
}

export type InvoiceLabelSet = ReturnType<typeof getInvoiceLabels>;
