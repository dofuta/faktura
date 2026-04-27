import path from "node:path";
import type Database from "better-sqlite3";
import { addMonths, format, lastDayOfMonth } from "date-fns";
import { loadEnv } from "../config/env.js";
import type { Client } from "../db/schema.js";
import { listClients } from "../db/repositories.js";
import { generateDraftWithOpenAi } from "../integrations/openai.js";
import { buildDraftFileName, reserveInvoiceNumber } from "../invoice/numbering.js";
import { writeInvoiceDraft } from "../invoice/schema.js";
import { openInEditor } from "../utils/editor.js";
import { confirm, autocomplete, input, requiredInput } from "../utils/prompts.js";
import { promptNewClient } from "./clients.js";

const NEW_CLIENT = "__new_client__";
const BACK = "__back__";

type ClientSelection = Client | typeof NEW_CLIENT | typeof BACK;

function defaultDueDate(): string {
  return format(lastDayOfMonth(addMonths(new Date(), 1)), "yyyy-MM-dd");
}

async function selectClientPrompt(db: Database.Database): Promise<Client | undefined> {
  const clients = listClients(db);
  const choices = [
    ...clients.map((client) => ({
      name: client.name,
      message: `${client.name} ${client.email} ${client.address}`.trim(),
      value: client as ClientSelection,
    })),
    {
      name: "+ 新しい取引先を登録する",
      message: "+ 新しい取引先を登録する",
      value: NEW_CLIENT as ClientSelection,
    },
    {
      name: "↩️ トップに戻る",
      message: "↩️ トップに戻る",
      value: BACK as ClientSelection,
    },
  ];

  const selected = await autocomplete<ClientSelection>("取引先を選択してください", choices);
  if (selected === NEW_CLIENT) {
    return promptNewClient(db);
  }
  if (selected === BACK) {
    return undefined;
  }

  return selected;
}

export async function runDraftCommand(db: Database.Database): Promise<boolean> {
  const client = await selectClientPrompt(db);
  if (!client) {
    return false;
  }

  const naturalLanguage = await requiredInput("請求内容を自然文で入力してください");
  const title = await input("件名");
  const issueDate = await input("発行日", format(new Date(), "yyyy-MM-dd"));
  const dueDate = await input("支払期限", defaultDueDate());
  const notes = await input("備考");

  const draft = await generateDraftWithOpenAi({
    client,
    naturalLanguage,
    title,
    issueDate,
    dueDate,
    notes,
  });

  const invoiceNumber = reserveInvoiceNumber(db, new Date(draft.issueDate));
  const draftPath = path.resolve(loadEnv().draftsDir, buildDraftFileName(invoiceNumber));
  await writeInvoiceDraft(draftPath, draft);
  console.log(`ドラフトを保存しました: ${draftPath}`);

  if (await confirm("生成されたドラフトをエディタで確認しますか", true)) {
    await openInEditor(draftPath);
  }

  return true;
}
