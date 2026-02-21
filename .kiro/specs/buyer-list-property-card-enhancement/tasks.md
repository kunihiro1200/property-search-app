# 買主リスト - 物件情報カード改善 タスクリスト

## 📋 タスク概要

買主詳細ページの物件情報カードに以下の機能を追加：
1. 物件番号のコピー機能
2. atbb_statusの表示
3. ステアリングドキュメントの最適化

---

## ✅ タスクリスト

### Phase 1: PropertyInfoCard.tsxの修正

- [x] 1. 型定義の更新
  - [x] 1.1 `PropertyFullDetails`インターフェースに`atbb_status?: string`を追加
  - [x] 1.2 型定義が正しく反映されているか確認

- [x] 2. Stateの追加
  - [x] 2.1 `snackbarOpen`のStateを追加（初期値: false）
  - [x] 2.2 `snackbarMessage`のStateを追加（初期値: ''）

- [x] 3. コピー機能の実装
  - [x] 3.1 `handleCopyPropertyNumber`関数を実装
    - [x] 3.1.1 物件番号が存在しない場合は早期リターン
    - [x] 3.1.2 `navigator.clipboard.writeText()`でコピー
    - [x] 3.1.3 成功時にスナックバーを表示
    - [x] 3.1.4 失敗時にエラーメッセージを表示
  - [x] 3.2 `handleSnackbarClose`関数を実装

- [x] 4. 物件番号セクションの修正
  - [x] 4.1 既存の物件番号セクションを特定
  - [x] 4.2 Boxコンポーネントで横並びレイアウトに変更
  - [x] 4.3 物件番号テキストを配置
  - [x] 4.4 コピーボタン（IconButton + ContentCopyIcon）を追加
  - [x] 4.5 atbb_statusを条件付きで表示
  - [x] 4.6 スタイリングを調整（gap, padding等）

- [x] 5. スナックバーの追加
  - [x] 5.1 Snackbarコンポーネントを追加
  - [x] 5.2 `open`, `autoHideDuration`, `onClose`, `message`を設定
  - [x] 5.3 `anchorOrigin`を設定（bottom, center）

- [x] 6. Importの追加
  - [x] 6.1 `Snackbar`をMUIからimport
  - [x] 6.2 `ContentCopy as ContentCopyIcon`をMUI Iconsからimport

- [-] 7. ローカルテスト
  - [x] 7.1 開発サーバーを起動
  - [ ] 7.2 買主詳細ページを開く
  - [ ] 7.3 物件情報カードが表示されることを確認
  - [ ] 7.4 コピーボタンをクリックしてコピー機能をテスト
  - [ ] 7.5 atbb_statusが表示されることを確認
  - [ ] 7.6 スナックバーが表示されることを確認

---

### Phase 2: ステアリングドキュメントの最適化

- [x] 8. README.mdの更新
  - [x] 8.1 `.kiro/steering/README.md`を開く
  - [x] 8.2 「買主（Buyer）関連（常に読み込み）」セクションを追加
  - [x] 8.3 「売主（Seller）関連（手動読み込み）」セクションに変更
  - [x] 8.4 「エリアマッピング関連（手動読み込み）」セクションを追加
  - [x] 8.5 最終更新日を更新

- [x] 9. 売主関連ドキュメントにfront-matterを追加
  - [x] 9.1 `seller-table-column-definition.md`に`inclusion: manual`を追加
  - [x] 9.2 `seller-spreadsheet-column-mapping.md`に`inclusion: manual`を追加
  - [x] 9.3 `sidebar-status-definition.md`に`inclusion: manual`を追加
  - [x] 9.4 `sidebar-api-response-validation.md`に`inclusion: manual`を追加
  - [x] 9.5 `seller-nearby-buyers-rule.md`に`inclusion: manual`を追加
  - [x] 9.6 `staff-spreadsheet-definition.md`に`inclusion: manual`を追加

- [x] 10. エリアマッピング関連ドキュメントにfront-matterを追加
  - [x] 10.1 `beppu-city-address-based-area-mapping.md`に`inclusion: manual`を追加
  - [x] 10.2 `oita-city-address-based-area-mapping.md`に`inclusion: manual`を追加

- [ ] 11. ステアリングドキュメントの動作確認
  - [ ] 11.1 新しいセッションを開始
  - [ ] 11.2 買主リスト関連のドキュメントのみが読み込まれることを確認
  - [ ] 11.3 売主、物件、エリアマッピング関連が読み込まれないことを確認

---

### Phase 3: 統合テスト

- [ ] 12. 機能テスト
  - [ ] 12.1 物件番号のコピー機能をテスト
    - [ ] 12.1.1 コピーボタンをクリック
    - [ ] 12.1.2 クリップボードに物件番号がコピーされることを確認
    - [ ] 12.1.3 スナックバーが表示されることを確認
  - [ ] 12.2 atbb_statusの表示をテスト
    - [ ] 12.2.1 atbb_statusが存在する物件で表示を確認
    - [ ] 12.2.2 atbb_statusが空の物件で非表示を確認
  - [ ] 12.3 エラーハンドリングをテスト
    - [ ] 12.3.1 クリップボードAPIが使用できない場合のエラーメッセージを確認

- [ ] 13. レスポンシブテスト
  - [ ] 13.1 デスクトップ（1920x1080）で表示確認
  - [ ] 13.2 タブレット（768x1024）で表示確認
  - [ ] 13.3 モバイル（375x667）で表示確認

- [ ] 14. ブラウザ互換性テスト
  - [ ] 14.1 Chrome最新版でテスト
  - [ ] 14.2 Edge最新版でテスト
  - [ ] 14.3 Firefox最新版でテスト
  - [ ] 14.4 Safari最新版でテスト（可能であれば）

---

### Phase 4: デプロイ

- [ ] 15. フロントエンドのビルド
  - [ ] 15.1 `npm run build`を実行
  - [ ] 15.2 ビルドエラーがないことを確認
  - [ ] 15.3 型エラーがないことを確認

- [ ] 16. Vercelへのデプロイ
  - [ ] 16.1 変更をGitにコミット
  - [ ] 16.2 Gitにプッシュ
  - [ ] 16.3 Vercelで自動デプロイを確認
  - [ ] 16.4 デプロイが成功したことを確認

- [ ] 17. 本番環境でのテスト
  - [ ] 17.1 本番環境で買主詳細ページを開く
  - [ ] 17.2 物件情報カードが表示されることを確認
  - [ ] 17.3 コピー機能が動作することを確認
  - [ ] 17.4 atbb_statusが表示されることを確認
  - [ ] 17.5 スナックバーが表示されることを確認

---

## 📝 実装メモ

### 重要なポイント
- atbb_statusは色分けなし、テキストのみ表示
- クリップボードAPIはHTTPSまたはlocalhostでのみ動作
- ステアリングドキュメントのfront-matterは`---`で囲む

### 注意事項
- 既存の`status`フィールドと`atbb_status`は別物
- コピー機能のエラーハンドリングを忘れずに
- スナックバーは2秒後に自動的に閉じる

---

## 🔄 進捗状況

- Phase 1: PropertyInfoCard.tsxの修正 - [ ] 未着手
- Phase 2: ステアリングドキュメントの最適化 - [ ] 未着手
- Phase 3: 統合テスト - [ ] 未着手
- Phase 4: デプロイ - [ ] 未着手

---

**作成日**: 2026年2月6日  
**最終更新日**: 2026年2月6日
