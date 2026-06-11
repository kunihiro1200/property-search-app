# 要件定義書

## はじめに

本機能は、売主管理システムの物件リスト詳細画面（`PropertyListingDetailPage`）において、「一般媒介非公開（仮）」チェックボックスフィールドを追加するものです。

atbb状況（`atbb_status`）フィールドに「一般」という文字が含まれる場合のみ、当該フィールドをatbb状況フィールドの右側に表示します。フィールドの値はスプレッドシートのDD列（カラム名「一般媒介非公開（仮）」）と双方向同期します。

---

## 用語集

- **PropertyListingDetailPage**: 売主管理システムのフロントエンド（`frontend/src/pages/PropertyListingDetailPage.tsx`）における物件リスト詳細画面
- **atbb状況フィールド**: `property_listings`テーブルの`atbb_status`カラム。スプレッドシートの「atbb成約済み/非公開」列に対応
- **一般媒介非公開（仮）フィールド**: 本機能で追加する`general_mediation_private`カラム。スプレッドシートのDD列「一般媒介非公開（仮）」に対応
- **確認フィールド**: 既存の「確認」フィールド（`confirmation`カラム）。チェックボックスUIの参考実装
- **スプレッドシート同期**: `PropertyListingSyncService`および`EnhancedAutoSyncService`が担うスプレッドシートとDBの双方向同期処理
- **売主管理システムバックエンド**: `backend/src/`配下のサーバー（ポート3000）。本機能の対象
- **DD列**: スプレッドシート「物件」シートのDD列（カラム名「一般媒介非公開（仮）」）

---

## 要件

### 要件1: 表示条件

**ユーザーストーリー:** 担当者として、atbb状況が「一般」を含む物件の詳細画面で「一般媒介非公開（仮）」フィールドを確認したい。そうすることで、一般媒介物件の非公開設定を管理できる。

#### 受け入れ基準

1. WHEN `atbb_status`の値に「一般」という文字列が含まれる場合、THE PropertyListingDetailPage SHALL 「一般媒介非公開（仮）」フィールドを表示する
2. WHEN `atbb_status`の値に「一般」という文字列が含まれない場合、THE PropertyListingDetailPage SHALL 「一般媒介非公開（仮）」フィールドを表示しない
3. WHEN `atbb_status`がnullまたは空文字の場合、THE PropertyListingDetailPage SHALL 「一般媒介非公開（仮）」フィールドを表示しない

---

### 要件2: フィールド配置

**ユーザーストーリー:** 担当者として、「一般媒介非公開（仮）」フィールドをatbb状況フィールドの右側に配置してほしい。そうすることで、関連情報を視覚的にまとめて確認できる。

#### 受け入れ基準

1. WHEN 「一般媒介非公開（仮）」フィールドが表示される場合、THE PropertyListingDetailPage SHALL atbb状況フィールドと同一行の右側に「一般媒介非公開（仮）」フィールドを配置する
2. THE PropertyListingDetailPage SHALL フィールドラベルとして「一般媒介非公開（仮）」を表示する

---

### 要件3: チェックボックスUI

**ユーザーストーリー:** 担当者として、「一般媒介非公開（仮）」フィールドを確認フィールドと同様のチェックボックスUIで操作したい。そうすることで、直感的に値を切り替えられる。

#### 受け入れ基準

1. THE PropertyListingDetailPage SHALL 「一般媒介非公開（仮）」フィールドをチェックボックス形式で表示する
2. WHEN チェックボックスがチェックされている場合、THE PropertyListingDetailPage SHALL チェック済み状態（true）を視覚的に示す
3. WHEN チェックボックスがチェックされていない場合、THE PropertyListingDetailPage SHALL 未チェック状態（false）を視覚的に示す
4. WHEN 担当者がチェックボックスをクリックした場合、THE PropertyListingDetailPage SHALL チェック状態を即時に切り替え、バックエンドAPIへ保存リクエストを送信する
5. IF バックエンドAPIへの保存が失敗した場合、THEN THE PropertyListingDetailPage SHALL エラーメッセージをスナックバーで表示し、チェック状態を変更前の値に戻す

---

### 要件4: データモデル

**ユーザーストーリー:** システム管理者として、「一般媒介非公開（仮）」の値をデータベースに永続化したい。そうすることで、スプレッドシートとの同期が可能になる。

#### 受け入れ基準

1. THE System SHALL `property_listings`テーブルに`general_mediation_private`カラム（boolean型、nullable）を保持する
2. WHEN `general_mediation_private`がtrueの場合、THE System SHALL スプレッドシートのDD列に「TRUE」または「✓」相当の値を書き込む
3. WHEN `general_mediation_private`がfalseまたはnullの場合、THE System SHALL スプレッドシートのDD列に空文字または「FALSE」相当の値を書き込む

---

### 要件5: バックエンドAPI

**ユーザーストーリー:** フロントエンド開発者として、「一般媒介非公開（仮）」フィールドの値をAPIで取得・更新したい。そうすることで、画面からの操作をDBに反映できる。

#### 受け入れ基準

1. WHEN `GET /api/property-listings/:propertyNumber` が呼ばれた場合、THE API SHALL レスポンスに`general_mediation_private`フィールドを含める
2. WHEN `PUT /api/property-listings/:propertyNumber` のリクエストボディに`general_mediation_private`が含まれる場合、THE API SHALL `property_listings`テーブルの該当レコードを更新する
3. IF `general_mediation_private`に boolean 以外の値が渡された場合、THEN THE API SHALL バリデーションエラー（400）を返す

---

### 要件6: スプレッドシート双方向同期

**ユーザーストーリー:** 担当者として、「一般媒介非公開（仮）」フィールドの値がスプレッドシートのDD列と自動的に同期されてほしい。そうすることで、スプレッドシートとシステムの値を常に一致させられる。

#### 受け入れ基準

1. WHEN スプレッドシートのDD列「一般媒介非公開（仮）」の値が変更された場合、THE SpreadsheetSyncService SHALL `property_listings`テーブルの`general_mediation_private`カラムを更新する
2. WHEN `property_listings`テーブルの`general_mediation_private`カラムが更新された場合、THE SpreadsheetSyncService SHALL スプレッドシートのDD列「一般媒介非公開（仮）」を更新する
3. THE PropertyListingColumnMapper SHALL スプレッドシートカラム名「一般媒介非公開（仮）」とDBカラム名`general_mediation_private`のマッピングを保持する（※既存の`property-listing-column-mapping.json`に定義済み）
4. IF スプレッドシートのDD列の値が空文字またはnullの場合、THEN THE SpreadsheetSyncService SHALL `general_mediation_private`をnullとして扱う
