import type Database from "better-sqlite3";
import type { Client } from "../db/schema.js";
import { countClientInvoices, createClient, deleteClient, listClients, updateClient } from "../db/repositories.js";
import { confirm, input, requiredInput, select } from "../utils/prompts.js";

const BACK_LANGUAGE = "__back_language__";
const BACK_TO_TOP = "__back_to_top__";
const BACK_TO_CLIENTS = "__back_to_clients__";

type ClientAction = "preview" | "edit" | "delete" | "back";
type ClientSelection = Client | typeof BACK_TO_TOP;

async function promptClientLanguage(initial: "ja" | "en" = "ja"): Promise<"ja" | "en" | undefined> {
  const choices = [
    { name: "ja", message: "🇯🇵 日本語", value: "ja" as const },
    { name: "en", message: "🇺🇸 英語", value: "en" as const },
  ];

  return select("言語", [
    ...choices.sort((choice) => (choice.value === initial ? -1 : 1)),
    { name: BACK_LANGUAGE, shortcut: "b", message: "↩️ 戻る", value: undefined },
  ]);
}

export async function promptNewClient(db: Database.Database): Promise<Client | undefined> {
  const name = await requiredInput("取引先名");
  const email = await input("メールアドレス");
  const address = await input("住所");
  const language = await promptClientLanguage();
  if (!language) {
    return undefined;
  }

  return createClient(db, { name, email, address, language });
}

function printClientPreview(db: Database.Database, client: Client): void {
  const invoiceCount = countClientInvoices(db, client.id);

  console.log("");
  console.log(`ID: ${client.id}`);
  console.log(`取引先名: ${client.name}`);
  console.log(`メールアドレス: ${client.email || "-"}`);
  console.log(`住所: ${client.address || "-"}`);
  console.log(`言語: ${client.language === "ja" ? "日本語" : "英語"}`);
  console.log(`請求書数: ${invoiceCount}`);
  console.log(`作成日: ${client.createdAt}`);
  console.log(`更新日: ${client.updatedAt}`);
  console.log("");
}

async function selectClient(db: Database.Database): Promise<ClientSelection | undefined> {
  const clients = listClients(db);
  if (clients.length === 0) {
    console.log("取引先はまだ登録されていません。");
    return undefined;
  }

  return select<ClientSelection>("取引先を選択してください", [
    ...clients.map((client) => ({
      name: String(client.id),
      message: `${client.name} ${client.email} ${client.address}`.trim(),
      value: client as ClientSelection,
    })),
    { name: BACK_TO_TOP, shortcut: "b", message: "↩️ トップに戻る", value: BACK_TO_TOP },
  ]);
}

async function editClient(db: Database.Database, client: Client): Promise<Client | undefined> {
  const name = await requiredInput("取引先名", client.name);
  const email = await input("メールアドレス", client.email);
  const address = await input("住所", client.address);
  const language = await promptClientLanguage(client.language);
  if (!language) {
    return undefined;
  }

  const updated = updateClient(db, client.id, { name, email, address, language });
  console.log(`取引先を更新しました: ${updated.name}`);
  return updated;
}

async function deleteSelectedClient(db: Database.Database, client: Client): Promise<boolean> {
  const invoiceCount = countClientInvoices(db, client.id);
  if (invoiceCount > 0) {
    console.log(`この取引先には請求書が ${invoiceCount} 件あるため削除できません。`);
    return false;
  }

  if (!(await confirm(`取引先「${client.name}」を削除しますか`, false))) {
    console.log("キャンセルしました。");
    return false;
  }

  deleteClient(db, client.id);
  console.log(`取引先を削除しました: ${client.name}`);
  return true;
}

export async function runCreateClientCommand(db: Database.Database): Promise<void> {
  const client = await promptNewClient(db);
  if (client) {
    console.log(`取引先を追加しました: ${client.name}`);
  }
}

export async function runClientsCommand(db: Database.Database): Promise<void> {
  while (true) {
    let client = await selectClient(db);
    if (!client || client === BACK_TO_TOP) {
      return;
    }

    while (true) {
      const action = await select<ClientAction>("操作を選択してください", [
        { name: "preview", message: "👀 プレビュー", value: "preview" },
        { name: "edit", message: "✏️ 編集", value: "edit" },
        { name: "delete", message: "🗑️ 削除", value: "delete" },
        { name: BACK_TO_CLIENTS, shortcut: "b", message: "↩️ 取引先一覧に戻る", value: "back" },
      ]);

      if (action === "back") {
        break;
      }

      if (action === "preview") {
        printClientPreview(db, client);
        continue;
      }

      if (action === "edit") {
        const updated = await editClient(db, client);
        if (updated) {
          client = updated;
        }
        continue;
      }

      if (action === "delete") {
        const deleted = await deleteSelectedClient(db, client);
        if (deleted) {
          break;
        }
      }
    }
  }
}
