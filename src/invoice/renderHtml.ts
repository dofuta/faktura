import { readFile } from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";
import type { Company } from "../config/company.js";
import type { InvoiceDraft } from "./schema.js";
import type { InvoiceTotals } from "./totals.js";
import { formatYen } from "./totals.js";

export type InvoiceRenderContext = {
  invoiceNumber: string;
  company: Company;
  draft: InvoiceDraft;
  totals: InvoiceTotals;
};

Handlebars.registerHelper("formatYen", (value: number) => formatYen(value));
Handlebars.registerHelper("formatPercent", (value: number) => `${Math.round(value * 100)}%`);
Handlebars.registerHelper("lineBreaks", (value: string) => {
  const escaped = Handlebars.escapeExpression(value);
  return new Handlebars.SafeString(escaped.replace(/\r?\n/g, "<br />"));
});

export async function renderInvoiceHtml(context: InvoiceRenderContext): Promise<string> {
  const templatePath = path.resolve(process.cwd(), "templates/invoice.html.hbs");
  const template = await readFile(templatePath, "utf8");
  return Handlebars.compile(template)(context);
}
