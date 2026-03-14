# 2月 共有リスト（業務リスト）関連コミット一覧

| コミット | 変更ファイル | 内容 | 対応状況 |
|---------|------------|------|---------|
| 043386b | WorkTaskDetailModal.tsx、WorkTaskSection.tsx（新規）、WorkTasksPage.tsx | 業務依頼リストのカラーを紫色に統一 | 要対応 |
| f7ce445 | WorkTaskColumnMapper.ts、PriceReductionCompleteButton.tsx（新規） | 業務リストの日付パース処理を修正（時刻付き日付形式に対応） | 要対応 |
| ef2a539 | WorkTaskDetailModal.tsx | 業務詳細モーダルのヘッダーに物件情報を表示 | 要対応 |
| aec1b81 | WorkTaskDetailModal.tsx | サイト登録タブから「サイト登録依頼日」フィールドを削除 | 要対応 |
| dde2a50 | WorkTaskDetailModal.tsx | 業務詳細モーダルのヘッダー情報を太字で表示し、担当者を追加 | 要対応 |
| d262139 | WorkTaskDetailModal.tsx | サイト登録タブを再構成（グループ化・フィールド追加・納期予定日自動計算） | 要対応 |
| 7b670cd | WorkTaskDetailModal.tsx | サイト登録タブに通常スタッフ選択肢を追加・グループタイトルを赤色に変更・条件付き表示を実装 | 要対応 |
| e34e5ca | WorkTaskDetailModal.tsx | グループタイトルを大きく表示・CWの方へ依頼メールを送信ボタンに変更 | 要対応 |
| 03c3348 | WorkTaskDetailModal.tsx | ボタンの幅を統一・パノラマに「あり」ボタンを追加 | 要対応 |
| 824d97f | WorkTaskDetailModal.tsx | 送信ボタンの値をTRUE/FALSEに変更・ボタン間に隙間を追加 | 要対応 |
| 6a5aee5 | WorkTaskDetailModal.tsx | 間取図格納済み連絡メール・パノラマ完了・サイト登録確認にボタンを追加 | 要対応 |
| 48263a9 | WorkTaskDetailModal.tsx | ヘッダーに売主名追加・確認後処理を紫色に変更・物件ファイルと物件一覧に行追加にボタン追加・間取図修正回数にボタン追加・間取図確認OKとサイト登録確認OKコメントに初期値設定 | 要対応 |
| 76f310d | WorkTaskDetailModal.tsx | 方位記号と間取図にボタンを追加 | 要対応 |
| 06fdd8b | WorkTaskService.ts、WorkTasksPage.tsx | 業務リストにサイドバーカテゴリー表示を追加（製本予定日・納品予定日を含む） | 要対応 |
| ea6c8a0 | WorkTaskService.ts | サイドバーカテゴリーから日付表示を削除 | 要対応 |
| 9733779 | WorkTaskService.ts | サイドバーカテゴリーに日付と担当者名を再追加 | 要対応 |
| 7ff76ab | WorkTasksPage.tsx、workTaskStatusUtils.ts | 業務リストのサイドバーカテゴリーに日付を表示・テーブルのステータス列を削除 | 要対応 |
| fbf2099 | WorkTasksPage.tsx | サイドバーカテゴリーの日付を太字に・期限切れ（当日以前）のカテゴリーを赤字に変更 | 要対応 |
| 0320f57 | WorkTasksPage.tsx | サイドバーの幅を220pxから300pxに拡大（カテゴリー名を全て表示） | 要対応 |
| 746f5ef | WorkTaskService.ts、WorkTasksPage.tsx | サイドバーの幅を400pxに拡大・サイト依頼済み納品待ちに納品予定日を表示 | 要対応 |
| 0a315da | workTaskStatusUtils.ts | サイドバーカテゴリーの順序を修正（媒介→サイト登録→売買→決済→台帳→保留） | 要対応 |
| dad958b | WorkTaskDetailModal.tsx、WorkTasksPage.tsx、workTaskStatusUtils.ts | サイドバーカテゴリーに全日付表示・検索バーにクリアボタン追加・物件番号クリックでコピー機能追加 | 要対応 |
| 77a77bd | workTaskStatusUtils.ts | filterTasksByStatusでsidebar_categoryを優先的に使用するように修正 | 要対応 |
| c7f1095 | WorkTaskService.ts、WorkTaskDetailModal.tsx | 業務リスト契約決済タブのフィールド修正とサイドバーカテゴリ表示修正 | 要対応 |
| 2367cd0 | WorkTasksPage.tsx | 業務リストの検索機能を改善（カテゴリー選択中でも全件検索可能に） | 要対応 |
| f3ddfce | WorkTaskSyncService.ts、work-task-column-mapping.json | 業務リストのフィールド別同期ルールを実装 | 要対応 |
| 85a49f5 | work-task-column-mapping.json | 業務リストの同期ルール修正（存在しないカラムを削除してブラウザ専用フィールドを保護） | 要対応 |
| 2dde7e6 | work-task-column-mapping.json | テスト期間中は全フィールドをスプシ→ブラウザに変更（本番環境移行時に戻す） | 要対応 |
| 1f94d6a | WorkTaskDetailModal.tsx | 業務リストモーダルのUI改善（コミットe34e5ca, 03c3348を適用） | 要対応 |
| ee08999 | WorkTaskColumnMapper.ts（新規）、WorkTaskService.ts、WorkTaskDetailModal.tsx、WorkTasksPage.tsx | 2/15のローカルコミットを復元（Part 1: UI改善・業務リスト機能追加） | 要対応 |
| 33c719b | WorkTasksPage.tsx、workTaskStatusUtils.ts | 業務リストのサイドバーカテゴリーに日付を表示・テーブルのステータス列を削除 | 要対応 |
| 7432261 | WorkTasksPage.tsx | サイドバーカテゴリーの日付を太字に・期限切れ（当日以前）のカテゴリーを赤字に変更 | 要対応 |
| e8d1068 | WorkTasksPage.tsx | サイドバーの幅を220pxから300pxに拡大（カテゴリー名を全て表示） | 要対応 |
| f3e0741 | WorkTaskService.ts、WorkTasksPage.tsx | サイドバーの幅を400pxに拡大・サイト依頼済み納品待ちに納品予定日を表示 | 要対応 |
| 8fb14d7 | workTaskStatusUtils.ts | サイドバーカテゴリーの順序を修正（媒介→サイト登録→売買→決済→台帳→保留） | 要対応 |
| 8109d97 | WorkTaskDetailModal.tsx、WorkTasksPage.tsx、workTaskStatusUtils.ts | サイドバーカテゴリーに全日付表示・検索バーにクリアボタン追加・物件番号クリックでコピー機能追加 | 要対応 |
| 7337f4e | workTaskStatusUtils.ts | filterTasksByStatusでsidebar_categoryを優先的に使用するように修正 | 要対応 |
| 7c25dcc | WorkTaskService.ts | サイドバーカテゴリ表示を修正（売買契約・営業確認中の優先順位を2に変更・日付の前にスペース追加） | 要対応 |
| 21b19da | WorkTasksPage.tsx | 業務リストの検索機能を改善（カテゴリー選択中でも全件検索可能に） | 要対応 |
| 604fd76 | work-task-column-mapping.json | 業務リストのフィールド別同期ルールを実装 | 要対応 |
| 3ed2235 | work-task-column-mapping.json | 業務リストの同期ルール修正（存在しないカラムを削除してブラウザ専用フィールドを保護） | 要対応 |
| 007b43f | work-task-column-mapping.json | テスト期間中は全フィールドをスプシ→ブラウザに変更（本番環境移行時に戻す） | 要対応 |
| 40ae64d | WorkTasksPage.tsx | WorkTasksPageのSECTION_COLORS参照エラーを修正 | 要対応 |
| 9c8cdde | WorkTasksPage.tsx | WorkTasksPageにSECTION_COLORSのフォールバック処理を追加 | 要対応 |
| 7e19940 | WorkTaskDetailModal.tsx | WorkTaskDetailModalのSECTION_COLORS.workTaskをSECTION_COLORS.taskに修正 | 要対応 |
| 22fb47b | work-task-column-mapping.json、WorkTaskSyncService.ts | 業務リストのフィールド別同期ルールを実装 | 要対応 |
| 7c7bea0 | work-task-column-mapping.json | 業務リストの同期ルール修正（存在しないカラムを削除してブラウザ専用フィールドを保護） | 要対応 |
| 42d547d | work-task-column-mapping.json | テスト期間中は全フィールドをスプシ→ブラウザに変更（本番環境移行時に戻す） | 要対応 |
