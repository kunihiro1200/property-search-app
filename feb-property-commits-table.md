# 2月 物件リスト関連コミット一覧

| コミット | 変更ファイル | 内容 |
|---------|------------|------|
| 842eb51 | PropertyListingSyncService.ts | 同期エラー時にproperty_detailsをnullで上書きしないよう修正 |
| 44db432 | SellerService.supabase.ts、types/index.ts | commentsフィールドをUpdateSellerRequestとSellerServiceに追加 |
| 19d5494 | SellerService.supabase.ts、SellerStatusSidebar.tsx、SellersPage.tsx | サイドバー「当日TEL（内容）」カテゴリ表示問題を修正 |
| 2254b6b | EnhancedAutoSyncService.ts、SellerService.supabase.ts、types/index.ts、SellerStatusSidebar.tsx、CallModePage.tsx、SellersPage.tsx | 通話モードページのサイドバー表示変更（営担フィルタリング） |
| 7da51e3 | PropertyMapView.tsx | マーカー作成useEffectの詳細ログ追加・依存配列修正 |
| 9565ff7 | PropertyMapView.tsx | 座標フィルタリングuseEffectの詳細ログ追加 |
| b8319f8 | PropertyMapView.tsx、PublicPropertiesPage.tsx | 初回ロード時にマップモードでfetchAllPropertiesを呼び出すよう修正 |
| 74e400d | PropertyMapView.tsx、PublicPropertiesPage.tsx | fetchAllPropertiesとPropertyMapViewのpropsに詳細ログ追加 |
| f8ad914 | PublicPropertiesPage.tsx | skipImagesパラメータとatbb_status値の詳細ログ追加 |
| 1675689 | index.ts、geocoding.ts、sellers.ts、EnhancedAutoSyncService.ts、SellerService.supabase.ts、types/index.ts、PropertyMapSection.tsx、CallModePage.tsx、types/index.ts | 通話モードページに地図表示機能を追加（座標自動取得対応） |
| 5e45e83 | PropertyMapSection.tsx | 地図にストリートビューコントロールを追加 |
| 6d6e3f9 | sellers.ts、BeppuAreaMappingService.ts、BuyerService.ts、CityNameExtractor.ts、OitaCityAreaMappingService.ts、PropertyDistributionAreaCalculator.ts、NearbyBuyersList.tsx | 近隣買主リスト取得でページネーションを実装（全件取得対応） |
| 6ca4d68 | PropertyService.ts、SellerService.supabase.ts、CallModePage.tsx | CallModePageとPropertyServiceのAPIエンドポイントエラーを修正 |
| e483ce4 | PropertyInfoCard.tsx、BuyerDetailPage.tsx | 買主詳細ページの改善: 物件情報カード機能追加とデータ構造改善 |
| 23621fe | PropertyInfoCard.tsx、BuyerDetailPage.tsx | 買主詳細ページのUI改善: セクション順序変更、2列レイアウト、独立スクロール、物件情報カード改善 |
| d99ba23 | PropertyInfoCard.tsx | 買主詳細画面の物件詳細カードのレイアウト改善 |
| f26f051 | PropertyListingService.ts | PropertyListingService.getPublicPropertyByNumberで画像を取得するよう修正 |
| a04052f | PropertyInfoCard.tsx、BuyerDetailPage.tsx | 買主詳細ページの物件情報カードを緑色に変更 |
| 3750115 | PropertyListingDetailModal.tsx、PropertyListingsPage.tsx | 物件リスト一覧ページと詳細モーダルを青色に統一 |
| 599aade | PropertyListingDetailModal.tsx | 物件詳細モーダルのヘッダーとタブを青色に統一 |
| 58d986d | PropertyListingDetailModal.tsx | 物件詳細モーダルの全セクションに青色ヘッダーを追加 |
| cf420b8 | PropertyListingDetailPage.tsx | 物件リスト詳細ページに青色テーマを適用 |
| d1b9b09 | PropertyInfoCard.tsx | 物件情報カードの所在地と住居表示にコピー機能を追加 |
| 0906002 | BuyerStatusCalculator.ts、buyer-status-definitions.ts、PropertySidebarStatus.tsx、PropertyListingsPage.tsx | 物件リスト管理のサイドバーステータスロジックを追加 |
| 381b24d | PropertyListingService.ts、PropertyListingSyncService.ts、PropertyListingsPage.tsx | 物件リストにサイドバーステータス機能を実装 |
| 75b0284 | BuyerCandidateService.ts、EnhancedAutoSyncService.ts、GeolocationService.ts、App.tsx、BuyerCandidateListPage.tsx、PropertyListingDetailPage.tsx、api.ts | 買主自動削除の誤検出を修正 |
| 9cc5f6b | BuyerCandidateService.ts、EnhancedBuyerDistributionService.ts、DistributionAreaField.tsx、GmailDistributionButton.tsx、BuyerDetailPage.tsx、PropertyListingDetailPage.tsx、PropertyListingsPage.tsx | Gmail配信機能の改善とUI向上 |
| b5522a3 | PropertyListingDetailPage.tsx | 物件詳細ページのヘッダー改善 |
| 38a8ebd | propertyListings.ts、PriceSection.tsx、PropertyListingDetailPage.tsx | 価格変更時に値下げ履歴を自動追加、売出価格を基本情報に移動 |
| c19de21 | propertyListings.ts | 価格変更履歴の自動追加機能を修正 |
| edeeeb5 | PriceSection.tsx、PropertyListingDetailPage.tsx | 価格情報セクションにその他チャット送信機能を追加 |
| 8556438 | chatNotifications.ts、PropertySidebarStatus.tsx、PropertyListingsPage.tsx | 予約値下げ機能の完了ボタンUI実装 |
| ac5f70d | PropertyListingDetailPage.tsx | 物件リスト詳細画面のレイアウト改善: セクション横並び配置とレスポンシブ対応、色分け追加 |
| 162847b | index.ts、message-templates.ts、MessageTemplateService.ts、MessageTemplateDialog.tsx、PropertyListingDetailPage.tsx | 物件詳細ページのヘッダーボタン配置変更とメールテンプレート機能追加 |
| e0bb23e | MessageTemplateService.ts、StaffService.ts、AssigneeChatSender.tsx、PropertyListingDetailPage.tsx | メッセージテンプレート機能と担当へChat送信機能を実装 |
| a98684c | MessageTemplateService.ts、StaffService.ts、PropertyListingDetailPage.tsx | 物件詳細ページ: 担当へChat送信ボタンをヘッダーに移動、テンプレート・スタッフサービスに認証情報を追加 |
| cbb47b5 | PropertyListingDetailPage.tsx | 担当へChat送信時に送信者・物件情報・売主情報・物件詳細URLを含めるように改善 |
| b1ceb8b | MessageTemplateDialog.tsx、PropertyListingDetailPage.tsx | 物件詳細ページ: 担当へChat送信に詳細情報を追加、メールテンプレートの変数置換機能を実装 |
| df00f36 | index.ts、staff.ts、StaffService.ts、MessageTemplateDialog.tsx、PropertyListingDetailPage.tsx、PublicPropertyDetailPage.tsx | 物件詳細ページに売主へSMS送信ボタンを追加 |
| 4903112 | PropertyListingDetailPage.tsx | ヘッダーボタンのテキストを省略してコンパクト化 |
| aa34523 | activityLogs.ts、PropertyListingDetailPage.tsx | 売主への連絡をコミュニケーション履歴に記録 |
| 58eba1f | PropertyListingDetailPage.tsx | 物件詳細ページにコミュニケーション履歴セクションを追加 |
| 4153495 | emails.ts、EmailService.supabase.ts、EmailService.ts、StaffService.ts、MessageTemplateDialog.tsx、PropertyListingDetailPage.tsx | 物件詳細ページの機能改善: Chat送信者名修正、UI改善、コミュニケーション履歴、自動保存、メールテンプレート署名欄の担当者情報取得 |
| b1edf71 | PropertyListingDetailPage.tsx | 物件詳細ページのヘッダーレイアウト改善: BB14の右隣にボタン配置、所在地行を削除して1段に統合 |
| 7870c7d | PropertyListingSyncService.ts | PropertyListingSyncServiceの重複コード削除 |
| e9c64e9 | BLANK_SCREEN_DEBUG.md、DEBUG_INSTRUCTIONS.md、PropertyListingsPage.tsx | 物件リスト: AA13407とAA13389が表示されない問題のデバッグログ追加 |
| f1dfd3a | PropertyListingsPage.tsx | 検索フィルターのデバッグログ追加: property_numberの値を詳細確認 |
| 1972768 | PropertyListingsPage.tsx | 物件リスト検索機能の修正: 検索クエリの前後の空白を削除してマッチング精度を向上 |
| 0894409 | PropertyListingDetailPage.tsx | 物件詳細ページ: 業者への対応日付を表示（今日より後の場合のみ、東京時間） |
| 79ca1b9 | PropertyListingDetailPage.tsx | 業者への対応日付表示の修正: Excelシリアル値を正しく日付に変換 |
| 791af09 | PropertyListingDetailPage.tsx | 業者への対応日付表示: 枠なしの大きな赤字に変更 |
| d7a20d6 | PropertyListingDetailPage.tsx | 業者への対応日付表示: 黄色と赤のストライプ背景で危険を強調、点滅と揺れアニメーション追加 |
| eef756e | PropertyListingDetailPage.tsx | 業者への対応日付表示: 黄色背景のみに変更して数字を見やすく、赤文字で強調 |
| cb0829e | PropertyInfoCard.tsx | 買主詳細ページの物件情報カードに業者への対応警告マークを追加 |
| 13da29d | FrequentlyAskedSection.tsx、PropertyInfoCard.tsx、NewBuyerPage.tsx | 固定資産税の表示を修正（11万円と表示）、業者への対応警告マークのデバッグログを追加 |
| 40c9157 | PriceSection.tsx、PropertySidebarStatus.tsx | 物件リストUI改善: 即値下げボタン、サイドバー順序変更、値下げ通知ログ強化 |
| 822b7dc | PriceSection.tsx、PropertySidebarStatus.tsx | 上記（40c9157）をRevert |
| 5d24999 | PriceSection.tsx、PropertyListingDetailPage.tsx | 価格情報セクションのChat送信機能を改善 |
| a755774 | PropertyListingDetailPage.tsx | 売買価格の自動保存を停止し、保存ボタンで確定するように修正 |
| 012a5a7 | UnifiedSearchBar.css、UnifiedSearchBar.tsx、PropertyListingDetailPage.tsx | 検索バーの☓ボタンを入力テキストのすぐ右に配置、物件詳細画面にサイドバーカテゴリーを追加 |
| 64a9e65 | PropertyListingsPage.tsx | 物件リストページのタイトルに青色を追加してスタイルを統一 |
| f3ae229 | index.ts、auth.supabase.ts | 業務管理システムの認証機能を実装（Supabase Auth直接利用） |
| d149a82 | GoogleSheetsClient.ts | Google Sheets認証をJWTからGoogleAuthに変更 |
| f63400e | PropertyListingService.ts | 画像配列のimage_urlプロキシURLからファイルIDを抽出するよう修正 |
| 4c3423c | GoogleDriveService.ts、PropertyImageService.ts | Google Drive APIエラーの詳細ログ追加（AA12649デバッグ） |
| 67bb088 | PropertyListingSyncProcessor.ts | p-queueを動的インポートに変換してERR_REQUIRE_ESMエラーを解消 |
| 1117b62 | CollapsibleSection.tsx、NearbyBuyersList.tsx、PropertyMapSection.tsx、RichTextCommentEditor.tsx、sectionColors.ts | 欠けていたコンポーネントを作成（sectionColors、RichTextCommentEditor、PropertyMapSection、NearbyBuyersList、CollapsibleSection） |
| ee08999 | GoogleSheetsClient.ts、WorkTaskColumnMapper.ts、WorkTaskService.ts、UnifiedSearchBar.css、UnifiedSearchBar.tsx、WorkTaskDetailModal.tsx、PropertyListingDetailPage.tsx、WorkTasksPage.tsx | 2026-02-15のローカルコミットを復元（UI改善、業務リスト機能追加） |
| 676b213 | PropertyListingDetailPage.tsx | MessageTemplateDialogのインポートエラーを修正 |
| 0e3c419 | PropertyListingDetailPage.tsx | PropertySidebarStatusのインポートエラーを修正 |
| bb31643 | index.ts、publicInquiries.ts、PropertyListingSyncProcessor.ts | Vercel環境対応: .env読み込みとp-queue動的インポート |
| bd162a5 | index.ts | .env読み込みをtry-catchでラップ、p-queueを動的インポートに変更 |
