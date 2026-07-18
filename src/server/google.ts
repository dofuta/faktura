import { SETTING_KEYS, deleteSetting, getSetting, setSetting } from "@/lib/settings";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_FOLDER_NAME = "faktura";

export type DriveStatus = {
  configured: boolean;
  connected: boolean;
};

export async function getDriveStatus(): Promise<DriveStatus> {
  const clientId = await getSetting(SETTING_KEYS.googleClientId);
  const clientSecret = await getSetting(SETTING_KEYS.googleClientSecret);
  const refreshToken = await getSetting(SETTING_KEYS.googleRefreshToken);
  return {
    configured: Boolean(clientId && clientSecret),
    connected: Boolean(clientId && clientSecret && refreshToken),
  };
}

async function requireOAuthClient(): Promise<{ clientId: string; clientSecret: string }> {
  const clientId = await getSetting(SETTING_KEYS.googleClientId);
  const clientSecret = await getSetting(SETTING_KEYS.googleClientSecret);
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuthクライアントが未設定です。");
  }
  return { clientId, clientSecret };
}

export async function buildAuthUrl(redirectUri: string, state: string): Promise<string> {
  const { clientId } = await requireOAuthClient();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeAndStoreToken(
  code: string,
  redirectUri: string,
): Promise<void> {
  const { clientId, clientSecret } = await requireOAuthClient();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Googleトークン交換に失敗しました: ${await response.text()}`);
  }

  const tokens = (await response.json()) as { refresh_token?: string };
  if (!tokens.refresh_token) {
    throw new Error("Googleからrefresh_tokenが返されませんでした。");
  }

  await setSetting(SETTING_KEYS.googleRefreshToken, tokens.refresh_token);
}

export async function disconnectDrive(): Promise<void> {
  await deleteSetting(SETTING_KEYS.googleRefreshToken);
  await deleteSetting(SETTING_KEYS.driveFolderId);
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = await requireOAuthClient();
  const refreshToken = await getSetting(SETTING_KEYS.googleRefreshToken);
  if (!refreshToken) {
    throw new Error("Google Driveが未接続です。");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Googleアクセストークン取得に失敗しました: ${await response.text()}`);
  }

  const tokens = (await response.json()) as { access_token: string };
  return tokens.access_token;
}

async function ensureDriveFolder(accessToken: string): Promise<string> {
  const existing = await getSetting(SETTING_KEYS.driveFolderId);
  if (existing) {
    return existing;
  }

  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!response.ok) {
    throw new Error(`Driveフォルダ作成に失敗しました: ${await response.text()}`);
  }

  const folder = (await response.json()) as { id: string };
  await setSetting(SETTING_KEYS.driveFolderId, folder.id);
  return folder.id;
}

export async function uploadPdfToDrive(
  fileName: string,
  pdf: Buffer,
): Promise<{ fileId: string; webViewLink: string }> {
  const accessToken = await getAccessToken();
  const folderId = await ensureDriveFolder(accessToken);

  const boundary = `faktura${Date.now()}`;
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
    mimeType: "application/pdf",
  });

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
    ),
    pdf,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: new Uint8Array(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Driveアップロードに失敗しました: ${await response.text()}`);
  }

  const file = (await response.json()) as { id: string; webViewLink: string };
  return { fileId: file.id, webViewLink: file.webViewLink };
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Driveファイル削除に失敗しました: ${await response.text()}`);
  }
}
