# 別府市住所ベースエリアマッピング - デプロイ手順書

## 前提条件

- Supabaseプロジェクトへのアクセス権限
- バックエンドサーバーへのアクセス
- 環境変数の設定（SUPABASE_URL, SUPABASE_SERVICE_KEY）

## デプロイ手順

### Step 1: データベースマイグレーション

#### 1.1 マイグレーションSQLの確認

```bash
cat backend/migrations/048_add_beppu_area_mapping.sql
```

#### 1.2 Supabaseでマイグレーション実行

1. Supabase Dashboardにログイン
2. 対象プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 「New query」をクリック
5. `048_add_beppu_area_mapping.sql`の内容を貼り付け
6. 「Run」をクリック

#### 1.3 実行結果の確認

成功メッセージ:
```
Success. No rows returned
```

エラーが発生した場合:
- テーブルが既に存在する場合: 問題なし（IF NOT EXISTSを使用）
- 権限エラー: Supabase管理者に連絡

#### 1.4 テーブル作成の確認

```bash
cd backend
npx ts-node verify-beppu-area-mapping.ts
```

期待される出力:
```
Checking beppu_area_mapping table...

✓ Table exists and is accessible
✓ Current row count: 0

⚠ Table is empty
```

### Step 2: マッピングデータの投入

#### 2.1 データ投入スクリプトの実行

```bash
cd backend
npx ts-node populate-beppu-area-mapping.ts
```

#### 2.2 実行結果の確認

期待される出力:
```
=== Beppu Area Mapping Data Population ===

Checking if beppu_area_mapping table exists...
✓ Table exists
Clearing existing data...
✓ Existing data cleared
Inserting 60 records...
  Inserted 50/60 records
  Inserted 60/60 records
✓ All data inserted successfully
Verifying inserted data...

Data summary by school district:
  青山中学校: 6 regions
  中部中学校: 30 regions
  北部中学校: 4 regions
  朝日中学校: 5 regions
  東山中学校: 3 regions
  鶴見台中学校: 2 regions
  別府西中学校: 2 regions
  別府駅周辺: 3 regions

Total: 60 regions
✓ Data verification complete

✅ Beppu area mapping data population completed successfully!
```

#### 2.3 データの最終確認

```bash
npx ts-node verify-beppu-area-mapping.ts
```

期待される出力:
```
Checking beppu_area_mapping table...

✓ Table exists and is accessible
✓ Current row count: 60

Sample data:
  青山中学校 - 南立石一区 → ⑨㊷
  青山中学校 - 南立石二区 → ⑨㊷
  青山中学校 - 南立石生目町 → ⑨㊸
  青山中学校 - 板地町 → ⑨㊷
  青山中学校 - 本町 → ⑨㊷
```

### Step 3: コードのデプロイ

#### 3.1 変更されたファイル

以下のファイルがデプロイ対象:

**新規ファイル:**
- `backend/src/services/BeppuAreaMappingService.ts`
- `backend/migrations/048_add_beppu_area_mapping.sql`
- `backend/populate-beppu-area-mapping.ts`
- `backend/verify-beppu-area-mapping.ts`
- `backend/backfill-beppu-distribution-areas.ts`
- `backend/manage-beppu-area-mapping.ts`
- `backend/recalculate-beppu-areas-after-mapping-change.ts`

**変更されたファイル:**
- `backend/src/services/PropertyDistributionAreaCalculator.ts`
- `backend/src/services/PropertyListingService.ts`

#### 3.2 デプロイ方法

**Git経由:**
```bash
git add .
git commit -m "feat: Add Beppu address-based area mapping system"
git push origin main
```

**サーバーでの更新:**
```bash
cd /path/to/backend
git pull origin main
npm install  # 新しい依存関係がある場合
npm run build  # TypeScriptをコンパイル
pm2 restart backend  # サーバーを再起動
```

### Step 4: 既存物件の一括更新（バックフィル）

#### 4.1 Dry Runで確認

```bash
cd backend
npx ts-node backfill-beppu-distribution-areas.ts --dry-run
```

出力例:
```
=== Beppu Distribution Areas Backfill ===

🔍 DRY RUN MODE - No changes will be made

Fetching Beppu City properties...
Found 150 Beppu City properties

Processing 150 properties...

[1/150] AA12345: 別府市南立石一区1-2-3
  Current: ㊶
  New:     ⑨㊷
  ✓ Would update

[2/150] AA12346: 別府市東荘園4丁目5-10
  Current: ㊶
  New:     ⑩㊸
  ✓ Would update

...

=== Backfill Summary ===

Total properties:     150
Processed:            150
Would update:         145
Skipped:              3
Errors:               2

✅ Dry run completed successfully!
Run with --force to apply these changes.
```

#### 4.2 エラーの確認と修正

エラーがある場合:
1. エラー詳細を確認
2. 問題のある物件を手動で確認
3. 必要に応じてマッピングデータを追加

#### 4.3 本番実行

```bash
npx ts-node backfill-beppu-distribution-areas.ts --force
```

#### 4.4 実行結果の確認

成功メッセージ:
```
✅ Backfill completed successfully!
```

### Step 5: 動作確認

#### 5.1 新規物件作成のテスト

1. 管理画面で新しい物件を作成
2. 住所に別府市の地域を入力（例: "別府市南立石一区1-2-3"）
3. 保存後、配信エリアが自動的に設定されることを確認（例: "⑨㊷"）

#### 5.2 住所更新のテスト

1. 既存の別府市物件を開く
2. 住所を変更（例: "別府市東荘園4丁目5-10"）
3. 保存後、配信エリアが自動的に更新されることを確認（例: "⑩㊸"）

#### 5.3 ログの確認

サーバーログで以下のメッセージを確認:
```
[BeppuAreaMapping] Extracted region: 南立石一区 from 別府市南立石一区1-2-3
[BeppuAreaMapping] Found areas: ⑨㊷ for region: 南立石一区
[DistributionArea] Beppu detailed areas: ⑨㊷
```

#### 5.4 フォールバックのテスト

1. 未知の地域の住所を入力（例: "別府市未知の地域1-1"）
2. 配信エリアが㊶（別府市全体）にフォールバックすることを確認

ログ:
```
[BeppuAreaMapping] No mapping found for region: 未知の地域
[DistributionArea] No detailed mapping found, falling back to ㊶
```

### Step 6: モニタリング

#### 6.1 エラーログの監視

```bash
# サーバーログを監視
pm2 logs backend --lines 100

# エラーのみをフィルタ
pm2 logs backend --err
```

#### 6.2 データベースの監視

Supabase Dashboardで:
1. 「Database」→「Tables」→「beppu_area_mapping」
2. レコード数を確認（60件）
3. 「property_listings」テーブルで別府市物件の配信エリアを確認

#### 6.3 統計の確認

```bash
# マッピングデータの統計
npx ts-node manage-beppu-area-mapping.ts list
```

## ロールバック手順

問題が発生した場合のロールバック:

### Option 1: コードのみロールバック

```bash
# 変更前のコミットに戻す
git revert <commit-hash>
git push origin main

# サーバーで更新
cd /path/to/backend
git pull origin main
npm run build
pm2 restart backend
```

この場合:
- 別府市の物件は㊶にフォールバック
- マッピングテーブルは残る（将来の再試行のため）

### Option 2: データベースもロールバック

```sql
-- Supabase SQL Editorで実行
DROP TABLE IF EXISTS beppu_area_mapping;
```

### Option 3: 配信エリアを元に戻す

```sql
-- 別府市の物件を㊶に戻す
UPDATE property_listings
SET distribution_areas = '㊶'
WHERE address LIKE '%別府市%'
  AND distribution_areas != '㊶';
```

## トラブルシューティング

### 問題: マイグレーションが失敗する

**症状:**
```
Error: relation "beppu_area_mapping" already exists
```

**解決方法:**
テーブルが既に存在する場合は問題なし。`verify-beppu-area-mapping.ts`で確認。

### 問題: データ投入が失敗する

**症状:**
```
Error: Failed to insert data
```

**確認事項:**
1. テーブルが存在するか
2. Supabase接続が正常か
3. 環境変数が正しいか

**解決方法:**
```bash
# 環境変数を確認
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# テーブルを確認
npx ts-node verify-beppu-area-mapping.ts
```

### 問題: バックフィルが遅い

**症状:**
処理に時間がかかる

**解決方法:**
1. バッチサイズを調整
2. 並列処理を実装
3. オフピーク時間に実行

### 問題: 配信エリアが更新されない

**症状:**
新規物件や住所更新時に配信エリアが設定されない

**確認事項:**
1. サーバーログを確認
2. マッピングデータが存在するか
3. 地域名が正しく抽出されているか

**デバッグ:**
```bash
# マッピングデータを確認
npx ts-node manage-beppu-area-mapping.ts search "地域名"

# ログレベルを上げる
# サーバー起動時に LOG_LEVEL=debug を設定
```

## チェックリスト

デプロイ前:
- [ ] マイグレーションSQLを確認
- [ ] テスト環境で動作確認
- [ ] バックアップを取得

デプロイ中:
- [ ] マイグレーション実行
- [ ] データ投入完了
- [ ] コードデプロイ完了
- [ ] サーバー再起動

デプロイ後:
- [ ] テーブル作成確認
- [ ] データ投入確認（60件）
- [ ] 新規物件作成テスト
- [ ] 住所更新テスト
- [ ] ログ確認
- [ ] バックフィル実行（オプション）

## サポート

問題が発生した場合:
1. ログを確認
2. トラブルシューティングセクションを参照
3. 必要に応じてロールバック
4. 開発チームに連絡

## 次のステップ

デプロイ完了後:
1. ユーザーに新機能を通知
2. フィードバックを収集
3. マッピングデータの追加・更新
4. パフォーマンスの監視
