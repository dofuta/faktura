import Handlebars from "handlebars";
import { getInvoiceLabels, type DocumentType, type InvoiceLanguage } from "./labels";
import { calculateTotals, formatYen, type InvoiceItemInput } from "./totals";

export type { DocumentType };

export type CompanySnapshot = {
  name: string;
  postalCode: string;
  address: string;
  email: string;
  phone: string;
  registrationNumber: string;
  invoiceNotes: string;
  bank: {
    name: string;
    branch: string;
    accountType: string;
    accountNumber: string;
    accountHolder: string;
  };
};

export type InvoiceRenderInput = {
  invoiceNumber: string | null;
  documentType?: DocumentType;
  language: InvoiceLanguage;
  company: CompanySnapshot;
  client: { name: string; address: string; email: string };
  title: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: InvoiceItemInput[];
};

const template = `<!doctype html>
<html lang="{{lang}}">
  <head>
    <meta charset="utf-8" />
    <title>{{labels.documentTitle}} {{invoiceNumber}}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap"
      rel="stylesheet"
    />
    <style>
      body {
        color: #111;
        font-family: "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Helvetica Neue",
          Arial, sans-serif;
        font-size: 12px;
        line-height: 1.6;
        margin: 20px;
      }

      h1 {
        font-size: 28px;
        letter-spacing: 0.2em;
        text-align: center;
      }

      table {
        border-collapse: collapse;
        margin-top: 24px;
        width: 100%;
      }

      th,
      td {
        border: 1px solid #ddd;
        padding: 8px;
      }

      th {
        background: #f5f5f5;
        text-align: left;
      }

      .row {
        display: flex;
        justify-content: space-between;
        gap: 48px;
      }

      .box {
        flex: 1;
      }

      .right {
        text-align: right;
      }

      .total {
        font-size: 18px;
        font-weight: 700;
      }

      .summary-row {
        align-items: stretch;
        display: flex;
        justify-content: space-between;
        margin-top: 16px;
      }

      .summary-card {
        border: 1px solid #ddd;
        flex: 1;
        padding: 8px 10px;
      }

      .amount-card {
        border-left: 0;
        flex: 0 0 240px;
        text-align: right;
      }

      .summary-label {
        color: #555;
        display: block;
        font-size: 11px;
        font-weight: 400;
        margin-bottom: 4px;
      }

      .amount-value {
        display: block;
        font-size: 18px;
        font-weight: 700;
      }

      .muted {
        color: #555;
      }

      .notes {
        margin-top: 24px;
      }

      .subject {
        font-size: 14px;
      }

      .bank-box {
        background: #fafafa;
        border: 1px solid #ddd;
        margin-top: 20px;
        padding: 10px 12px;
      }

      .bank-box p {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <h1>{{labels.documentTitle}}</h1>

    <div class="row">
      <div class="box">
        <p>
          <strong>{{client.name}}{{labels.addresseeSuffix}}</strong><br />
          {{client.address}}<br />
          {{client.email}}
        </p>
      </div>
      <div class="box right">
        <p>
          {{#if invoiceNumber}}{{labels.invoiceNumber}}: {{invoiceNumber}}<br />{{/if}}
          {{labels.issueDate}}: {{issueDate}}{{#if dueDate}}<br />
          {{labels.dueDate}}: {{dueDate}}{{/if}}
        </p>
      </div>
    </div>

    <div class="row">
      <div class="box">
        <p>
          <strong>{{company.name}}</strong><br />
          {{company.postalCode}} {{company.address}}<br />
          {{company.email}} {{company.phone}}<br />
          {{#if company.registrationNumber}}{{labels.registrationNumber}}: {{company.registrationNumber}}{{/if}}
        </p>
      </div>
    </div>

    <div class="summary-row">
      <div class="summary-card subject">
        <span class="summary-label">{{labels.subject}}</span>
        {{#if title}}{{title}}{{else}}-{{/if}}
      </div>
      <div class="summary-card amount-card">
        <span class="summary-label">{{labels.amountDue}}</span>
        <span class="amount-value">{{yen totals.total}}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>{{labels.description}}</th>
          <th class="right">{{labels.unitPrice}}</th>
          <th class="right">{{labels.quantity}}</th>
          <th class="right">{{labels.taxRate}}</th>
          <th class="right">{{labels.lineSubtotal}}</th>
          <th class="right">{{labels.lineTax}}</th>
          <th class="right">{{labels.lineTotal}}</th>
        </tr>
      </thead>
      <tbody>
        {{#each totals.items}}
          <tr>
            <td>{{description}}</td>
            <td class="right">{{yen unitPrice}}</td>
            <td class="right">{{quantity}}</td>
            <td class="right">{{percent taxRate}}</td>
            <td class="right">{{yen subtotal}}</td>
            <td class="right">{{yen taxAmount}}</td>
            <td class="right">{{yen total}}</td>
          </tr>
        {{/each}}
      </tbody>
    </table>

    <table>
      <tbody>
        <tr>
          <th>{{labels.subtotal}}</th>
          <td class="right">{{yen totals.subtotal}}</td>
        </tr>
        <tr>
          <th>{{labels.tax}}</th>
          <td class="right">{{yen totals.taxAmount}}</td>
        </tr>
        <tr>
          <th>{{labels.total}}</th>
          <td class="right total">{{yen totals.total}}</td>
        </tr>
      </tbody>
    </table>

    {{#if hasBank}}
      <div class="bank-box">
        <p>
          <strong>{{labels.bankInfo}}</strong><br />
          {{company.bank.name}} {{company.bank.branch}} {{company.bank.accountType}}
          {{company.bank.accountNumber}} {{company.bank.accountHolder}}
        </p>
      </div>
    {{/if}}

    <div class="notes muted">
      {{#if notes}}
        <p><strong>{{labels.notes}}</strong><br />{{lineBreaks notes}}</p>
      {{/if}}

      {{#if company.invoiceNotes}}
        <p>{{lineBreaks company.invoiceNotes}}</p>
      {{/if}}
    </div>
  </body>
</html>
`;

Handlebars.registerHelper("percent", (value: number) => `${Math.round(value * 100)}%`);
Handlebars.registerHelper("yen", function (value: number, options: Handlebars.HelperOptions) {
  const lang = (options.data.root as { lang: InvoiceLanguage }).lang;
  return formatYen(value, lang);
});
Handlebars.registerHelper("lineBreaks", (value: string) => {
  const escaped = Handlebars.escapeExpression(value);
  return new Handlebars.SafeString(escaped.replace(/\r?\n/g, "<br />"));
});

const compiled = Handlebars.compile(template);

export function renderInvoiceHtml(input: InvoiceRenderInput): string {
  const documentType = input.documentType ?? "invoice";
  const labels = getInvoiceLabels(input.language, documentType);
  const totals = calculateTotals(input.items);

  return compiled({
    lang: input.language,
    labels,
    // 見積書・納品書は保存しない=番号を持たないため、下書き表記は請求書のみ
    invoiceNumber: input.invoiceNumber ?? (documentType === "invoice" ? labels.draft : null),
    company: input.company,
    client: input.client,
    title: input.title,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    notes: input.notes,
    totals,
    hasBank: Boolean(input.company.bank.name),
  });
}
