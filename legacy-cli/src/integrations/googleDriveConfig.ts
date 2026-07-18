import { access } from "node:fs/promises";
import { loadEnv } from "../config/env.js";

export type GoogleDriveStatus = {
  enabled: boolean;
  mode: "oauth" | "service_account";
  folderId?: string;
  missing: string[];
  oauthClientPath?: string;
  oauthTokenPath?: string;
  serviceAccountPath?: string;
};

async function fileExists(filePath: string | undefined): Promise<boolean> {
  if (!filePath) {
    return false;
  }

  return access(filePath).then(
    () => true,
    () => false,
  );
}

export async function getGoogleDriveStatus(): Promise<GoogleDriveStatus> {
  const env = loadEnv();
  const missing: string[] = [];

  if (!env.googleDriveFolderId) {
    missing.push("GOOGLE_DRIVE_FOLDER_ID");
  }

  if (env.googleAuthMode === "oauth") {
    if (!(await fileExists(env.googleOAuthClientPath))) {
      missing.push(env.googleOAuthClientPath);
    }
  }

  if (env.googleAuthMode === "service_account") {
    if (!(await fileExists(env.googleApplicationCredentials))) {
      missing.push(env.googleApplicationCredentials ?? "GOOGLE_APPLICATION_CREDENTIALS");
    }
  }

  return {
    enabled: missing.length === 0,
    mode: env.googleAuthMode,
    folderId: env.googleDriveFolderId,
    missing,
    oauthClientPath: env.googleOAuthClientPath,
    oauthTokenPath: env.googleOAuthTokenPath,
    serviceAccountPath: env.googleApplicationCredentials,
  };
}

export function formatGoogleDriveStatus(status: GoogleDriveStatus): string {
  if (status.enabled) {
    return `設定済み (${status.mode})`;
  }

  return `未設定 (${status.mode})`;
}
