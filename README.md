# シム調整予測 Webアプリ

測定データから、狙い値範囲に近づけるためのシム調整候補を提案するMVPです。

## 仕様確認用ログイン

Supabaseをまだ設定していない場合でも、開発環境では以下でログインできます。

- ログインID: `demo`
- パスワード: `demo1234`

## 主な機能

- 独自ログインID / パスワード認証
- 権限: `admin`, `operator`, `viewer`
- 設定画面の使用可否をユーザーごとに管理
- 携帯端末向け6件セット入力
- 測定入力画面と設定画面の分離
- 得意先・製品の登録と選択
- 狙い値範囲の入力
- 現在シムの入力
- パンチ特性設定
- 測定6件セットのSupabase保存
- 保存時点の現在シムを測定セットに保存
- 複数パンチ組み合わせのシム提案
- Supabase保存用スキーマ

## Supabaseセットアップ

1. Supabaseでプロジェクトを作成
2. `supabase/schema.sql` をSQL Editorで実行
   - 既にスキーマ作成済みの場合は `supabase/migrations/001_notifications.sql`、`supabase/migrations/002_measurement_current_shims.sql`、`supabase/migrations/003_user_settings_permission.sql` も実行
3. `.env.example` を `.env.local` にコピーして値を設定
4. 依存関係をインストール

```bash
npm install
```

5. 初期管理者を作成

```bash
npm run create-admin
```

6. 開発サーバー起動

```bash
npm run dev
```

## 注意

- OCR方式は未確定のため、このMVPでは実装対象外です。
- `/dashboard` は測定入力用、`/settings` は設定管理用です。
- `/settings` は `app_users.can_manage_settings = true` のユーザーだけ使用できます。
- シム値は `0.1+0.03` のような文字列として扱います。合計値計算はしません。
- 予測ロジックは初期版です。現時点では保存済みパンチ特性を優先して提案し、画面の現在シムが空の場合は同一得意先+製品の最新保存シムを使用します。
- 実績データが増えた段階で、シム変更履歴と測定変化量から回帰モデルや評価指標を追加してください。

## LINE通知

測定6件セットを保存した直後に、入力者本人と管理者全員へ通知履歴を作成します。

LINE送信を有効化する場合は `.env.local` に以下を設定してください。

```env
LINE_CHANNEL_ACCESS_TOKEN=LINE Messaging API のチャネルアクセストークン
```

各ユーザーの `app_users.line_user_id` にLINE userIdを設定すると、そのユーザーへLINEプッシュ通知を送ります。
未設定の場合は、通知履歴だけ作成され、ステータスは `skipped` になります。

## ログインできない場合

`app_users.password_hash` には平文パスワードを入れないでください。

NG:

```text
password_hash = test
```

OK:

```text
password_hash = scrypt$...
```

初期ユーザーは以下のコマンドで作成してください。

```bash
npm run create-admin
```

このスクリプトが `scrypt$...` 形式のハッシュを作成して `app_users` に保存します。
