import dotenv from "dotenv";
import { getAppPaths, resolvePath } from "./paths.js";

const appPaths = getAppPaths();
dotenv.config({ path: appPaths.envFilePath, quiet: true });
dotenv.config({ quiet: true });

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
  configDir: string;
  dataDir: string;
  draftsDir: string;
  outputDir: string;
  envFilePath: string;
};

export function loadEnv(): AppEnv {
  return {
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    googleAuthMode: process.env.GOOGLE_AUTH_MODE === "service_account" ? "service_account" : "oauth",
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? resolvePath(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : appPaths.googleServiceAccountPath,
    googleOAuthClientPath: resolvePath(
      process.env.GOOGLE_OAUTH_CLIENT_PATH ?? appPaths.googleOAuthClientPath,
    ),
    googleOAuthTokenPath: resolvePath(
      process.env.GOOGLE_OAUTH_TOKEN_PATH ?? appPaths.googleOAuthTokenPath,
    ),
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    databasePath: resolvePath(process.env.DATABASE_PATH ?? appPaths.databasePath),
    companyConfigPath: resolvePath(process.env.COMPANY_CONFIG_PATH ?? appPaths.companyConfigPath),
    pdfPreviewBrowser: process.env.PDF_PREVIEW_BROWSER,
    configDir: appPaths.configDir,
    dataDir: appPaths.dataDir,
    draftsDir: resolvePath(process.env.DRAFTS_DIR ?? appPaths.draftsDir),
    outputDir: resolvePath(process.env.OUTPUT_DIR ?? appPaths.outputDir),
    envFilePath: appPaths.envFilePath,
  };
}
