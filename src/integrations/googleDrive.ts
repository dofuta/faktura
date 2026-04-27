import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { loadEnv } from "../config/env.js";
import { ensureDir } from "../utils/files.js";
import { openUrl } from "../utils/preview.js";

export type DriveUploadResult = {
  fileId: string;
  webViewLink: string;
};

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

async function createDriveClient() {
  const env = loadEnv();
  const auth = env.googleAuthMode === "service_account"
    ? await createServiceAccountAuth()
    : await createOAuthAuth();

  return google.drive({ version: "v3", auth });
}

async function createServiceAccountAuth() {
  const env = loadEnv();
  if (env.googleApplicationCredentials) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = env.googleApplicationCredentials;
  }

  return new google.auth.GoogleAuth({
    scopes: DRIVE_SCOPES,
  });
}

type OAuthClientJson = {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
};

async function createOAuthAuth(): Promise<OAuth2Client> {
  const env = loadEnv();
  const rawClient = await readFile(env.googleOAuthClientPath, "utf8").catch(() => {
    throw new Error(
      `Google OAuth client file not found: ${env.googleOAuthClientPath}\n` +
        "個人のGoogle Driveへアップロードする場合はOAuthクライアントJSONを作成し、GOOGLE_OAUTH_CLIENT_PATHに設定してください。",
    );
  });
  const credentials = JSON.parse(rawClient) as OAuthClientJson;
  const clientConfig = credentials.installed ?? credentials.web;
  if (!clientConfig) {
    throw new Error("Google OAuth client JSON must contain an installed or web client.");
  }

  const existingToken = await readFile(env.googleOAuthTokenPath, "utf8").catch(() => undefined);
  const oauth2Client = new google.auth.OAuth2(clientConfig.client_id, clientConfig.client_secret);
  if (existingToken) {
    oauth2Client.setCredentials(JSON.parse(existingToken));
    return oauth2Client;
  }

  const token = await authorizeWithLocalServer(clientConfig.client_id, clientConfig.client_secret);
  oauth2Client.setCredentials(token);

  await ensureDir(path.dirname(env.googleOAuthTokenPath));
  await writeFile(env.googleOAuthTokenPath, JSON.stringify(token, null, 2), "utf8");
  console.log(`Google OAuth tokenを保存しました: ${env.googleOAuthTokenPath}`);

  return oauth2Client;
}

async function authorizeWithLocalServer(clientId: string, clientSecret: string) {
  return new Promise<NonNullable<OAuth2Client["credentials"]>>((resolve, reject) => {
    const server = createServer(async (request, response) => {
      try {
        if (!request.url) {
          throw new Error("OAuth callback URL is empty.");
        }

        const callbackUrl = new URL(request.url, redirectUri);
        const code = callbackUrl.searchParams.get("code");
        const error = callbackUrl.searchParams.get("error");
        if (error) {
          throw new Error(`Google OAuth failed: ${error}`);
        }
        if (!code) {
          throw new Error("Google OAuth callback did not include code.");
        }

        const token = await oauth2Client.getToken(code);
        response.end("Authentication completed. You can close this tab.");
        server.close();
        resolve(token.tokens);
      } catch (error) {
        response.statusCode = 500;
        response.end("Authentication failed. Please return to the CLI.");
        server.close();
        reject(error);
      }
    });

    let redirectUri = "";
    let oauth2Client: OAuth2Client;

    server.listen(0, "127.0.0.1", async () => {
      try {
        const address = server.address();
        if (!address || typeof address === "string") {
          throw new Error("Could not start local OAuth callback server.");
        }

        redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`;
        oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: "offline",
          prompt: "consent",
          scope: DRIVE_SCOPES,
        });

        console.log("Google Driveへのアクセスを許可してください:");
        console.log(authUrl);
        await openUrl(authUrl);
      } catch (error) {
        server.close();
        reject(error);
      }
    });
  });
}

export async function uploadPdfToDrive(pdfPath: string): Promise<DriveUploadResult> {
  const env = loadEnv();
  if (!env.googleDriveFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set.");
  }

  const drive = await createDriveClient();
  const response = await drive.files.create({
    requestBody: {
      name: path.basename(pdfPath),
      parents: [env.googleDriveFolderId],
      mimeType: "application/pdf",
    },
    media: {
      mimeType: "application/pdf",
      body: createReadStream(pdfPath),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  const fileId = response.data.id;
  const webViewLink = response.data.webViewLink;
  if (!fileId || !webViewLink) {
    throw new Error("Google Drive upload did not return file id or URL.");
  }

  return { fileId, webViewLink };
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = await createDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}
