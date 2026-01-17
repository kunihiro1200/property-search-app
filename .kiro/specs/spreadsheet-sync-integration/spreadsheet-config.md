# Spreadsheet Configuration

## Google Spreadsheet Details

- **Spreadsheet ID**: `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I`
- **Sheet Name**: `売主リスト`
- **Data Volume**: 約10,000行
- **URL**: `https://docs.google.com/spreadsheets/d/1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I/edit`

## Access Configuration

### Service Account Setup

1. Google Cloud Consoleでサービスアカウントを作成
2. Google Sheets APIを有効化
3. サービスアカウントのJSONキーをダウンロード
4. スプレッドシートにサービスアカウントのメールアドレスを編集者として追加

### Environment Variables

```env
# backend/.env
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
GOOGLE_SHEETS_SHEET_NAME=売主リスト
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Column Mapping

スプレッドシートのカラムとSupabaseのカラムのマッピングは、実際のスプレッドシートの構造を確認後に定義します。

基本的なマッピング例:
- スプレッドシート「売主番号」→ Supabase `seller_number`
- スプレッドシート「氏名」→ Supabase `name`
- スプレッドシート「住所」→ Supabase `address`
- スプレッドシート「電話番号」→ Supabase `phone_number`
- etc.

## Sync Strategy

- **Direction**: Supabase → Spreadsheet (一方向)
- **Trigger**: ブラウザでのCRUD操作後、即座に同期
- **Batch Size**: 100件ずつ処理
- **Rate Limit**: Google Sheets API制限（100リクエスト/100秒）を遵守
