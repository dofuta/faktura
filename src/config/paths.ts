import envPaths from "env-paths";
import path from "node:path";

const paths = envPaths("faktura", { suffix: "" });

export type AppPaths = {
  configDir: string;
  dataDir: string;
  cacheDir: string;
  envFilePath: string;
  companyConfigPath: string;
  databasePath: string;
  draftsDir: string;
  outputDir: string;
  googleOAuthClientPath: string;
  googleOAuthTokenPath: string;
  googleServiceAccountPath: string;
};

export function getAppPaths(): AppPaths {
  const configDir = paths.config;
  const dataDir = paths.data;

  return {
    configDir,
    dataDir,
    cacheDir: paths.cache,
    envFilePath: path.join(configDir, ".env"),
    companyConfigPath: path.join(configDir, "company.yml"),
    databasePath: path.join(dataDir, "invoices.db"),
    draftsDir: path.join(dataDir, "drafts"),
    outputDir: path.join(dataDir, "output"),
    googleOAuthClientPath: path.join(configDir, "google-oauth-client.json"),
    googleOAuthTokenPath: path.join(configDir, "google-oauth-token.json"),
    googleServiceAccountPath: path.join(configDir, "google-service-account.json"),
  };
}

export function resolvePath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}
