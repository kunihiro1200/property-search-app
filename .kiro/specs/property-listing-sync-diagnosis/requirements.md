# 物件リスト同期問題診断 - Requirements

## Status: 🔍 DIAGNOSIS IN PROGRESS

## 問題の概要

物件リストとスプレッドシートの同期が正常に機能していない。

### 具体的な症状

1. **新規物件の同期失敗**
   - AA13226等の物件がスプレッドシートには存在する
   - しかしブラウザの物件リストに表示されない

2. **既存物件の更新同期失敗**
   - AA4885はブラウザに存在している
   - しかしATBB状況の更新が反映されていない（21日間未更新）

## 既知の事実

### ✅ 実装状況
- Phase 4.5 (物件リスト更新同期) は **既に実装済み**
- `EnhancedAutoSyncService.syncPropertyListingUpdates()` メソッドが存在
- `PropertyListingSyncService.syncUpdatedPropertyListings()` メソッドが存在
- 手動実行スクリプトは正常に動作（8件更新確認済み）

### ❌ 問題点
- 定期同期マネージャーが起動していない
- sync_logsテーブルに記録が0件
- AA4885の最終更新: 2025-12-17（21日前）
- 自動同期が一度も実行されていない

### 🎯 根本原因（推定）
バックエンドサーバーが再起動されていないため、定期同期マネージャーが起動していない。

## User Stories

### US-1: 自動同期サービスの状態診断

**As a** システム管理者  
**I want to** 自動同期サービスの現在の状態を確認したい  
**So that** なぜ同期が実行されていないのかを理解できる

**受入基準:**
- [ ] EnhancedAutoSyncServiceの初期化状態を確認できる
- [ ] 定期同期マネージャーの実行状態を確認できる
- [ ] 最後の同期実行時刻を確認できる
- [ ] sync_logsテーブルの内容を確認できる

### US-2: 新規物件同期の診断

**As a** システム管理者  
**I want to** AA13226がスプレッドシートに存在するがDBに存在しない原因を特定したい  
**So that** 新規物件の同期機能を修正できる

**受入基準:**
- [ ] AA13226がスプレッドシートに存在することを確認
- [ ] AA13226がデータベースに存在しないことを確認
- [ ] 新規物件追加の同期ロジックを確認
- [ ] Phase 4（新規物件追加）が実行されているか確認

**注意**: Phase 4.5は「更新同期」であり、「新規追加」ではない。新規物件の追加は別のフェーズで処理される必要がある。

### US-3: 既存物件更新同期の診断

**As a** システム管理者  
**I want to** AA4885のATBB状況更新が反映されない原因を特定したい  
**So that** 更新同期機能を修正できる

**受入基準:**
- [ ] AA4885のスプレッドシート上のATBB状況を確認
- [ ] AA4885のデータベース上のATBB状況を確認
- [ ] 最終更新日時を確認（現在: 21日前）
- [ ] Phase 4.5が実行されているか確認

### US-4: バックエンドサーバーの起動状態確認

**As a** システム管理者  
**I want to** バックエンドサーバーが正しく起動しているか確認したい  
**So that** 定期同期マネージャーが起動しているかを把握できる

**受入基準:**
- [ ] バックエンドサーバーのプロセスが実行中か確認
- [ ] 起動ログで定期同期マネージャーの起動を確認
- [ ] AUTO_SYNC_ENABLED環境変数を確認
- [ ] 5秒後の自動同期開始ログを確認

## Technical Requirements

### TR-1: 診断スクリプトの実行

**目的**: 現在の状態を包括的に診断する

**実装**:
```bash
# 既存の診断スクリプトを実行
npx ts-node backend/diagnose-auto-sync-service.ts
```

**確認項目**:
1. 環境変数の設定状態
2. EnhancedAutoSyncServiceの初期化
3. 定期同期マネージャーの実行状態
4. バックエンドサーバーの起動状態
5. 物件リスト更新同期の手動テスト結果

### TR-2: 新規物件追加機能の確認

**問題**: AA13226がスプレッドシートに存在するがDBに存在しない

**確認事項**:
- PropertyListingSyncService に新規物件追加機能があるか？
- EnhancedAutoSyncService のどのフェーズで新規物件を追加するか？
- Phase 4.5は「更新同期」のみで「新規追加」は含まれていない可能性

**調査スクリプト**:
```typescript
// backend/diagnose-aa13226-sync.ts
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function diagnoseAA13226() {
  // 1. スプレッドシートで検索
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
    sheetName: '物件',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  const allData = await sheetsClient.readAll();
  const aa13226 = allData.find(row => row['物件番号'] === 'AA13226');
  
  console.log('スプレッドシート:', aa13226 ? '存在' : '不在');
  if (aa13226) {
    console.log('データ:', aa13226);
  }
  
  // 2. データベースで検索
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: dbData } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13226');
  
  console.log('データベース:', dbData?.length ? '存在' : '不在');
  
  if (aa13226 && !dbData?.length) {
    console.log('❌ 同期されていません');
    console.log('原因: 新規物件追加の同期が実行されていない');
  }
}

diagnoseAA13226();
```

### TR-3: バックエンドサーバーの再起動

**目的**: 定期同期マネージャーを起動する

**手順**:
```bash
cd backend
npm run dev
```

**期待される起動ログ**:
```
✅ EnhancedAutoSyncService initialized
📊 Enhanced periodic auto-sync enabled (interval: 5 minutes)
   Using full comparison mode - all missing sellers will be detected
```

**確認事項**:
- 5秒後に初回同期が実行される
- Phase 4.5のログが表示される
- sync_logsテーブルに記録が追加される

## Success Criteria

### 診断フェーズ
- [ ] 自動同期サービスの状態を正確に把握
- [ ] AA13226が同期されない原因を特定
- [ ] AA4885が更新されない原因を特定
- [ ] 根本原因を明確に文書化

### 修正フェーズ（診断後に決定）
- [ ] バックエンドサーバーを再起動（最も可能性が高い解決策）
- [ ] 新規物件追加機能が不足している場合は実装
- [ ] 自動同期が正常に動作することを確認
- [ ] AA13226がDBに追加される
- [ ] AA4885のATBB状況が更新される

## Non-Functional Requirements

### NFR-1: 診断の迅速性
- 診断スクリプトは5分以内に完了すること
- 問題の原因を明確に特定できること

### NFR-2: 修正の安全性
- 既存データを破壊しないこと
- ロールバック可能な修正方法を採用すること

## Constraints

1. 本番環境で実行中のため、サービス停止は最小限にすること
2. データの整合性を最優先すること
3. 修正後は必ず検証を実施すること

## Dependencies

- EnhancedAutoSyncService
- PropertyListingSyncService
- GoogleSheetsClient
- Supabaseデータベース
- sync_logsテーブル（Migration 039）

## Related Documents

- `.kiro/specs/property-listing-auto-sync/` - 既存の実装spec
- `AA4885_物件リスト同期問題_診断完了_最終版.md` - 診断結果
- `backend/AA4885_ATBB_STATUS_SYNC_DIAGNOSIS.md` - 詳細診断
- `PROPERTY_LISTING_AUTO_SYNC_DIAGNOSTIC.md` - 実装確認

## Timeline

### Phase 1: 診断（1時間）
- [ ] 既存の診断スクリプトを実行
- [ ] AA13226の状態を確認
- [ ] AA4885の状態を確認
- [ ] 根本原因を特定

### Phase 2: 修正（30分）
- [ ] バックエンドサーバーを再起動
- [ ] 起動ログを確認
- [ ] 5分待機して自動同期を確認

### Phase 3: 検証（30分）
- [ ] AA4885が更新されることを確認
- [ ] AA13226が追加されることを確認（新規追加機能がある場合）
- [ ] sync_logsテーブルを確認

**合計時間**: 約2時間

## Conclusion

この診断specの目的は、**なぜ実装済みの自動同期が動作していないのか**を明確にすることです。

**最も可能性が高い原因**: バックエンドサーバーが再起動されていない

**次のステップ**:
1. 診断スクリプトを実行して現状を確認
2. バックエンドサーバーを再起動
3. 自動同期が正常に動作することを確認
4. 新規物件追加機能が不足している場合は追加実装を検討
