import path from "node:path";
import type Database from "better-sqlite3";
import { loadEnv } from "../config/env.js";
import { loadCompany } from "../config/company.js";
import { invoiceNumberExists, listInvoices, saveInvoice } from "../db/repositories.js";
import { uploadPdfToDrive } from "../integrations/googleDrive.js";
import { getGoogleDriveStatus } from "../integrations/googleDriveConfig.js";
import { reserveInvoiceNumber } from "../invoice/numbering.js";
import { renderInvoiceHtml } from "../invoice/renderHtml.js";
import { renderPdfFromHtml } from "../invoice/renderPdf.js";
import { readInvoiceDraft } from "../invoice/schema.js";
import { calculateTotals, formatYen } from "../invoice/totals.js";
import { confirm, select } from "../utils/prompts.js";
import { listFiles } from "../utils/files.js";
import { openPdfPreview, toFileUrl } from "../utils/preview.js";

const ANSI_DIM = "\x1b[2m";
const ANSI_RESET = "\x1b[0m";
const BACK = "__back__";

function invoiceNumberFromDraftPath(filePath: string): string | undefined {
  const base = path.basename(filePath, path.extname(filePath));
  return /^\d{6}-\d{3}$/.test(base) ? base : undefined;
}

function sanitizeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

function buildClientNameForFileName(clientName: string, language: "ja" | "en"): string {
  if (language === "en") {
    return clientName;
  }

  return clientName.endsWith("様") ? clientName : `${clientName}様`;
}

function buildPdfFileName(issueDate: string, clientName: string, language: "ja" | "en"): string {
  const compactIssueDate = issueDate.replaceAll("-", "");
  const displayClientName = buildClientNameForFileName(clientName, language);
  const safeClientName = sanitizeFileNamePart(displayClientName) || "client";
  return `INVOICE_${compactIssueDate}_${safeClientName}.pdf`;
}

function resolveInvoiceNumber(db: Database.Database, draftPath: string, issueDate: string): string {
  const fromDraftPath = invoiceNumberFromDraftPath(draftPath);
  if (fromDraftPath && !invoiceNumberExists(db, fromDraftPath)) {
    return fromDraftPath;
  }

  if (fromDraftPath) {
    console.log(`請求番号 ${fromDraftPath} は使用済みのため、新しい番号を採番します。`);
  }

  while (true) {
    const invoiceNumber = reserveInvoiceNumber(db, new Date(issueDate));
    if (!invoiceNumberExists(db, invoiceNumber)) {
      return invoiceNumber;
    }
  }
}

function dim(value: string): string {
  return `${ANSI_DIM}${value}${ANSI_RESET}`;
}

async function buildDraftChoices(db: Database.Database, draftFiles: string[]) {
  const invoices = listInvoices(db);
  const choices = await Promise.all(
    draftFiles.map(async (file) => {
      const relativePath = path.relative(process.cwd(), file);
      const invoiceNumber = invoiceNumberFromDraftPath(file);
      const savedInvoices = invoices.filter((invoice) => {
        const sameDraft = path.resolve(invoice.draftPath) === path.resolve(file);
        const sameNumber = invoiceNumber ? invoice.invoiceNumber === invoiceNumber : false;
        return sameDraft || sameNumber;
      });
      const isSavedToSqlite = savedInvoices.length > 0;
      const isSavedToDrive = savedInvoices.some((invoice) => Boolean(invoice.googleDriveFileId || invoice.googleDriveUrl));
      const statuses = [
        isSavedToSqlite ? "SQLite保存済み" : undefined,
        isSavedToDrive ? "Drive保存済み" : undefined,
      ].filter(Boolean);
      const priority = Number(isSavedToSqlite) + Number(isSavedToDrive);

      try {
        const draft = await readInvoiceDraft(file);
        const title = draft.title.trim();
        const label = `${title || relativePath}${statuses.length ? ` (${statuses.join(" / ")})` : ""}`;
        return {
          name: file,
          message: priority > 0 ? dim(label) : label,
          value: file,
          priority,
        };
      } catch {
        const label = `${relativePath}${statuses.length ? ` (${statuses.join(" / ")})` : ""}`;
        return {
          name: file,
          message: priority > 0 ? dim(label) : label,
          value: file,
          priority,
        };
      }
    }),
  );

  return choices.sort((a, b) => a.priority - b.priority || a.message.localeCompare(b.message, "ja"));
}

export async function runGenerateCommand(db: Database.Database): Promise<void> {
  const env = loadEnv();
  const draftFiles = await listFiles(env.draftsDir, [".yml", ".yaml", ".json"]);
  if (draftFiles.length === 0) {
    console.log("生成できるドラフトがありません。");
    return;
  }

  const draftPath = await select<string | typeof BACK>("生成するドラフトを選択してください", [
    ...(await buildDraftChoices(db, draftFiles)),
    { name: BACK, message: "↩️ トップに戻る", value: BACK, priority: Number.MAX_SAFE_INTEGER },
  ]);
  if (draftPath === BACK) {
    return;
  }

  await generateFromDraftPath(db, draftPath);
}

export async function generateFromDraftPath(db: Database.Database, draftPath: string): Promise<void> {
  const draft = await readInvoiceDraft(draftPath);
  const totals = calculateTotals(draft);
  const invoiceNumber = resolveInvoiceNumber(db, draftPath, draft.issueDate);
  const pdfPath = path.resolve(
    loadEnv().outputDir,
    buildPdfFileName(draft.issueDate, draft.client.name, draft.client.language),
  );

  console.log(`請求番号: ${invoiceNumber}`);
  console.log(`取引先: ${draft.client.name}`);
  if (draft.title.trim()) {
    console.log(`件名: ${draft.title}`);
  }
  console.log(`合計: ${formatYen(totals.total)}`);
  console.log(`出力先: ${pdfPath}`);

  if (!(await confirm("この内容でPDFを生成しますか", true))) {
    console.log("キャンセルしました。");
    return;
  }

  const company = await loadCompany();
  const html = await renderInvoiceHtml({ invoiceNumber, company, draft, totals });
  await renderPdfFromHtml(html, pdfPath);
  console.log(`PDFを生成しました: ${pdfPath}`);
  console.log(`PDFプレビューURL: ${toFileUrl(pdfPath)}`);

  if (await confirm("ブラウザでPDFをプレビューしますか", true)) {
    await openPdfPreview(pdfPath);
  }

  let googleDriveFileId: string | undefined;
  let googleDriveUrl: string | undefined;
  const driveStatus = await getGoogleDriveStatus();
  if (!driveStatus.enabled) {
    console.log("Google Driveは未設定のためスキップしました。");
  } else if (await confirm("Google Driveへアップロードしますか", true)) {
    const uploaded = await uploadPdfToDrive(pdfPath);
    googleDriveFileId = uploaded.fileId;
    googleDriveUrl = uploaded.webViewLink;
    console.log(`Google Driveへアップロードしました: ${googleDriveUrl}`);
  }

  const invoice = saveInvoice(db, {
    invoiceNumber,
    draft,
    totals,
    draftPath,
    pdfPath,
    googleDriveFileId,
    googleDriveUrl,
  });
  console.log(`SQLiteへ保存しました: ${invoice.invoiceNumber}`);
}
