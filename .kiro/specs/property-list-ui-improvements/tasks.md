# 物件リストUI改善 - 実装計画

## 概要

物件リストページのUIを改善し、ユーザビリティを向上させる。4つの機能改善を実装する。

**対象システム**: 物件リスト（Property Management）のみ  
**影響範囲**: フロントエンドとバックエンド（値下げ通知ロジックのみ）

## タスク

- [ ] 1. 即値下げボタンの追加
  - [x] 1.1 PropertyListingDetailPageに即値下げセクションを追加
    - 「予約値下げ」セクションの上に「即値下げ」アコーディオンを追加
    - 「Chat送信」ボタンを実装（Google Chat URLに遷移）
    - Google Chat URL: `https://chat.googleapis.com/v1/spaces/AAAAw9wyS-o/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=t6SJmZ8af-yyB38DZzAqGOKYI-DnIl6wYtVo-Lyskuk`
    - 状態管理: `showInstantPriceReduction`を追加
    - _要件: 3.1_
  
  - [ ]* 1.2 即値下げボタンのE2Eテスト
    - 「即値下げ」ボタンが「予約値下げ」の上に表示されることを確認
    - 「即値下げ」ボタンをクリックして「Chat送信」ボタンが現れることを確認
    - 「Chat送信」ボタンをクリックしてGoogle Chat URLに遷移することを確認
    - 既存の「予約値下げ」機能が正常に動作することを確認
    - _要件: 3.1_

- [ ] 2. ヘッダーボタンの確認
  - [x] 2.1 PublicSiteButtonsの現在の実装を確認
    - 「一般向け公開サイト」ボタンが存在することを確認
    - 「管理者向け公開サイト」ボタンが存在することを確認
    - 「公開物件サイト」ボタンが存在しないことを確認（既に削除済み）
    - 変更不要の場合はタスク完了
    - _要件: 3.2_

- [ ] 3. サイドバーカテゴリーの順序変更
  - [x] 3.1 PropertySidebarStatusのステータス優先順位を変更
    - `STATUS_PRIORITY`から「値下げ未完了」を削除
    - `statusList`の構築ロジックを変更
    - 「すべて」を最上位に配置
    - 「値下げ未完了」を「すべて」の次に動的に追加（カウント > 0の場合のみ）
    - 他のステータスを優先順位順にソート
    - _要件: 3.3_
  
  - [ ]* 3.2 サイドバーカテゴリーの単体テスト
    - 「すべて」が最上位に表示されることを確認
    - 「値下げ未完了」が「すべて」の下に表示されることを確認（カウント > 0の場合）
    - 「値下げ未完了」が表示されないことを確認（カウント = 0の場合）
    - 他のステータスが優先順位順にソートされることを確認
    - _要件: 3.3_
  
  - [ ]* 3.3 サイドバーカテゴリーのE2Eテスト
    - 物件リストページを開く
    - サイドバーで「すべて」が最上位に表示されることを確認
    - 「値下げ未完了」が「すべて」の下に表示されることを確認
    - 各カテゴリーのカウント数が正しいことを確認
    - カテゴリーをクリックしてフィルタリングが正しく動作することを確認
    - _要件: 3.3_

- [ ] 4. チェックポイント - 基本機能の動作確認
  - すべてのテストが通ることを確認
  - ユーザーに質問があれば確認

- [ ] 5. 値下げ通知の送信タイミング修正
  - [x] 5.1 ScheduledNotificationServiceのログ強化
    - `processScheduledNotifications`メソッドにログを追加
    - 現在時刻（UTCと東京時間）をログ出力
    - 取得した通知の詳細（id, property_number, scheduled_at）をログ出力
    - 送信成功・失敗のログを追加
    - _要件: 3.4_
  
  - [x] 5.2 Cronジョブのログ強化
    - `process-scheduled-notifications.ts`にログを追加
    - 実行開始時に現在時刻（UTCと東京時間）をログ出力
    - 処理件数をログ出力
    - エラー時の詳細ログを追加
    - _要件: 3.4_
  
  - [x] 5.3 タイムゾーン処理の確認
    - scheduled_atが東京時間の9:00をUTCに変換して保存されていることを確認
    - Cronジョブが現在時刻（UTC）と比較していることを確認
    - 必要に応じてタイムゾーン変換ロジックを修正
    - _要件: 3.4_
  
  - [ ]* 5.4 値下げ通知の統合テスト
    - 値下げ予約を作成（scheduled_atを過去の時刻に設定）
    - Cronジョブを手動実行（`/api/cron/process-scheduled-notifications`）
    - ログを確認して通知が取得されることを確認
    - Google Chatに通知が送信されることを確認
    - `scheduled_notifications`テーブルの`status`が`sent`に更新されることを確認
    - _要件: 3.4_
  
  - [ ]* 5.5 値下げ通知のタイミングテスト
    - **テストケース1**: 値下げ予約日が本日（東京時間）で、現在時刻が9時前の場合
      - 通知が送信されないことを確認
    - **テストケース2**: 値下げ予約日が本日（東京時間）で、現在時刻が9時以降の場合
      - 通知が送信されることを確認
    - **テストケース3**: 値下げ予約日が過去の場合
      - すぐに通知が送信されることを確認（遅延通知）
    - **テストケース4**: 値下げ予約日が未来の場合
      - 通知が送信されないことを確認
    - _要件: 3.4_

- [ ] 6. チェックポイント - 最終確認
  - すべてのテストが通ることを確認
  - 公開物件サイトに影響がないことを確認
  - ユーザーに質問があれば確認

- [ ] 7. デプロイと動作確認
  - [-] 7.1 バックエンドのデプロイ
    - ScheduledNotificationServiceの変更をコミット
    - Cronジョブの変更をコミット
    - Vercelにデプロイ
    - デプロイログを確認
    - _要件: 3.4_
  
  - [~] 7.2 フロントエンドのデプロイ
    - PropertyListingDetailPageの変更をコミット
    - PropertySidebarStatusの変更をコミット
    - ビルドエラーがないことを確認
    - Vercelにデプロイ
    - _要件: 3.1, 3.3_
  
  - [~] 7.3 本番環境での動作確認
    - 物件詳細ページで「即値下げ」ボタンが表示されることを確認
    - 「Chat送信」ボタンをクリックしてGoogle Chatに遷移することを確認
    - サイドバーで「すべて」が最上位に表示されることを確認
    - 「値下げ未完了」が「すべて」の下に表示されることを確認
    - Cronジョブのログを確認（Vercel Dashboard）
    - _要件: 3.1, 3.3, 3.4_
  
  - [~] 7.4 公開物件サイトへの影響確認
    - 公開物件サイト（`https://property-site-frontend-kappa.vercel.app/public/properties`）を開く
    - 物件一覧が正しく表示されることを確認
    - 物件詳細ページが正しく表示されることを確認
    - エラーが発生していないことを確認
    - _要件: システム隔離ルール_

## 注意事項

### システム隔離ルール

**絶対に守るべきルール**:
- 物件リスト（Property Management）専用のファイルのみを変更する
- 公開物件サイト（Public Property Site）には絶対に影響を与えない

**変更対象ファイル**:
- ✅ `frontend/src/pages/PropertyListingDetailPage.tsx`
- ✅ `frontend/src/components/PropertySidebarStatus.tsx`
- ✅ `backend/src/services/ScheduledNotificationService.ts`
- ✅ `backend/api/cron/process-scheduled-notifications.ts`

**変更禁止ファイル**:
- ❌ `backend/api/index.ts`
- ❌ `backend/api/src/services/PropertyListingService.ts`
- ❌ `frontend/src/pages/PublicPropertyListPage.tsx`
- ❌ `frontend/src/pages/PublicPropertyDetailPage.tsx`

### セキュリティ上の注意

**Google Chat URL**:
- ⚠️ URLにAPIキーとトークンが含まれている
- ⚠️ フロントエンドのコードに直接埋め込まれる
- 📝 将来的には環境変数に移動することを推奨

### タスクマーキング

- `*`マークのタスクはオプション（テスト関連）
- テストタスクはスキップ可能だが、実装推奨
- コアの実装タスク（1.1, 3.1, 5.1, 5.2, 5.3, 7.x）は必須

---

**作成日**: 2026年2月14日  
**作成者**: Kiro AI  
**ステータス**: 実装待ち
