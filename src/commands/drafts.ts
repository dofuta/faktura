import { unlink } from "node:fs/promises";
import path from "node:path";
import type Database from "better-sqlite3";
import { loadEnv } from "../config/env.js";
import { listInvoices } from "../db/repositories.js";
import { generateFromDraftPath } from "./generate.js";
import { readInvoiceDraft } from "../invoice/schema.js";
import { openInEditor } from "../utils/editor.js";
import { listFiles } from "../utils/files.js";
import { confirm, select } from "../utils/prompts.js";

const ANSI_DIM = "\x1b[2m";
const ANSI_RESET = "\x1b[0m";
const BACK = "__back__";

type DraftChoice = {
  name: string;
  message: string;
  value: string;
  priority: number;
};

function dim(value: string): string {
  return `${ANSI_DIM}${value}${ANSI_RESET}`;
}

function invoiceNumberFromDraftPath(filePath: string): string | undefined {
  const base = path.basename(filePath, path.extname(filePath));
  return /^\d{6}-\d{3}$/.test(base) ? base : undefined;
}

function getSavedState(db: Database.Database, draftPath: string) {
  const invoices = listInvoices(db);
  const invoiceNumber = invoiceNumberFromDraftPath(draftPath);
  const savedInvoices = invoices.filter((invoice) => {
    const sameDraft = path.resolve(invoice.draftPath) === path.resolve(draftPath);
    const sameNumber = invoiceNumber ? invoice.invoiceNumber === invoiceNumber : false;
    return sameDraft || sameNumber;
  });

  const isSavedToSqlite = savedInvoices.length > 0;
  const isSavedToDrive = savedInvoices.some((invoice) => Boolean(invoice.googleDriveFileId || invoice.googleDriveUrl));

  return {
    isSavedToSqlite,
    isSavedToDrive,
    priority: Number(isSavedToSqlite) + Number(isSavedToDrive),
  };
}

async function buildDraftChoices(db: Database.Database, draftFiles: string[]): Promise<DraftChoice[]> {
  const choices = await Promise.all(
    draftFiles.map(async (file) => {
      const relativePath = path.relative(process.cwd(), file);
      const state = getSavedState(db, file);
      const statuses = [
        state.isSavedToSqlite ? "SQLite保存済み" : undefined,
        state.isSavedToDrive ? "Drive保存済み" : undefined,
      ].filter(Boolean);

      let baseLabel = relativePath;
      try {
        const draft = await readInvoiceDraft(file);
        baseLabel = draft.title.trim() || relativePath;
      } catch {
        // 壊れたドラフトでも一覧から削除・編集できるように表示します。
      }

      const label = `${baseLabel}${statuses.length ? ` (${statuses.join(" / ")})` : ""}`;
      return {
        name: file,
        message: state.priority > 0 ? dim(label) : label,
        value: file,
        priority: state.priority,
      };
    }),
  );

  return choices.sort((a, b) => a.priority - b.priority || a.message.localeCompare(b.message, "ja"));
}

async function selectDraft(db: Database.Database): Promise<string | undefined> {
  const draftFiles = await listFiles(loadEnv().draftsDir, [".yml", ".yaml", ".json"]);
  if (draftFiles.length === 0) {
    console.log("ドラフトはありません。");
    return undefined;
  }

  const choices = await buildDraftChoices(db, draftFiles);
  const selected = await select("請求書ドラフトを選択してください", [
    ...choices,
    { name: BACK, shortcut: "b", message: "↩️ トップに戻る", value: BACK },
  ]);

  return selected === BACK ? undefined : selected;
}

async function deleteDraft(db: Database.Database, draftPath: string): Promise<void> {
  const state = getSavedState(db, draftPath);
  const message = state.isSavedToSqlite || state.isSavedToDrive
    ? "このドラフトは生成済みです。ローカルドラフトだけ削除しますか"
    : "このドラフトを削除しますか";

  if (!(await confirm(message, false))) {
    console.log("キャンセルしました。");
    return;
  }

  await unlink(draftPath);
  console.log(`ドラフトを削除しました: ${draftPath}`);
}

export async function runDraftsCommand(db: Database.Database): Promise<void> {
  while (true) {
    const draftPath = await selectDraft(db);
    if (!draftPath) {
      return;
    }

    const action = await select("操作を選択してください", [
      { name: "generate", message: "📄 生成", value: "generate" as const },
      { name: "edit", message: "✏️ 編集", value: "edit" as const },
      { name: "delete", message: "🗑️ 削除", value: "delete" as const },
      { name: "back", shortcut: "b", message: "↩️ トップに戻る", value: "back" as const },
    ]);

    if (action === "back") {
      return;
    }

    if (action === "generate") {
      await generateFromDraftPath(db, draftPath);
      continue;
    }

    if (action === "edit") {
      await openInEditor(draftPath);
      continue;
    }

    if (action === "delete") {
      await deleteDraft(db, draftPath);
    }
  }
}
