# Implementation Plan

- [x] 1. バックエンド: GeolocationServiceの実装


  - Google Maps URLから座標を抽出する機能
  - Haversine公式による距離計算機能
  - 基準地点からの半径内判定機能
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_



- [x] 2. バックエンド: BuyerDistributionServiceの実装
  - ★エリアに「①」を含む買主のフィルタリング
  - 配信フィールドが「要」の買主のフィルタリング
  - 半径フィルターの適用
  - メールアドレスの収集と重複排除
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3_

- [x] 3. バックエンド: APIエンドポイントの実装


  - GET /api/property-listings/:propertyNumber/distribution-buyers
  - エラーハンドリング（物件未存在、DB エラー等）
  - レスポンス形式の実装
  - _Requirements: 1.2, 1.3, 1.4, 5.3_



- [x] 4. フロントエンド: EmailTemplateの定義
  - 「値下げメール配信」テンプレートの作成
  - プレースホルダー（{{address}}等）の定義
  - テンプレート管理インターフェースの実装
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. フロントエンド: GmailDistributionServiceの実装


  - Gmail URL生成機能
  - プレースホルダー置換機能
  - URL長制限のハンドリング
  - _Requirements: 1.1, 1.2, 1.5, 1.7, 5.4_



- [x] 6. フロントエンド: EmailTemplateSelectorコンポーネントの実装
  - テンプレート選択メニューUI
  - テンプレート一覧表示
  - 選択時のコールバック処理
  - _Requirements: 1.1, 4.5_

- [x] 7. フロントエンド: GmailDistributionButtonコンポーネントの実装
  - 「Gmailで配信」ボタンUI
  - クリック時のテンプレート選択メニュー表示
  - API呼び出しと買主メールアドレス取得
  - Gmail URL生成とウィンドウオープン
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8. フロントエンド: PropertyListingsPageへの統合
  - GmailDistributionButtonの配置
  - 各物件行へのボタン追加
  - エラーハンドリングとユーザー通知
  - _Requirements: 1.1, 1.3, 1.6_

- [x] 9. エラーハンドリングとユーザー通知の実装
  - 買主が0件の場合の通知
  - API エラー時の通知
  - URL長超過時の通知
  - _Requirements: 1.3, 5.3_

- [x] 10. Checkpoint - すべてのテストが通ることを確認
  - All implementation completed and diagnostics passed with only minor warnings

