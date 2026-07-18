<p align="center">
  <img src="assets/header.jpg" alt="faktura" width="100%" />
</p>

請求書発行Webアプリです。自然言語から請求書ドラフトを作成し、フォームで編集・プレビューしたうえで発行(PDF生成)し、必要に応じてGoogle Driveへアップロードします。

- Next.js (App Router) + shadcn/ui + Tailwind CSS
- DB: Turso (libSQL) + Drizzle ORM。ローカル開発は `file:data/dev.db`
- PDF: puppeteer-core + @sparticuz/chromium(HTMLプレビューとPDFが同一のテンプレート)
- 請求書出力は日本語 / 英語対応(取引先の言語で切替)
- 旧CLI版は `legacy-cli/` に退避(廃止)

## セットアップ

Node.js は `.node-version`(22.x)を使います。

```bash
nodenv install 22.22.3   # 未導入の場合
npm install
cp .env.example .env.local
```

`.env.local` を設定します。

```bash
AUTH_PASSWORD=ログインパスワード
AUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
# ローカル開発ではTURSO_*は不要(file:data/dev.dbを使用)
```

スキーマ適用とシード:

```bash
npm run db:push
npm run db:seed
```

起動:

```bash
npm run dev
```

OpenAI APIキーとGoogle Driveは、アプリの「設定」画面から登録します(DBに暗号化保存。envではありません)。

## 旧CLIからのデータ移行

```bash
npm run db:migrate-from-cli -- [旧DBパス] [company.ymlパス]
# デフォルト: data/invoices.db config/company.yml
```

取引先・請求書(発行済みとして)・明細・採番・会社情報を移行します。ローカルPDFが残っていればBLOBとして取り込みます。

## Vercelデプロイ

1. [Turso](https://turso.tech/) でDBを作成し、URLとトークンを取得
2. Vercelに環境変数を設定: `AUTH_PASSWORD` / `AUTH_SECRET` / `ENCRYPTION_KEY` / `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`
3. ローカルから本番DBへスキーマ適用: `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:push && npm run db:seed`
4. デプロイ

## Google Drive連携(任意)

`drive.file` スコープ(non-sensitive)のみ使うため、Googleの審査は不要です。

1. [Google Cloud Console](https://console.cloud.google.com/) でGoogle Drive APIを有効化
2. OAuthクライアントを「ウェブアプリケーション」で作成し、リダイレクトURIに `https://<デプロイ先>/api/google/callback`(ローカルは `http://localhost:3000/api/google/callback`)を登録
3. OAuth同意画面を**本番公開**する(テストモードのままだとrefresh tokenが7日で失効します)
4. アプリの「設定」画面にクライアントID/シークレットを保存し、「Driveを接続」

アップロード先は、アプリが自動作成するMy Drive内の `faktura` フォルダです。

## 確認

```bash
npm run check
npm run build
```
