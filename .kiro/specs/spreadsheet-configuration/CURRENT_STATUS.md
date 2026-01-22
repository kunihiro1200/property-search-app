# Google Service Account 設定状況

## ✅ 現在の状態

Google Service Accountの設定は**既に完了**しています。

### 設定済みの環境変数

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=spreadsheet-sync@seller-management-personal.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

## 📋 設定済みのスプレッドシート

| 項目 | スプレッドシートID | シート名 | 状態 |
|------|-------------------|---------|------|
| 売主リスト | `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I` | 売主リスト | ✅ 設定済み |
| 業務リスト | `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I` | - | ✅ 設定済み |
| 買主リスト | `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY` | 買主リスト | ✅ 設定済み |
| 追客履歴 | `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I` | 売主追客ログ | ✅ 設定済み |
| 物件リスト | `your_spreadsheet_id_here` | 物件リスト | ⚠️ 未設定 |

## ⚠️ 未設定の項目

### 物件リストスプレッドシート

現在、以下の環境変数がプレースホルダーのままです：

```env
PROPERTY_LISTING_SPREADSHEET_ID=your_spreadsheet_id_here
PROPERTY_LISTING_SHEET_NAME=物件リスト
```

## 🔧 物件リストを設定する場合

### 1. スプレッドシートIDの取得

1. 物件リストのGoogleスプレッドシートを開く
2. URLバーからURLをコピー
3. URL形式: `https://docs.google.com/spreadsheets/d/【ここがID】/edit`
4. `/d/` と `/edit` の間の文字列がスプレッドシートID

### 2. 環境変数の更新

`backend/.env` ファイルを開いて、以下を更新：

```env
PROPERTY_LISTING_SPREADSHEET_ID=<取得したスプレッドシートID>
PROPERTY_LISTING_SHEET_NAME=物件リスト
```

### 3. アクセス権限の付与

1. 物件リストのスプレッドシートを開く
2. 右上の「共有」ボタンをクリック
3. 以下のメールアドレスを追加：
   ```
   spreadsheet-sync@seller-management-personal.iam.gserviceaccount.com
   ```
4. 権限を「編集者」に設定
5. 「送信」をクリック

### 4. 設定の確認

```bash
cd backend
npx ts-node verify-spreadsheet-config.ts
```

## 📚 関連ドキュメント

- [requirements.md](./requirements.md) - 詳細な要件定義
- [GOOGLE_SERVICE_ACCOUNT_SETUP.md](../spreadsheet-sync-integration/GOOGLE_SERVICE_ACCOUNT_SETUP.md) - 詳細なセットアップガイド
- [VERIFICATION_GUIDE.md](../spreadsheet-sync-integration/VERIFICATION_GUIDE.md) - 動作確認手順

## 💡 KIROでできること

KIROは以下のサポートが可能です：

1. ✅ `.env`ファイルの内容確認・編集
2. ✅ 設定手順のガイド提供
3. ✅ 検証スクリプトの実行サポート
4. ❌ Google Cloud Consoleでの操作（ブラウザで手動実行が必要）
5. ❌ スプレッドシートへの権限付与（ブラウザで手動実行が必要）

## 🎯 次のステップ

物件リストの同期が必要な場合：

1. 上記の手順で物件リストスプレッドシートIDを設定
2. サービスアカウントに権限を付与
3. 検証スクリプトで確認
4. バックエンドを再起動

物件リストの同期が不要な場合：

- 現在の設定で問題なく動作します
- 他のスプレッドシート（売主、買主、業務、追客履歴）は既に設定済みです

## ✨ まとめ

- **Google Service Accountの設定は完了済み**
- **主要なスプレッドシート（売主、買主、業務、追客履歴）は設定済み**
- **物件リストのみ未設定**（必要に応じて設定）

何か質問があれば、お気軽にお聞きください！
