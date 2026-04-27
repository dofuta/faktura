#!/usr/bin/env node
import { Command } from "commander";
import { closeDb } from "./db/client.js";
import { openDatabase } from "./db/index.js";
import { runClientsCommand, runCreateClientCommand } from "./commands/clients.js";
import { runDeleteInvoiceCommand } from "./commands/deleteInvoice.js";
import { runDraftCommand } from "./commands/draft.js";
import { runDraftsCommand } from "./commands/drafts.js";
import { runGenerateCommand } from "./commands/generate.js";
import { runInvoicesCommand } from "./commands/invoices.js";
import { runSettingsCommand } from "./commands/settings.js";
import { select } from "./utils/prompts.js";

const program = new Command();
type DatabaseAction = (db: Awaited<ReturnType<typeof openDatabase>>) => Promise<unknown>;
type MainMenuAction = DatabaseAction | "exit";

async function withDatabase(action: DatabaseAction): Promise<void> {
  const db = await openDatabase();
  try {
    await action(db);
  } finally {
    closeDb();
  }
}

async function runMainMenu(): Promise<void> {
  while (true) {
    const action = await select<MainMenuAction>("何をしますか", [
      { name: "drafts", shortcut: "d", message: "📋 請求書ドラフト一覧", value: runDraftsCommand },
      { name: "draft", shortcut: "n", message: "✍️ 請求書ドラフトを作成する", value: runCreateDraftAndOpenList },
      { name: "invoices", shortcut: "i", message: "🧾 請求書一覧", value: runInvoicesCommand },
      { name: "clients", shortcut: "c", message: "🏢 取引先一覧", value: runClientsCommand },
      { name: "client", shortcut: "a", message: "➕ 取引先作成", value: runCreateClientCommand },
      { name: "settings", shortcut: "s", message: "⚙️ 設定・保存場所", value: runSettingsCommand },
      { name: "exit", shortcut: "q", message: "終了する", value: "exit" },
    ]);

    if (action === "exit") {
      return;
    }

    await withDatabase(action);
  }
}

async function runCreateDraftAndOpenList(db: Awaited<ReturnType<typeof openDatabase>>): Promise<void> {
  const created = await runDraftCommand(db);
  if (created === true) {
    await runDraftsCommand(db);
  }
}

program
  .name("fak")
  .description("faktura - 対話式の請求書発行CLI")
  .version("0.1.0");

program.action(runMainMenu);

program
  .command("draft")
  .description("取引先選択から自然言語で請求書ドラフトを作成する")
  .action(() => withDatabase(runDraftCommand));

program
  .command("drafts")
  .description("請求書ドラフト一覧を開く")
  .action(() => withDatabase(runDraftsCommand));

program
  .command("generate")
  .description("ドラフトからPDF請求書を生成し、必要に応じてGoogle Driveへアップロードする")
  .action(() => withDatabase(runGenerateCommand));

program
  .command("invoices")
  .description("請求書一覧を開く")
  .action(() => withDatabase(runInvoicesCommand));

program
  .command("settings")
  .description("設定状態と保存場所を表示する")
  .action(() => withDatabase(runSettingsCommand));

program
  .command("clients")
  .description("取引先を一覧・プレビュー・編集・削除する")
  .action(() => withDatabase(runClientsCommand));

program
  .command("client")
  .description("取引先を作成する")
  .action(() => withDatabase(runCreateClientCommand));

program
  .command("delete")
  .description("誤発行した請求書をGoogle DriveとSQLiteから削除する")
  .action(() => withDatabase(runDeleteInvoiceCommand));

program.parseAsync(process.argv).catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
