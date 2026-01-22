# 買主データ復旧ガイド

## 概要

このガイドは、買主リストデータベース（`buyers`テーブル）からデータが消失した場合に、スプレッドシートから安全にデータを復元する手順を説明します。

## 前提条件

- Node.js 18以上がインストールされている
- Supabaseへの接続が設定されている
- Google Sheets APIの認証が設定されている
- 買主リストスプレッドシートへのアクセス権限がある

## 復旧手順

### ステップ1: 現状確認

まず、データベースの現在の状態を確認します。

```bash
cd backend
npx ts-node check-data-loss-status.ts
```

**確認項目:**
- 買主データが本当に消失しているか
- 物件データと売主データは正常か
- スプレッドシートにデータが存在するか

### ステップ2: ドライラン（検証のみ）

実際の復元を行う前に、ドライランでデータを検証します。

```bash
npx ts-node recover-buyer-data.ts --dry-run
```

**確認項目:**
- スプレッドシートからデータが正しく読み取れるか
- データ検証エラーがないか
- 推定復元件数が妥当か

**出力例:**
```
=== 買主データ復旧開始 ===
モード: ドライラン（検証のみ）
バッチサイズ: 100

スプレッドシートからデータを読み取り中...
6500行のデータを取得しました

データ検証中...
=== 検証結果サマリー ===
総行数: 6500
有効行数: 6450
無効行数: 50
エラー数: 50
警告数: 10

✅ ドライラン完了（実際のデータ挿入は行われませんでした）
```

### ステップ3: バックアップ作成（オプション）

既存データがある場合は、念のためバックアップを作成します。

```bash
npx ts-node recover-buyer-data.ts --create-backup
```

**注意:** 買主データが完全に消失している場合（0件）、このステップはスキップできます。

### ステップ4: 本番復元

ドライランで問題がなければ、実際の復元を実行します。

```bash
npx ts-node recover-buyer-data.ts --recover --create-backup
```

**処理内容:**
1. 既存データのバックアップ作成（`--create-backup`指定時）
2. スプレッドシートからデータ読み取り
3. データ検証
4. バッチ処理でデータベースに挿入（100件ずつ）
5. 進捗レポート表示
6. 結果サマリー表示

**出力例:**
```
=== 買主データ復旧開始 ===
モード: 本番復元
バッチサイズ: 100

既存データのバックアップを作成中...
バックアップ完了: 0件 (ID: abc123...)

スプレッドシートからデータを読み取り中...
6500行のデータを取得しました

データ検証中...
有効行数: 6450

データ復元を開始します...

バッチ 1/65 を処理中 (行 2 ~ 101)...
バッチ 2/65 を処理中 (行 102 ~ 201)...
...

=== 復旧完了 ===
処理時間: 45.23秒
挿入成功: 6450件
失敗: 0件
スキップ: 50件
バックアップID: abc123...

✅ 処理が正常に完了しました
```

### ステップ5: 復元後の検証

復元が完了したら、データを確認します。

```bash
# データベースのレコード数を確認
npx ts-node check-data-loss-status.ts

# サンプルデータを確認
npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('buyers').select('*').limit(10).then(({data}) => console.log(data));
"
```

**確認項目:**
- レコード数がスプレッドシートと一致するか
- サンプルデータが正しく復元されているか
- 暗号化データが保持されているか

## トラブルシューティング

### エラー: "バックアップテーブルが存在しません"

バックアップ機能を使用する場合、以下のSQLを実行してテーブルを作成してください。

```sql
-- バックアップテーブル作成
CREATE TABLE IF NOT EXISTS buyers_backup (
  LIKE buyers INCLUDING ALL
);
ALTER TABLE buyers_backup ADD COLUMN backup_id UUID;
ALTER TABLE buyers_backup ADD COLUMN original_id UUID;
ALTER TABLE buyers_backup ADD COLUMN backed_up_at TIMESTAMPTZ;

-- バックアップメタデータテーブル作成
CREATE TABLE IF NOT EXISTS backup_metadata (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  record_count INTEGER NOT NULL,
  description TEXT
);
```

### エラー: "Google Sheets authentication failed"

Google Sheets APIの認証設定を確認してください。

```bash
# サービスアカウントキーファイルの確認
ls -la backend/google-service-account.json

# 環境変数の確認
echo $GOOGLE_SERVICE_ACCOUNT_KEY_PATH
```

### エラー: "Supabase connection failed"

Supabase接続設定を確認してください。

```bash
# 環境変数の確認
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### 検証エラーが多数発生する場合

検証エラーの詳細を確認し、スプレッドシートのデータを修正してください。

```bash
# 検証のみ実行
npx ts-node recover-buyer-data.ts --verify
```

**よくある検証エラー:**
- 買主番号が空
- メールアドレスの形式が不正
- 重複する買主番号

### 復元中にエラーが発生した場合

バックアップからリストアできます。

```bash
# バックアップ一覧を表示
npx ts-node recover-buyer-data.ts --list-backups

# 特定のバックアップからリストア
npx ts-node recover-buyer-data.ts --restore <backup-id>
```

## コマンドリファレンス

### 基本コマンド

```bash
# ヘルプ表示
npx ts-node recover-buyer-data.ts --help

# ドライラン（検証のみ）
npx ts-node recover-buyer-data.ts --dry-run

# データ検証のみ
npx ts-node recover-buyer-data.ts --verify

# バックアップ作成
npx ts-node recover-buyer-data.ts --create-backup

# 本番復元（バックアップ付き）
npx ts-node recover-buyer-data.ts --recover --create-backup

# バックアップ一覧表示
npx ts-node recover-buyer-data.ts --list-backups

# バックアップからリストア
npx ts-node recover-buyer-data.ts --restore <backup-id>
```

### 推奨実行順序

```bash
# 1. 現状確認
npx ts-node check-data-loss-status.ts

# 2. ドライラン
npx ts-node recover-buyer-data.ts --dry-run

# 3. 本番復元
npx ts-node recover-buyer-data.ts --recover --create-backup

# 4. 復元後確認
npx ts-node check-data-loss-status.ts
```

## よくある質問（FAQ）

### Q1: 復元にどのくらい時間がかかりますか？

A: データ量によりますが、6,000件程度で約30-60秒です。バッチ処理により効率的に処理されます。

### Q2: 復元中にエラーが発生したらどうなりますか？

A: エラーが発生した行はスキップされ、処理は継続されます。エラーログに詳細が記録されます。

### Q3: 既存データがある場合はどうなりますか？

A: `upsert`を使用しているため、既存データは更新され、新規データは挿入されます。重複は発生しません。

### Q4: バックアップは必須ですか？

A: データが完全に消失している場合（0件）は不要ですが、一部データが残っている場合は推奨します。

### Q5: スプレッドシートのデータが間違っている場合は？

A: スプレッドシートが真実のデータソースです。復元前にスプレッドシートのデータを修正してください。

### Q6: 暗号化されたデータはどうなりますか？

A: 暗号化されたデータ（氏名、住所、電話番号、メールアドレス）は暗号化されたまま保存されます。

## サポート

問題が解決しない場合は、以下の情報を含めて報告してください：

1. エラーメッセージ全文
2. 実行したコマンド
3. データベースの現在の状態（レコード数）
4. スプレッドシートの行数
5. 環境情報（Node.jsバージョン、OS）

## 関連ドキュメント

- [スプレッドシート設定ガイド](../spreadsheet-configuration.md)
- [スプレッドシートカラムマッピング](../spreadsheet-column-mapping.md)
- [買主同期サービス](../src/services/BuyerSyncService.ts)
