# 公開フォルダ機能拡張 - athome公開フォルダ対応 - タスク

## フェーズ1: 実装

### Task 1.1: PropertyImageService.tsの修正 ⏳
- [ ] `getPublicFolderIdIfExists()`メソッドの修正
- [ ] "athome公開"フォルダ検索の追加
- [ ] 検索順序の実装（athome公開 → atbb公開 → 親フォルダ）
- [ ] ログ出力の追加

**ファイル**: `backend/src/services/PropertyImageService.ts`

**変更内容**:
```typescript
// 変更前: "atbb公開"のみ検索
const publicFolderId = await this.driveService.findFolderByName(parentFolderId, 'atbb公開');

// 変更後: "athome公開" → "atbb公開" の順で検索
const athomeFolderId = await this.driveService.findFolderByName(parentFolderId, 'athome公開');
if (athomeFolderId) return athomeFolderId;

const atbbFolderId = await this.driveService.findFolderByName(parentFolderId, 'atbb公開');
if (atbbFolderId) return atbbFolderId;
```

### Task 1.2: ログ出力の改善
- [ ] どのフォルダが使用されたかをログに記録
- [ ] デバッグ時に問題を特定しやすくする
- [ ] エラーハンドリングのログを追加

## フェーズ2: テスト

### Task 2.1: テストスクリプトの作成
- [ ] AA13129での動作確認スクリプト作成
- [ ] "atbb公開"フォルダを持つ物件のテストスクリプト作成
- [ ] 公開フォルダがない物件のテストスクリプト作成

**ファイル**: `backend/test-aa13129-athome-public-folder.ts`

### Task 2.2: 統合テストの実行
- [ ] AA13129で"athome公開"フォルダの1枚の画像のみが返されることを確認
- [ ] "atbb公開"フォルダを持つ物件で既存機能が正常に動作することを確認
- [ ] 公開フォルダがない物件で親フォルダの画像が返されることを確認

### Task 2.3: 回帰テストの実行
- [ ] 既存の物件に影響がないことを確認
- [ ] パフォーマンスに影響がないことを確認
- [ ] キャッシュが正しく動作することを確認

## フェーズ3: 検証

### Task 3.1: 公開物件サイトでの確認
- [ ] AA13129の公開物件ページを開く
- [ ] 1枚の画像のみが表示されることを確認
- [ ] 画像が正しく表示されることを確認

### Task 3.2: ログの確認
- [ ] バックエンドログで`✅ Found "athome公開" subfolder:`が表示されることを確認
- [ ] 使用されているフォルダIDが正しいことを確認
- [ ] エラーログがないことを確認

### Task 3.3: ユーザーへの報告
- [ ] 修正内容の説明
- [ ] 動作確認の依頼
- [ ] フィードバックの収集

## 優先度
**HIGH** - ユーザーが報告した実際のバグ

## 担当
AI Assistant

## 現在のステータス
🟡 フェーズ1: 実装準備完了 - requirements.md, design.md, tasks.md更新完了
