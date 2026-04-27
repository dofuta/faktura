import type Database from "better-sqlite3";
import { loadEnv } from "../config/env.js";
import { formatGoogleDriveStatus, getGoogleDriveStatus } from "../integrations/googleDriveConfig.js";
import { ensureDir } from "../utils/files.js";
import { openPath } from "../utils/preview.js";
import { select } from "../utils/prompts.js";

type SettingsAction = "show" | "open-config" | "open-data" | "back";

async function showSettings(): Promise<void> {
  const env = loadEnv();
  const driveStatus = await getGoogleDriveStatus();

  console.log("");
  console.log(`OpenAI: ${env.openAiApiKey ? "設定済み" : "未設定"}`);
  console.log(`Google Drive: ${formatGoogleDriveStatus(driveStatus)}`);
  if (driveStatus.missing.length > 0) {
    console.log(`Drive不足項目: ${driveStatus.missing.join(", ")}`);
  }
  console.log(`DB: ${env.databasePath}`);
  console.log(`会社情報: ${env.companyConfigPath}`);
  console.log(`OAuthクライアント: ${driveStatus.oauthClientPath}`);
  console.log(`OAuthトークン: ${driveStatus.oauthTokenPath}`);
  console.log(`設定: ${env.configDir}`);
  console.log(`データ: ${env.dataDir}`);
  console.log(`ドラフト: ${env.draftsDir}`);
  console.log(`出力: ${env.outputDir}`);
  console.log("");
}

export async function runSettingsCommand(_db: Database.Database): Promise<void> {
  while (true) {
    const action = await select<SettingsAction>("設定・保存場所", [
      { name: "show", message: "⚙️ 設定状態を表示", value: "show" },
      { name: "open-config", message: "📁 設定フォルダをFinderで開く", value: "open-config" },
      { name: "open-data", message: "📁 データフォルダをFinderで開く", value: "open-data" },
      { name: "back", message: "↩️ トップに戻る", value: "back" },
    ]);

    if (action === "back") {
      return;
    }

    if (action === "show") {
      await showSettings();
      continue;
    }

    if (action === "open-config") {
      const env = loadEnv();
      await ensureDir(env.configDir);
      await openPath(env.configDir);
      continue;
    }

    if (action === "open-data") {
      const env = loadEnv();
      await ensureDir(env.dataDir);
      await openPath(env.dataDir);
    }
  }
}
