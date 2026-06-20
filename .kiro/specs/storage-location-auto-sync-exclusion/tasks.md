# 格納先URL自動同期除外機能 - タスクリスト

## 実装タスク

### 1. PropertyListingSyncService.tsの修正

- [ ] 1.1 `detectChanges()`メソッドに`storage_location`のスキップロジックを追加
  - ファイル: `backend/src/services/PropertyListingSyncService.ts`
  - 行番号: 約815行目（`image_url`のスキップロジックの直後）
  - 実装内容:
    ```typescript
    // ⚠️ 重要: storage_locationは手動更新ボタンで管理されるため、自動同期から除外
    if (dbField === 'storage_location') {
      console.log(`[PropertyListingSyncService] Skipping storage_location comparison (managed by manual refresh)`);
      continue;
    }
    ```

### 2. 動作確認

- [ ] 2.1 ローカル環境で動作確認
  - CC6の格納先URLを手動更新
  - データベースの`storage_location`を確認
  - 自動同期を実行（または待機）
  - データベースの`storage_location`が変更されていないことを確認

- [ ] 2.2 本番環境で動作確認
  - Vercelにデプロイ
  - CC6の格納先URLを手動更新
  - 自動同期を実行（または待機）
  - 画像が正しく表示されることを確認

### 3. ログ確認

- [ ] 3.1 Vercelログで`storage_location`のスキップログを確認
  - Vercel Dashboard → Functions → `/api/cron/sync-property-listings`
  - ログに「Skipping storage_location comparison」が出力されていることを確認

### 4. ドキュメント更新

- [ ] 4.1 ステアリングルールを更新
  - `.kiro/steering/storage-location-manual-flag-implementation.md`を更新
  - 実装完了の記録を追加

- [ ] 4.2 セッション記録を作成
  - `.kiro/steering/archive/session-2026-01-26-storage-location-auto-sync-exclusion.md`を作成
  - 実装の詳細と動作確認結果を記録

## テストタスク

### 5. 単体テスト（オプション）

- [ ]* 5.1 `detectChanges()`メソッドのテストを追加
  - `storage_location`がスキップされることを確認
  - 他のフィールドは引き続き比較されることを確認

### 6. 統合テスト（オプション）

- [ ]* 6.1 `syncUpdatedPropertyListings()`のテストを追加
  - 手動更新した`storage_location`が保持されることを確認
  - 他のフィールドは自動同期されることを確認

## デプロイタスク

### 7. Git操作

- [ ] 7.1 変更をコミット
  ```bash
  git add backend/src/services/PropertyListingSyncService.ts
  git commit -m "Fix: Exclude storage_location from auto-sync to preserve manual updates"
  ```

- [ ] 7.2 GitHubにプッシュ
  ```bash
  git push
  ```

- [ ] 7.3 Vercelの自動デプロイを確認
  - Vercel Dashboard でデプロイ状況を確認
  - デプロイ完了まで2-3分待機

## 完了チェックリスト

- [ ] `storage_location`のスキップロジックが実装されている
- [ ] ローカル環境で動作確認済み
- [ ] 本番環境で動作確認済み
- [ ] Vercelログで確認済み
- [ ] ドキュメントが更新されている
- [ ] GitHubにプッシュ済み
- [ ] Vercelにデプロイ済み

---

**作成日**: 2026年1月26日  
**ステータス**: 準備完了
