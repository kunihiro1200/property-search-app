# 物件リスト更新同期修正 - 要件定義

## ステータス: 📝 要件定義完了

## 概要

既存物件のフィールド更新（特にATBB状況）がスプレッドシートからデータベースに自動同期されない問題を修正する。

## 背景

### 診断結果のサマリー

以下の3つの診断specから得られた知見：

1. **property-listing-update-sync-diagnosis**: Phase 1-3完了
   - 既存物件の更新同期が失敗する根本原因を特定
   - AA4885のATBB状況が21日間未更新
   - 手動実行スクリプトは正常動作（8件更新確認）

2. **property-listing-sync-diagnosis**: 診断進行中
   - 自動同期サービスの状態を診断
   - バックエンドサーバーが再起動されていない可能性
   - sync_logsテーブルに記録が0件

3. **property-listing-update-troubleshooting**: トラブルシューティング
   - 実装済み機能が動作していない原因の調査

### 確認された事実

✅ **実装済み**:
- `EnhancedAutoSyncService.syncPropertyListingUpdates()` メソッド
- `PropertyListingSyncService.syncUpdatedPropertyListings()` メソッド
- Phase 4.5 (物件リスト更新同期) の実装

❌ **問題点**:
- 定期同期マネージャーが起動していない
- 自動同期が一度も実行されていない
- AA4885等の既存物件が更新されない

## 目標

1. **修正**: 既存物件の更新同期を正常に動作させる
2. **検証**: AA4885を含む複数の既存物件で更新同期が正常に動作することを確認
3. **監視**: 今後の同期状態を監視できる仕組みを整備
4. **ドキュメント**: 修正内容と運用手順を文書化

## ユーザーストーリー

### US-1: 自動同期の起動

**As a** システム管理者  
**I want to** 定期同期マネージャーが自動的に起動する  
**So that** 手動介入なしで物件情報が最新に保たれる

**受入基準:**
- [ ] バックエンドサーバー起動時に定期同期マネージャーが自動起動する
- [ ] 起動ログに「Enhanced periodic auto-sync enabled」が表示される
- [ ] 5秒後に初回同期が実行される
- [ ] 5分間隔で定期同期が実行される

### US-2: 既存物件の更新同期

**As a** 営業担当者  
**I want to** スプレッドシートで物件情報を更新したら自動的にシステムに反映される  
**So that** 常に最新の物件情報で業務を進められる

**受入基準:**
- [ ] AA4885のATBB状況をスプレッドシートで更新すると、5分以内にDBに反映される
- [ ] 他のフィールド（価格、面積等）の更新も同様に反映される
- [ ] 更新失敗時はエラーログが記録される
- [ ] sync_logsテーブルに同期履歴が記録される

### US-3: 同期状態の監視

**As a** システム管理者  
**I want to** 同期処理の実行状態を確認できる  
**So that** 問題が発生した際に迅速に対応できる

**受入基準:**
- [ ] sync_logsテーブルで最新の同期実行時刻を確認できる
- [ ] 同期成功/失敗の件数を確認できる
- [ ] エラーが発生した場合、詳細なエラーメッセージを確認できる
- [ ] 診断スクリプトで同期状態を簡単に確認できる

### US-4: 手動同期のトリガー

**As a** システム管理者  
**I want to** 必要に応じて手動で同期を実行できる  
**So that** 緊急時や検証時に即座に同期できる

**受入基準:**
- [ ] 手動同期スクリプトが正常に動作する
- [ ] 手動同期と自動同期が競合しない
- [ ] 手動同期の実行結果がログに記録される
- [ ] 手動同期後、次の自動同期が正常にスケジュールされる

## 技術要件

### TR-1: 定期同期マネージャーの起動確認

**実装箇所**: `backend/src/services/EnhancedAutoSyncService.ts`

**確認事項**:
```typescript
// 起動時のログ出力を確認
console.log('✅ EnhancedAutoSyncService initialized');
console.log('📊 Enhanced periodic auto-sync enabled (interval: 5 minutes)');
```

**環境変数**:
```bash
AUTO_SYNC_ENABLED=true
SYNC_INTERVAL_MINUTES=5
```

### TR-2: 更新同期ロジックの検証

**実装箇所**: `backend/src/services/PropertyListingSyncService.ts`

**確認事項**:
- `syncUpdatedPropertyListings()` メソッドが正しく実装されている
- スプレッドシートとDBの差分を正確に検出する
- 変更されたフィールドのみを更新する（効率化）
- トランザクション管理が適切に行われている

**テストケース**:
```typescript
// AA4885のATBB状況更新テスト
const result = await propertyListingSyncService.syncUpdatedPropertyListings();
expect(result.updated).toBeGreaterThan(0);
expect(result.errors).toHaveLength(0);
```

### TR-3: sync_logsテーブルへの記録

**実装箇所**: `backend/migrations/039_add_sync_health.sql`

**記録内容**:
- sync_type: 'property_listing_update'
- status: 'success' | 'error'
- records_processed: 更新件数
- error_message: エラー詳細（失敗時）
- started_at: 開始時刻
- completed_at: 完了時刻

### TR-4: エラーハンドリング

**要件**:
- 部分的な失敗でも他の物件の同期は継続する
- エラー発生時は詳細なログを記録する
- リトライ機能を実装する（最大3回）
- 致命的なエラーは管理者に通知する

**実装例**:
```typescript
try {
  await this.updatePropertyListing(propertyNumber, updates);
  successCount++;
} catch (error) {
  console.error(`Failed to update ${propertyNumber}:`, error);
  errors.push({ propertyNumber, error: error.message });
  // 他の物件の処理は継続
}
```

## 修正計画

### Phase 1: 環境確認と準備（30分）

**タスク**:
1. [ ] 環境変数の確認（AUTO_SYNC_ENABLED=true）
2. [ ] sync_logsテーブルの存在確認
3. [ ] バックエンドサーバーの現在の状態確認
4. [ ] 診断スクリプトの実行

**成果物**:
- 現状確認レポート
- 修正が必要な箇所のリスト

### Phase 2: バックエンドサーバーの再起動（15分）

**タスク**:
1. [ ] 現在のバックエンドプロセスを停止
2. [ ] 環境変数を再確認
3. [ ] バックエンドサーバーを起動
4. [ ] 起動ログで定期同期マネージャーの起動を確認

**期待されるログ**:
```
✅ EnhancedAutoSyncService initialized
📊 Enhanced periodic auto-sync enabled (interval: 5 minutes)
   Using full comparison mode - all missing sellers will be detected
🔄 Starting initial sync in 5 seconds...
```

### Phase 3: 初回同期の確認（10分）

**タスク**:
1. [ ] 5秒後の初回同期実行を確認
2. [ ] sync_logsテーブルに記録が追加されることを確認
3. [ ] AA4885のATBB状況が更新されることを確認
4. [ ] エラーログの確認

**検証スクリプト**:
```bash
# sync_logsテーブルの確認
npx ts-node backend/check-recent-sync-logs.ts

# AA4885の状態確認
npx ts-node backend/check-aa4885-atbb-status.ts
```

### Phase 4: 定期同期の監視（30分）

**タスク**:
1. [ ] 5分後の2回目の同期実行を確認
2. [ ] スプレッドシートでAA4885のATBB状況を手動変更
3. [ ] 次の同期で変更が反映されることを確認
4. [ ] 複数物件での動作確認

**監視コマンド**:
```bash
# リアルタイムでログを監視
tail -f backend/logs/sync.log

# sync_logsテーブルを定期的に確認
watch -n 60 "npx ts-node backend/check-recent-sync-logs.ts"
```

### Phase 5: ドキュメント作成（30分）

**タスク**:
1. [ ] 修正内容のサマリー作成
2. [ ] 運用手順書の作成
3. [ ] トラブルシューティングガイドの作成
4. [ ] 今後の改善提案のリスト作成

**成果物**:
- `IMPLEMENTATION_COMPLETE.md`
- `OPERATION_GUIDE.md`
- `TROUBLESHOOTING.md`
- `FUTURE_IMPROVEMENTS.md`

## 成功基準

### 必須（Must Have）
- [ ] バックエンドサーバー起動時に定期同期マネージャーが自動起動する
- [ ] AA4885のATBB状況更新が5分以内に同期される
- [ ] sync_logsテーブルに同期履歴が記録される
- [ ] エラー発生時に適切なログが記録される

### 推奨（Should Have）
- [ ] 他のフィールドの更新も正常に同期される
- [ ] 手動同期スクリプトが正常に動作する
- [ ] 同期処理のパフォーマンスが許容範囲内（100物件/30秒以内）
- [ ] 診断スクリプトで同期状態を簡単に確認できる

### 任意（Nice to Have）
- [ ] 同期状態のダッシュボード
- [ ] リアルタイム同期の実装
- [ ] 同期履歴の可視化
- [ ] 自動アラート機能

## 非機能要件

### パフォーマンス
- 1物件の更新処理は1秒以内
- 100物件の一括更新は30秒以内
- 同期処理がシステム全体のパフォーマンスに影響しない

### 信頼性
- 同期失敗時は適切なエラーログを記録
- 部分的な失敗でも他の物件の同期は継続
- リトライ機能の実装（最大3回）

### 保守性
- コードは既存の同期処理と一貫性を保つ
- 十分なコメントとドキュメント
- デバッグしやすいログ出力

## 制約条件

1. **既存機能への影響**
   - 新規物件追加の同期機能は変更しない
   - 他のテーブルの同期処理に影響しない
   - 既存のAPIエンドポイントは維持

2. **データ整合性**
   - 更新処理中のデータ不整合を防ぐ
   - ロールバック機能の実装
   - 監査ログの記録

3. **運用環境**
   - 本番環境で実行中のため、サービス停止は最小限にすること
   - バックエンドサーバーの再起動は業務時間外に実施することを推奨

## 関連仕様

### 診断Spec（完了済み）
- `.kiro/specs/property-listing-update-sync-diagnosis/` - Phase 1-3完了
- `.kiro/specs/property-listing-sync-diagnosis/` - 診断進行中
- `.kiro/specs/property-listing-update-troubleshooting/` - トラブルシューティング

### 実装Spec（参照）
- `.kiro/specs/property-listing-atbb-status-auto-sync/` - 新規物件追加時の同期（正常動作中）
- `.kiro/specs/property-listing-auto-sync/` - 自動同期の基本実装

### 関連ファイル
- `backend/src/services/EnhancedAutoSyncService.ts` - 定期同期マネージャー
- `backend/src/services/PropertyListingSyncService.ts` - 同期サービス
- `backend/src/services/PropertyListingColumnMapper.ts` - カラムマッピング
- `backend/migrations/039_add_sync_health.sql` - sync_logsテーブル

## リスク管理

### 高リスク
- **バックエンドサーバーの再起動失敗**: 事前にバックアップを取得し、ロールバック手順を準備
- **データ不整合の発生**: トランザクション管理を徹底し、ロールバック機能を実装

### 中リスク
- **パフォーマンス劣化**: 同期処理の最適化とモニタリングを実施
- **エラーの見落とし**: 詳細なログ記録とアラート機能を実装

### 低リスク
- **ドキュメント不足**: 修正と並行してドキュメントを作成
- **運用手順の不明確さ**: 運用手順書を作成し、レビューを実施

## タイムライン

### 即座に実行（2時間）
- Phase 1: 環境確認と準備（30分）
- Phase 2: バックエンドサーバーの再起動（15分）
- Phase 3: 初回同期の確認（10分）
- Phase 4: 定期同期の監視（30分）
- Phase 5: ドキュメント作成（30分）

### 継続的な監視（1週間）
- 毎日sync_logsテーブルを確認
- エラー発生時は即座に対応
- パフォーマンスメトリクスの収集

### 改善フェーズ（1ヶ月後）
- 収集したメトリクスを分析
- パフォーマンス最適化
- 追加機能の検討

## 次のステップ

1. **このrequirements.mdをレビュー**
   - 内容が正確か確認
   - 不足している要件がないか確認
   - 優先順位が適切か確認

2. **design.mdの作成**
   - 技術的な設計詳細
   - アーキテクチャ図
   - シーケンス図

3. **tasks.mdの作成**
   - 具体的な実装タスク
   - タスクの依存関係
   - 担当者の割り当て

4. **実装開始**
   - Phase 1から順次実行
   - 各フェーズ完了後に検証
   - ドキュメントの更新

## 備考

- この修正specは診断specの結果を基に作成されています
- 最も可能性が高い解決策は「バックエンドサーバーの再起動」です
- 実装済みの機能を活用するため、コード変更は最小限に抑えます
- 修正後は継続的な監視が重要です

---

**作成日**: 2025-01-11  
**最終更新**: 2025-01-11  
**ステータス**: 要件定義完了 → design.md作成待ち
