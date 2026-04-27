# Invoice Generator

Node.js/TypeScript製の小さな請求書発行CLIです。

自然言語から請求書ドラフトを作成し、YAMLを確認・編集したうえでPDFを生成し、必要に応じてGoogle Driveへアップロードします。取引先、請求書、Google Drive URLはSQLiteで管理します。

## セットアップ

```bash
npm install
npm run install:browsers
cp .env.example .env
```

PDF生成にはPlaywrightのChromiumが必要です。`browserType.launch: Executable doesn't exist` が出た場合も、`npm run install:browsers` を実行してください。

`config/company.yml` に自社情報と振込先を設定してください。

`.env` には以下を設定します。

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
GOOGLE_AUTH_MODE=oauth
GOOGLE_OAUTH_CLIENT_PATH=./config/google-oauth-client.json
GOOGLE_OAUTH_TOKEN_PATH=./config/google-oauth-token.json
GOOGLE_DRIVE_FOLDER_ID=
DATABASE_PATH=./data/invoices.db
COMPANY_CONFIG_PATH=./config/company.yml
PDF_PREVIEW_BROWSER=
```

## Google認証情報

個人のGoogle Driveへアップロードする場合はOAuthを使います。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成します。
2. 「APIとサービス」から Google Drive API を有効化します。
3. 「APIとサービス」→「OAuth同意画面」を設定します。個人利用ならテストユーザーに自分のGoogleアカウントを追加します。
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」を選びます。
5. アプリケーションの種類は「デスクトップアプリ」にします。
6. ダウンロードしたJSONを `config/google-oauth-client.json` に置きます。
7. フォルダURLのID部分を `.env` の `GOOGLE_DRIVE_FOLDER_ID` に設定します。
8. 初回アップロード時にブラウザが開くので、Google Driveへのアクセスを許可します。取得したトークンは `config/google-oauth-token.json` に保存されます。

フォルダURLが `https://drive.google.com/drive/folders/abc123...` の場合、`abc123...` がフォルダIDです。

共有ドライブでサービスアカウントを使う場合だけ、`.env` に `GOOGLE_AUTH_MODE=service_account` と `GOOGLE_APPLICATION_CREDENTIALS=./config/google-service-account.json` を設定してください。サービスアカウントは通常の個人My Driveには保存容量を持たないため、My Driveへの直接アップロードには向きません。

## 自社情報

`config/company.yml` には、PDFに表示する自社情報と振込先を設定します。

```yaml
name: Your Company
postalCode: "000-0000"
address: Tokyo, Japan
email: billing@example.com
phone: ""
registrationNumber: ""
invoiceNotes: |
  ※振込日が土日祝日の場合には、その前の最終銀行営業日までにお振込ください。
  ※恐れ入りますが振込手数料はお客様のご負担でお願いいたします。
bank:
  name: Sample Bank
  branch: Main Branch
  accountType: ordinary
  accountNumber: "0000000"
  accountHolder: Your Company
```

- `name`: 自社名
- `postalCode`, `address`: 自社住所
- `email`, `phone`: 連絡先
- `registrationNumber`: 適格請求書発行事業者の登録番号。不要なら空で構いません。
- `invoiceNotes`: 請求書の備考に毎回表示する固定文。複数行で書くとPDFでは改行が`<br />`として表示されます。
- `bank`: 請求書に表示する振込先口座情報

## 使い方

開発中は以下でCLIを起動します。

```bash
npm run dev
```

起動後に、CLI上で「何をするか」を選択します。通常操作ではCLIを終了せず、各画面の `↩️ トップに戻る` でトップメニューへ戻ります。

ビルド後は以下です。

```bash
npm run build
node dist/cli.js
```

## コマンド

```bash
npm run dev
```

最初にアイコン付きのメニューが表示されます。

- `📋 請求書ドラフト一覧`: `drafts/` 配下のドラフトを選択し、生成・編集・削除を行います。
- `✍️ 請求書ドラフトを作成する`: 取引先を検索選択し、請求内容を自然文で入力してドラフトYAMLを作成します。作成後はドラフト一覧に戻ります。
- `🧾 請求書一覧`: SQLiteに保存済みの請求書を新しい順に表示し、プレビュー・Finderで表示・削除を行います。

ドラフト一覧では、`title` があれば件名を表示し、空の場合だけファイル名を表示します。`SQLite保存済み`、`Drive保存済み` のドラフトは下の方に薄く表示されます。

請求書一覧では、新しいものが上に表示されます。Drive URLがあるものは `Drive保存済み`、ないものは `ローカルのみ` と表示します。

PDFファイル名は `INVOICE_YYYYMMDD_クライアント名.pdf` です。取引先の言語が日本語の場合は、クライアント名の末尾に `様` を付けます。英語の場合は付けません。

PDF生成後は `file://` のプレビューURLを表示し、確認に答えるとブラウザ/既定アプリで開きます。ブラウザを指定したい場合は `.env` に設定します。

```bash
PDF_PREVIEW_BROWSER="Google Chrome"
```

ドラフト例:

```yaml
client:
  id: 1
  name: 株式会社サンプル
  language: ja
title: Webサイト制作費
issueDate: 2026-04-27
dueDate: 2026-05-31
items:
  - description: Webサイト制作
    unitPrice: 100000
    quantity: 1
    taxRate: 0.1
notes: ""
```

## ファイル配置

- `config/company.yml`: 自社情報と振込先
- `data/invoices.db`: SQLiteデータベース
- `drafts/`: 請求書ドラフト
- `output/`: 生成PDF
- `templates/invoice.html.hbs`: 請求書HTMLテンプレート

## 確認

```bash
npm run check
npm run build
```
