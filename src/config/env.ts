import "dotenv/config";
import path from "node:path";

export type AppEnv = {
  openAiApiKey?: string;
  openAiModel: string;
  googleAuthMode: "oauth" | "service_account";
  googleApplicationCredentials?: string;
  googleOAuthClientPath: string;
  googleOAuthTokenPath: string;
  googleDriveFolderId?: string;
  databasePath: string;
  companyConfigPath: string;
  pdfPreviewBrowser?: string;
};

function resolveProjectPath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export function loadEnv(): AppEnv {
  return {
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    googleAuthMode: process.env.GOOGLE_AUTH_MODE === "service_account" ? "service_account" : "oauth",
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? resolveProjectPath(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined,
    googleOAuthClientPath: resolveProjectPath(
      process.env.GOOGLE_OAUTH_CLIENT_PATH ?? "./config/google-oauth-client.json",
    ),
    googleOAuthTokenPath: resolveProjectPath(
      process.env.GOOGLE_OAUTH_TOKEN_PATH ?? "./config/google-oauth-token.json",
    ),
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    databasePath: resolveProjectPath(process.env.DATABASE_PATH ?? "./data/invoices.db"),
    companyConfigPath: resolveProjectPath(process.env.COMPANY_CONFIG_PATH ?? "./config/company.yml"),
    pdfPreviewBrowser: process.env.PDF_PREVIEW_BROWSER,
  };
}
