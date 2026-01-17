# 別府市住所ベースエリアマッピング - クイックスタート

## 🚀 5分で始める

### 前提条件
- Supabaseプロジェクトへのアクセス
- 環境変数の設定（SUPABASE_URL, SUPABASE_SERVICE_KEY）

### Step 1: データベースセットアップ（2分）

1. Supabase SQL Editorを開く
2. 以下のコマンドでSQLをコピー:
```bash
cat backend/migrations/048_add_beppu_area_mapping.sql
```
3. SQL Editorに貼り付けて実行

### Step 2: データ投入（1分）

```bash
cd backend
npx ts-node populate-beppu-area-mapping.ts
```

期待される出力:
```
✅ Beppu area mapping data population completed successfully!
Total: 60 regions
```

### Step 3: 確認（1分）

```bash
npx ts-node verify-beppu-area-mapping.ts
```

期待される出力:
```
✓ Table exists and is accessible
✓ Current row count: 60
```

### Step 4: コードデプロイ（1分）

```bash
# 変更をコミット
git add .
git commit -m "feat: Add Beppu address-based area mapping"
git push

# サーバーで更新
git pull
npm run build
pm2 restart backend
```

### Step 5: 動作確認（1分）

管理画面で新しい物件を作成:
- 住所: "別府市南立石一区1-2-3"
- 保存後、配信エリアが "⑨㊷" になることを確認

## ✅ 完了！

これで別府市の物件に詳細なエリア番号が自動的に設定されるようになりました。

## 📚 次のステップ

### オプション: 既存物件の更新

```bash
# Dry runで確認
npx ts-node backfill-beppu-distribution-areas.ts --dry-run

# 実際に更新
npx ts-node backfill-beppu-distribution-areas.ts --force
```

### 詳細なドキュメント

- **使い方**: `IMPLEMENTATION_GUIDE.md`
- **デプロイ**: `DEPLOYMENT_GUIDE.md`
- **完了報告**: `IMPLEMENTATION_COMPLETE.md`

## 🔧 よく使うコマンド

### マッピングデータの管理

```bash
# 全マッピングを表示
npx ts-node manage-beppu-area-mapping.ts list

# 地域を検索
npx ts-node manage-beppu-area-mapping.ts search "荘園"

# 新しい地域を追加
npx ts-node manage-beppu-area-mapping.ts add "青山中学校" "新地域" "⑨㊷"
```

### トラブルシューティング

```bash
# データを確認
npx ts-node verify-beppu-area-mapping.ts

# ログを確認
pm2 logs backend --lines 50
```

## 💡 ヒント

### 配信エリアの意味

- **⑨-⑮**: 学校区（青山、中部、北部、朝日、東山、鶴見台、別府西）
- **㊷**: 別府駅周辺
- **㊸**: 鉄輪線より下
- **㊶**: 別府市全体（フォールバック）

### 地域名の抽出優先順位

1. 丁目付き（例: "東荘園4丁目"）
2. 区付き（例: "南立石一区"）
3. 町付き（例: "荘園北町"）
4. その他（例: "荘園"）

## ❓ 問題が発生した場合

1. `IMPLEMENTATION_GUIDE.md`のトラブルシューティングを確認
2. ログを確認: `pm2 logs backend`
3. データを確認: `npx ts-node verify-beppu-area-mapping.ts`

## 📞 サポート

詳細なドキュメントを参照:
- 実装ガイド: `IMPLEMENTATION_GUIDE.md`
- デプロイ手順: `DEPLOYMENT_GUIDE.md`
- 完了報告: `IMPLEMENTATION_COMPLETE.md`
