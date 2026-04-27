#!/usr/bin/env node
import { Command } from "commander";
import { closeDb } from "./db/client.js";
import { openDatabase } from "./db/index.js";
import { runClientsCommand } from "./commands/clients.js";
import { runDeleteInvoiceCommand } from "./commands/deleteInvoice.js";
import { runDraftCommand } from "./commands/draft.js";
import { runDraftsCommand } from "./commands/drafts.js";
import { runGenerateCommand } from "./commands/generate.js";
import { runInvoicesCommand } from "./commands/invoices.js";
import { select } from "./utils/prompts.js";

const program = new Command();

async function withDatabase(action: (db: Awaited<ReturnType<typeof openDatabase>>) => Promise<unknown>): Promise<void> {
  const db = await openDatabase();
  try {
    await action(db);
  } finally {
    closeDb();
  }
}

async function runMainMenu(): Promise<void> {
  while (true) {
    const action = await select("何をしますか", [
      { name: "drafts", message: "📋 請求書ドラフト一覧", value: runDraftsCommand },
      { name: "draft", message: "✍️ 請求書ドラフトを作成する", value: runCreateDraftAndOpenList },
      { name: "invoices", message: "🧾 請求書一覧", value: runInvoicesCommand },
    ]);

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
  .name("invoice")
  .description("対話式の請求書発行CLI")
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
  .command("clients")
  .description("取引先を一覧・追加・編集する")
  .action(() => withDatabase(runClientsCommand));

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
