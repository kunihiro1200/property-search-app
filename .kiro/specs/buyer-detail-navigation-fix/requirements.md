# 要件ドキュメント: 買主詳細ナビゲーション修正

## はじめに

このドキュメントは、買主詳細ページにおけるナビゲーションの一貫性を確保するための要件を定義します。現在、システム全体でbuyer_numberを使用しているにもかかわらず、一部のコンポーネントでUUIDベースのidを使用しているため、ナビゲーションが機能していません。

## 用語集

- **System**: 不動産管理アプリケーション全体
- **Buyer_Number**: 買主を識別するための一意の数値識別子
- **UUID**: 汎用一意識別子(Universally Unique Identifier)
- **Related_Buyers_Section**: 買主詳細ページに表示される関連買主のセクション
- **Unified_Inquiry_History_Table**: 買主詳細ページに表示される統合問い合わせ履歴テーブル
- **Navigation**: ユーザーがアプリケーション内の異なるページ間を移動する機能

## 要件

### 要件1: システム全体での識別子の一貫性

**ユーザーストーリー:** 開発者として、システム全体で一貫した識別子を使用したいので、ナビゲーションとデータ取得が正しく機能するようにしたい。

#### 受入基準

1. THE System SHALL use buyer_number as the primary identifier for all buyer-related operations
2. THE System SHALL use buyer_number in all URL parameters for buyer navigation
3. THE System SHALL use buyer_number in all API endpoints for buyer data retrieval
4. THE System SHALL maintain backward compatibility with existing buyer_number-based routes

### 要件2: 関連買主セクションのナビゲーション

**ユーザーストーリー:** ユーザーとして、関連買主セクションで買主をクリックしたときに、その買主の詳細ページに正しく遷移したいので、関連する買主情報を確認できるようにしたい。

#### 受入基準

1. WHEN a user clicks on a related buyer in the Related_Buyers_Section, THEN THE System SHALL navigate to the buyer detail page using buyer_number
2. WHEN navigating to a buyer detail page, THEN THE System SHALL construct the URL with the format /buyers/{buyer_number}
3. WHEN the Related_Buyers_Section receives buyer data, THEN THE System SHALL extract buyer_number from the data
4. IF a related buyer does not have a buyer_number, THEN THE System SHALL not render a clickable link for that buyer

### 要件3: 問い合わせ履歴テーブルのナビゲーション

**ユーザーストーリー:** ユーザーとして、問い合わせ履歴テーブルで買主名をクリックしたときに、その買主の詳細ページに正しく遷移したいので、問い合わせに関連する買主情報を確認できるようにしたい。

#### 受入基準

1. WHEN a user clicks on a buyer name in the Unified_Inquiry_History_Table, THEN THE System SHALL navigate to the buyer detail page using buyer_number
2. WHEN rendering buyer names in the inquiry history, THEN THE System SHALL use buyer_number for navigation links
3. WHEN the Unified_Inquiry_History_Table receives inquiry data, THEN THE System SHALL extract buyer_number from the related buyer information
4. IF an inquiry does not have an associated buyer_number, THEN THE System SHALL display the buyer name as plain text without a link

### 要件4: URLパラメータの一貫性

**ユーザーストーリー:** 開発者として、すべてのURLパラメータでbuyer_numberを使用したいので、ルーティングとデータ取得のロジックが簡潔で保守しやすくなるようにしたい。

#### 受入基準

1. THE System SHALL use buyer_number as the URL parameter for all buyer detail routes
2. THE System SHALL parse buyer_number from URL parameters in buyer detail pages
3. THE System SHALL validate that buyer_number is a valid numeric identifier
4. WHEN a buyer_number is invalid or missing, THEN THE System SHALL display an appropriate error message

### 要件5: コンポーネントインターフェースの一貫性

**ユーザーストーリー:** 開発者として、TypeScriptの型定義でbuyer_numberを使用したいので、コンパイル時に型の不一致を検出できるようにしたい。

#### 受入基準

1. THE System SHALL define TypeScript interfaces that use buyer_number for buyer identification
2. THE System SHALL enforce buyer_number usage through TypeScript prop types in React components
3. WHEN passing buyer data between components, THEN THE System SHALL use buyer_number as the identifier
4. THE System SHALL remove or deprecate any UUID-based id properties from buyer-related interfaces

### 要件6: APIエンドポイントの一貫性

**ユーザーストーリー:** 開発者として、すべてのAPIエンドポイントでbuyer_numberを使用したいので、バックエンドとフロントエンドの統合が一貫性を持つようにしたい。

#### 受入基準

1. THE System SHALL use buyer_number in all API endpoint paths for buyer operations
2. WHEN fetching buyer data, THEN THE System SHALL use buyer_number as the query parameter
3. WHEN creating or updating buyer records, THEN THE System SHALL return buyer_number in the response
4. THE System SHALL document all API endpoints to specify buyer_number as the required identifier
