# Vercel デプロイメント修正ガイド

## 🔍 問題の概要

Vercelにデプロイした後、フロントエンドが`localhost:3000`に接続しようとしてエラーが発生しています。

**エラー内容**:
- `Failed to load resource: ERR_CONNECTION_REFUSED localhost:3000/api/...`
- `TypeError: Failed to fetch`

## ✅ 実施済みの修正

### コード修正（2026-01-17）

以下のファイルで`localhost:3000`のハードコードを環境変数に置き換えました：

1. ✅ `frontend/src/pages/PublicPropertiesPage.tsx`
   - `fetchProperties()`関数内
   - `fetchAllProperties()`関数内
   
2. ✅ `frontend/src/components/PropertyMapView.tsx`
   - `extractCoordinatesFromGoogleMapUrl()`関数内

すべての箇所で以下のように修正：
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const response = await fetch(`${apiUrl}/api/...`);
```

## 🔧 次のステップ：Vercel環境変数の確認と設定

### 1. 重要な環境変数

Vercelダッシュボードで以下の環境変数が**Production環境**に設定されているか確認してください：

| 環境変数名 | 値 | 用途 |
|-----------|-----|------|
| `VITE_SUPABASE_URL` | `https://krxhrbtlgfjzsseegaqq.supabase.co` | Supabase接続 |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase認証 |
| `VITE_API_URL` | **要設定** | バックエンドAPI URL |
| `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyD2igeXY-E_MWtJwMYpiv6CYpEiLJuDeYE` | Google Maps |

### 2. VITE_API_URLの設定について

**重要**: このプロジェクトはフロントエンドのみのデプロイです。

#### 🎯 推奨オプション：バックエンドAPIを別途デプロイ

バックエンドAPIは`backend/`ディレクトリに存在し、以下のエンドポイントを提供しています：
- `/api/public/properties` - 公開物件一覧
- `/api/url-redirect/resolve` - 短縮URL解決

**バックエンドのデプロイ方法**:
1. 新しいVercelプロジェクトを作成
2. Root Directoryを`backend`に設定
3. デプロイ後、URLを`VITE_API_URL`に設定

**または**、既存のバックエンドサーバーがある場合はそのURLを設定してください。

### 3. 環境変数の確認・設定方法

#### ステップ1: Vercelダッシュボードを開く

1. https://vercel.com/dashboard にアクセス
2. プロジェクト「baikyaku-property-site3」を選択
3. 「Settings」タブをクリック
4. 左サイドバーから「Environment Variables」を選択

#### ステップ2: 環境変数を確認

各環境変数の「Environment」列を確認：
- ✅ **Production**にチェックが入っているか確認
- ✅ **Preview**にもチェックを入れることを推奨
- ✅ **Development**にもチェックを入れることを推奨

#### ステップ3: VITE_API_URLを追加

1. 「Add New」ボタンをクリック
2. 以下を入力：
   - **Name**: `VITE_API_URL`
   - **Value**: バックエンドAPIのURL（例: `https://your-backend-api.vercel.app`）
   - **Environment**: Production, Preview, Development すべてにチェック
3. 「Save」をクリック

### 4. 再デプロイの実行

環境変数を変更した後は**必ず再デプロイ**が必要です：

1. Vercelダッシュボードの「Deployments」タブを開く
2. 最新のデプロイメントを見つける
3. 右側の「...」メニューをクリック
4. 「Redeploy」を選択
5. 「Redeploy」ボタンをクリック
6. ビルドが完了するまで待つ（通常1-2分）

## 🐛 トラブルシューティング

### ブラウザコンソールでエラーを確認

1. サイトを開く: https://baikyaku-property-site3.vercel.app/public/properties
2. F12キーを押して開発者ツールを開く
3. 「Console」タブを確認
4. エラーメッセージをコピー

### よくあるエラーと対処法

#### ❌ `Failed to fetch` エラー
**原因**: `VITE_API_URL`が設定されていない、またはバックエンドAPIが動作していない

**対処法**:
1. Vercelの環境変数で`VITE_API_URL`を確認
2. バックエンドAPIのデプロイ状況を確認
3. バックエンドAPIのURLが正しいか確認

#### ❌ `localhost:3000` への接続エラー
**原因**: 環境変数が反映されていない

**対処法**:
1. 再デプロイを実行
2. ブラウザキャッシュをクリア（Ctrl+Shift+Delete）
3. シークレットモードで確認

#### ❌ 環境変数が反映されない
**原因**: 再デプロイが必要

**対処法**:
1. 再デプロイを実行
2. ビルドログを確認（エラーがないか）
3. ブラウザのキャッシュをクリア
4. シークレットモードで確認

#### ❌ ビルドは成功するが実行時エラー
**原因**: 環境変数の名前が間違っている

**対処法**:
1. 環境変数名に`VITE_`プレフィックスがあるか確認
2. スペルミスがないか確認
3. 大文字小文字が正しいか確認

## 📋 確認チェックリスト

再デプロイ前に以下を確認してください：

- [ ] `VITE_SUPABASE_URL`がProductionに設定されている
- [ ] `VITE_SUPABASE_ANON_KEY`がProductionに設定されている
- [ ] `VITE_API_URL`がProductionに設定されている
- [ ] `VITE_GOOGLE_MAPS_API_KEY`がProductionに設定されている
- [ ] すべての環境変数名が正しい（`VITE_`プレフィックス付き）
- [ ] バックエンドAPIがデプロイされている（または代替手段を用意）
- [ ] 再デプロイを実行した
- [ ] ビルドが成功した
- [ ] ブラウザキャッシュをクリアした

## 🎯 次のアクション

### 今すぐ実行すべきこと

1. **Vercelダッシュボードで環境変数を確認**
   - https://vercel.com/dashboard
   - プロジェクト「baikyaku-property-site3」→ Settings → Environment Variables

2. **VITE_API_URLを設定**
   - バックエンドAPIのURLを設定
   - または、バックエンドを別途デプロイ

3. **再デプロイを実行**
   - Deployments タブ → 最新デプロイ → ... → Redeploy

4. **動作確認**
   - https://baikyaku-property-site3.vercel.app/public/properties
   - ブラウザコンソールでエラーがないか確認

### 確認後の報告

以下の情報を確認してください：
- [ ] 環境変数`VITE_API_URL`の値
- [ ] 再デプロイの結果（成功/失敗）
- [ ] ブラウザコンソールのエラーメッセージ（あれば）

## 📚 関連ドキュメント

- `VERCEL_ENV_VARIABLES.md` - 環境変数の一覧
- `POST_DEPLOYMENT_CHECKLIST.md` - デプロイ後の確認事項
- `DEPLOYMENT.md` - デプロイ手順の詳細
