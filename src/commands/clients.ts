import type Database from "better-sqlite3";
import type { Client } from "../db/schema.js";
import { createClient, listClients, updateClient } from "../db/repositories.js";
import { input, requiredInput, select } from "../utils/prompts.js";

const BACK = "__back__";

async function promptClientLanguage(initial: "ja" | "en" = "ja"): Promise<"ja" | "en" | undefined> {
  const choices = [
    { name: "ja", message: "🇯🇵 日本語", value: "ja" as const },
    { name: "en", message: "🇺🇸 英語", value: "en" as const },
  ];

  return select("言語", [
    ...choices.sort((choice) => (choice.value === initial ? -1 : 1)),
    { name: BACK, message: "↩️ 戻る", value: undefined },
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

export async function runClientsCommand(db: Database.Database): Promise<void> {
  const action = await select("取引先メニュー", [
    { name: "list", message: "📋 一覧", value: "list" as const },
    { name: "add", message: "➕ 追加", value: "add" as const },
    { name: "edit", message: "✏️ 編集", value: "edit" as const },
    { name: BACK, message: "↩️ トップに戻る", value: "back" as const },
  ]);

  if (action === "back") {
    return;
  }

  if (action === "list") {
    const clients = listClients(db);
    if (clients.length === 0) {
      console.log("取引先はまだ登録されていません。");
      return;
    }

    for (const client of clients) {
      console.log(`${client.id}: ${client.name} ${client.email} ${client.address} ${client.language}`.trim());
    }
    return;
  }

  if (action === "add") {
    const client = await promptNewClient(db);
    if (client) {
      console.log(`取引先を追加しました: ${client.name}`);
    }
    return;
  }

  const clients = listClients(db);
  if (clients.length === 0) {
    console.log("編集できる取引先がありません。");
    return;
  }

  const client = await select<Client | undefined>("編集する取引先", [
    ...clients.map((item) => ({
      name: String(item.id),
      message: `${item.name} ${item.email}`.trim(),
      value: item,
    })),
    { name: BACK, message: "↩️ 戻る", value: undefined },
  ]);
  if (!client) {
    return;
  }

  const name = await requiredInput("取引先名", client.name);
  const email = await input("メールアドレス", client.email);
  const address = await input("住所", client.address);
  const language = await promptClientLanguage(client.language);
  if (!language) {
    return;
  }

  const updated = updateClient(db, client.id, { name, email, address, language });
  console.log(`取引先を更新しました: ${updated.name}`);
}
