<p align="center">
  <img src="assets/header.jpg" alt="faktura" width="100%" />
</p>

Node.js/TypeScript製の小さな請求書発行CLIです。

自然言語から請求書ドラフトを作成し、YAMLを確認・編集したうえでPDFを生成し、必要に応じてGoogle Driveへアップロードします。取引先、請求書、Google Drive URLはSQLiteで管理します。

## セットアップ

Node.jsは `22.x` LTSを推奨します。`better-sqlite3` の都合で、Node.js `21.x` は非推奨です。

ベータ版としてGitHubから直接インストールする場合は以下です。

```bash
npm install -g git+ssh://git@github.com:dofuta/invoice-generator.git
fak
```

ブランチを指定する場合:

```bash
npm install -g git+ssh://git@github.com:dofuta/invoice-generator.git#main
fak
```

`nodenv` を使っていて `fak: command not found` になる場合は、以下を実行してください。

```bash
nodenv rehash
```

PDF生成にはPlaywrightのChromiumが必要です。初回に以下を実行してください。

```bash
npx playwright install chromium
```

`browserType.launch: Executable doesn't exist` が出た場合も、同じコマンドを実行してください。

## 保存場所

設定とデータは、macOS/Linuxの標準的なアプリ用ディレクトリに保存します。正確なパスはCLIの `⚙️ 設定・保存場所` から確認できます。

macOSの例:

```text
~/Library/Preferences/faktura/
  .env
  company.yml
  google-oauth-client.json
  google-oauth-token.json

~/Library/Application Support/faktura/
  invoices.db
  drafts/
  output/
```

Linuxの例:

```text
~/.config/faktura/
  .env
  company.yml
  google-oauth-client.json
  google-oauth-token.json

~/.local/share/faktura/
  invoices.db
  drafts/
  output/
```

設定フォルダの `company.yml` に自社情報と振込先を設定してください。

`.env` には以下を設定します。

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
GOOGLE_AUTH_MODE=oauth
GOOGLE_DRIVE_FOLDER_ID=
PDF_PREVIEW_BROWSER=
```

`GOOGLE_OAUTH_CLIENT_PATH`、`DATABASE_PATH`、`COMPANY_CONFIG_PATH` などは通常不要です。指定しない場合は上記のOS標準ディレクトリを使います。

## Google Drive連携

Google Drive連携は任意です。未設定でもPDF生成とSQLite保存は使えます。未設定の場合、PDF生成時のGoogle Driveアップロード確認は表示されません。

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

現在の設定状態はCLIの `⚙️ 設定・保存場所` から確認できます。

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

通常は以下でCLIを起動します。

```bash
fak
```

起動後に、CLI上で「何をするか」を選択します。通常操作ではCLIを終了せず、各画面の `↩️ トップに戻る` でトップメニューへ戻ります。

開発中は以下でも起動できます。

```bash
npm run dev
```

## コマンド

```bash
fak
```

最初にアイコン付きのメニューが表示されます。

- `📋 請求書ドラフト一覧`: `drafts/` 配下のドラフトを選択し、生成・編集・削除を行います。
- `✍️ 請求書ドラフトを作成する`: 取引先を検索選択し、請求内容を自然文で入力してドラフトYAMLを作成します。作成後はドラフト一覧に戻ります。
- `🧾 請求書一覧`: SQLiteに保存済みの請求書を新しい順に表示し、プレビュー・Finderで表示・削除を行います。
- `⚙️ 設定・保存場所`: OpenAI/Google Driveの設定状態と、DB・会社情報・ドラフト・出力先を確認します。

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

- 設定フォルダの `company.yml`: 自社情報と振込先
- データフォルダの `invoices.db`: SQLiteデータベース
- データフォルダの `drafts/`: 請求書ドラフト
- データフォルダの `output/`: 生成PDF
- npm package内の `templates/invoice.html.hbs`: 請求書HTMLテンプレート

## 確認

```bash
npm run check
npm run build
```
