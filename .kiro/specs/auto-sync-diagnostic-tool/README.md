# Auto-Sync Diagnostic Tool

## Overview

自動同期システムの健全性を診断するコマンドラインツールです。同期ログ、データの鮮度、エラー状況、環境変数を確認し、問題の特定と解決策を提示します。

## Quick Start

```bash
cd backend
npm run diagnose-sync
```

## Documentation

### Spec Documents
- [requirements.md](./requirements.md) - 要件定義
- [design.md](./design.md) - 設計ドキュメント
- [tasks.md](./tasks.md) - タスク一覧
- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - 実装完了レポート

### User Guides
- [backend/AUTO_SYNC_DIAGNOSTIC_GUIDE.md](../../../backend/AUTO_SYNC_DIAGNOSTIC_GUIDE.md) - 詳細ガイド
- [backend/今すぐ実行_自動同期診断.md](../../../backend/今すぐ実行_自動同期診断.md) - クイックリファレンス

## Features

### Diagnostic Checks
1. **Sync Log Verification** - 最新10件の同期ログを確認
2. **Data Freshness Check** - 最終更新日時を確認（24時間警告）
3. **Data Count Verification** - レコード総数を確認
4. **Error Log Analysis** - 最新5件のエラーを分析
5. **Environment Variable Check** - 必要な環境変数を確認
6. **Actionable Recommendations** - 具体的な対処方法を提示

### Output Format
- ✅ Success indicators
- ⚠️ Warning indicators
- ❌ Error indicators
- Clear, actionable recommendations

## Implementation Files

### Core Files
- `backend/diagnose-auto-sync-status.ts` - Main diagnostic script
- `backend/package.json` - npm script definition

### Documentation
- `backend/AUTO_SYNC_DIAGNOSTIC_GUIDE.md` - Comprehensive user guide
- `backend/今すぐ実行_自動同期診断.md` - Quick reference (Japanese)

## Usage Examples

### Basic Execution
```bash
npm run diagnose-sync
```

### Direct Execution
```bash
npx ts-node diagnose-auto-sync-status.ts
```

## Troubleshooting

### No Sync Logs Found
```bash
# Run manual sync
npm run sync-property-listings
npm run sync-buyers
```

### Data Not Updated (>24 hours)
1. Check if backend server is running
2. Verify `AUTO_SYNC_ENABLED=true` in .env
3. Restart server

### Missing Environment Variables
1. Open `backend/.env`
2. Add required variables:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
3. Restart server

## Recommended Usage

Run diagnostics:
- When new data doesn't appear
- Weekly health checks
- After deployments
- When errors are reported

## Related Specs

- [auto-sync-reliability](../auto-sync-reliability/) - Auto-sync system improvements
- [spreadsheet-sync-integration](../spreadsheet-sync-integration/) - Spreadsheet sync implementation

## Status

✅ **COMPLETE** - All tasks implemented and tested

### Completed Tasks
- ✅ Diagnostic script created
- ✅ npm script added
- ✅ User guides created
- ✅ Spec documents created
- ✅ Implementation complete

### Pending Tasks
- ⏳ Production testing
- ⏳ User feedback collection

## Technical Details

### Dependencies
- `@supabase/supabase-js` - Database access
- `dotenv` - Environment variable loading

### Database Tables
- `sync_logs` - Sync execution history
- `property_listings` - Property data
- `buyers` - Buyer data

### Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `GOOGLE_SHEETS_SPREADSHEET_ID` - Spreadsheet ID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Service account private key

## Support

For issues or questions:
1. Run the diagnostic tool
2. Copy the output
3. Share with the development team
4. Refer to the troubleshooting guide

## Version History

- **v1.0.0** (2026-01-06) - Initial implementation
  - Sync log verification
  - Data freshness checks
  - Error log analysis
  - Environment variable validation
  - Actionable recommendations
