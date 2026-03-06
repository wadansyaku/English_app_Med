# Steady Study

React + Vite の英単語学習アプリです。現在は Cloudflare Pages + Pages Functions + D1 を前提に動く構成へ移行済みです。

## いまの構成

- Frontend: Vite / React 19
- Backend: Cloudflare Pages Functions
- Database: Cloudflare D1 (`medace-db`)
- AI: Gemini API を Functions 経由で利用

クライアントに秘密情報は埋め込まず、認証・教材データ・学習履歴・AI 呼び出しは `/api/*` 経由で処理します。

## 開発コマンド

```bash
npm install
npm run typecheck
npm run build
```

## Cloudflare ローカル確認

1. D1 マイグレーションを適用

```bash
npx wrangler d1 migrations apply medace-db --local
```

2. curated CSV から seed SQL を生成

```bash
node scripts/build-seed-sql.mjs \
  /Users/Yodai/projects/language_database_2_2/output_curated/20260208_225334/MASTER_DATABASE_REFINED.csv \
  ./tmp/d1-seed.sql
```

この seed 生成はデフォルトで `TOEFLテスト英単語3800` を除外します。追加で除外したい書籍がある場合は `--exclude-book "書名"` を付けてください。

3. ローカル D1 に投入

```bash
npx wrangler d1 execute medace-db --local --file=./tmp/d1-seed.sql
```

4. Functions を含めて確認

```bash
npm run build
npx wrangler pages dev dist
```

## Cloudflare 本番

このワークスペースでは以下の Cloudflare リソースを作成済みです。

- Pages Project: `medace-english-app`
- Production URL: [https://medace-english-app.pages.dev](https://medace-english-app.pages.dev)
- D1 Database: `medace-db`
- D1 Database ID: `1b1c8b71-764c-4593-8a20-32a75b77ab11`

### 本番マイグレーション

```bash
npx wrangler d1 migrations apply medace-db --remote
```

### 本番 seed

remote D1 では `BEGIN TRANSACTION` を含む SQL が使えないため、`--remote` を付けて生成します。

```bash
node scripts/build-seed-sql.mjs --remote \
  /Users/Yodai/projects/language_database_2_2/output_curated/20260208_225334/MASTER_DATABASE_REFINED.csv \
  ./tmp/d1-seed-remote.sql

npx wrangler d1 execute medace-db --remote --file=./tmp/d1-seed-remote.sql
```

本番でも同様に `TOEFLテスト英単語3800` は seed 対象から外れます。

### Pages Secrets

最低限、管理者デモ用パスワードは設定してください。AI 機能を使うなら Gemini key も必要です。

```bash
echo 'your-admin-password' | npx wrangler pages secret put ADMIN_DEMO_PASSWORD --project-name medace-english-app
echo 'your-gemini-api-key' | npx wrangler pages secret put GEMINI_API_KEY --project-name medace-english-app
```

`ADMIN_DEMO_PASSWORD` は同じコマンドを再実行すればいつでも上書きできます。

### Frontend Environment Variables

フリープランの広告枠を実配信するには、Vite の公開環境変数に AdSense 情報を入れてください。

```bash
VITE_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
VITE_ADSENSE_SLOT_DEFAULT=1234567890
VITE_ADSENSE_SLOT_DASHBOARD_INLINE=1234567890
VITE_ADSENSE_SLOT_DASHBOARD_SECONDARY=1234567890
```

ローカル未設定時は、開発画面でスポンサー枠プレビューを表示します。本番では未設定なら広告枠は表示されません。

### デプロイ

```bash
npm run build
npx wrangler pages deploy dist --project-name medace-english-app
```

## GitHub 連携

Git の `origin` は [https://github.com/wadansyaku/English_app_Med](https://github.com/wadansyaku/English_app_Med) に接続済みです。加えて、GitHub Actions を入れています。

- `.github/workflows/ci.yml`
  - `npm ci`
  - `npm run typecheck`
  - `npm run build`
- `.github/workflows/deploy-pages.yml`
  - `main` / `master` push 時に Cloudflare Pages へ deploy

Cloudflare deploy workflow を使う場合は、GitHub Secrets に次を設定してください。

```bash
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

## 新しい事業/通知設計

- 初回レベル診断は AI 生成をやめ、静的な 12 問の設問バンクで判定
- 講師通知は `instructor_notifications` に保存され、生徒ダッシュボードに表示
- 通知文は講師が直接書くこともでき、AI 下書きも使える
- 課金区分は `TOC_FREE` / `TOC_PAID` / `TOB_FREE` / `TOB_PAID`
- AI 機能はプランごとに許可機能と月次予算をサーバー側で制限

商用まわりの共通定義は [config/subscription.ts](/Users/Yodai/projects/MedAce英単語アプリ/config/subscription.ts) にあります。

## 主な改善点

- `index.html` を通常の Vite エントリへ修正し、実際に JS バンドルされる状態へ戻した
- Supabase 依存を削除し、Cloudflare D1 + Functions に移行した
- `GEMINI_API_KEY` のクライアント露出をやめ、Functions 経由にした
- 日本語タイトルで壊れやすかった book ID 生成を安定化した
- curated DB (`MASTER_DATABASE_REFINED.csv`) を D1 に流し込むスクリプトを追加した
- 初回診断を静的バンク化し、結果に見直しポイントを返すようにした
- ダッシュボードに通知/課金/AI予算の可視化を追加した
