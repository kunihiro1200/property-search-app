# Requirements Document

## Introduction

買主管理システムにおいて、問合せ時ヒアリングのテキストフィールドに入力された特定のパターン（「希望時期：2年以内」など）を自動的にパースし、希望条件ページの対応するフィールドに反映する機能を実装します。これにより、ヒアリング内容の二重入力を防ぎ、データ入力の効率化と正確性の向上を実現します。

## Glossary

- **System**: 買主管理システム（Buyer Management System）
- **Inquiry_Hearing**: 問合せ時ヒアリングフィールド（buyers.inquiry_hearing）
- **Desired_Conditions**: 希望条件フィールド群（desired_timing, desired_parking_spaces, desired_price_range）
- **Parser**: テキストパターンを解析して構造化データに変換するコンポーネント
- **Quick_Button**: フロントエンドの入力補助ボタン
- **Last_Updated_At**: 各フィールドの最終更新日時
- **Price_Range_Mapper**: 予算テキストを価格帯選択肢にマッピングするコンポーネント

## Requirements

### Requirement 1: 問合せ時ヒアリングの自動パース

**User Story:** As a 営業担当者, I want 問合せ時ヒアリングに入力したテキストが自動的に希望条件フィールドに反映される, so that 二重入力の手間を省き、入力ミスを防ぐことができる

#### Acceptance Criteria

1. WHEN 問合せ時ヒアリングフィールドを保存する THEN THE System SHALL テキストをパースして対応する希望条件フィールドに値を設定する
2. WHEN パースエラーが発生する THEN THE System SHALL エラーをログに記録し、問合せ時ヒアリングの保存は成功させる
3. WHEN 複数のパターンが存在する THEN THE System SHALL 全てのパターンを抽出して対応するフィールドに反映する
4. WHEN パース可能なパターンが存在しない THEN THE System SHALL 希望条件フィールドを変更せずに処理を完了する

### Requirement 2: パターンマッチングルール

**User Story:** As a システム, I want 特定のテキストパターンを認識して構造化データに変換する, so that ユーザーが自然な日本語で入力した内容を正確に反映できる

#### Acceptance Criteria

1. WHEN テキストに「希望時期：」が含まれる THEN THE Parser SHALL コロンの後ろから改行または文末までを抽出してdesired_timingに設定する
2. WHEN テキストに「駐車場希望台数：」が含まれる THEN THE Parser SHALL コロンの後ろから改行または文末までを抽出してdesired_parking_spacesに設定する
3. WHEN テキストに「予算：」が含まれる THEN THE Parser SHALL コロンの後ろから改行または文末までを抽出してPrice_Range_Mapperに渡す
4. WHEN パターンマッチングが失敗する THEN THE Parser SHALL 該当フィールドをスキップして次のパターンを処理する

### Requirement 3: 価格帯マッピング

**User Story:** As a システム, I want 予算テキストを価格帯の選択肢に自動的にマッピングする, so that ユーザーが「3000万円」と入力したら「3000万円台」が選択される

#### Acceptance Criteria

1. WHEN 予算テキストに「〇〇万円」が含まれる THEN THE Price_Range_Mapper SHALL 対応する価格帯選択肢を返す
2. WHEN 予算テキストに「〇〇万円以下」が含まれる THEN THE Price_Range_Mapper SHALL 「〇〇万円以下」の選択肢を返す
3. WHEN 予算テキストに「〇〇万円以上」が含まれる THEN THE Price_Range_Mapper SHALL 「〇〇万円以上」の選択肢を返す
4. WHEN 予算テキストが価格帯選択肢にマッピングできない THEN THE Price_Range_Mapper SHALL nullを返す
5. WHEN 物件種別が異なる THEN THE Price_Range_Mapper SHALL 物件種別に応じた価格帯選択肢を使用する

### Requirement 4: 上書きルール（最終更新日時による優先順位）

**User Story:** As a 営業担当者, I want 後から編集した方の値が優先される, so that 意図しない上書きを防ぐことができる

#### Acceptance Criteria

1. WHEN 問合せ時ヒアリングと希望条件フィールドの両方が更新される THEN THE System SHALL 各フィールドの最終更新日時を比較する
2. WHEN 希望条件フィールドの最終更新日時が問合せ時ヒアリングより新しい THEN THE System SHALL 希望条件フィールドの値を保持する
3. WHEN 問合せ時ヒアリングの最終更新日時が希望条件フィールドより新しい THEN THE System SHALL 問合せ時ヒアリングからパースした値で上書きする
4. WHEN 希望条件フィールドが未設定（null）である THEN THE System SHALL 最終更新日時に関係なく問合せ時ヒアリングからパースした値を設定する

### Requirement 5: クイックボタン名の変更

**User Story:** As a 営業担当者, I want クイックボタンの名前が分かりやすい, so that 入力時に迷わない

#### Acceptance Criteria

1. WHEN 希望条件ページを表示する THEN THE System SHALL 「リフォーム込みの予算（最高額）」ボタンを「予算」として表示する
2. WHEN 「予算」ボタンをクリックする THEN THE System SHALL 既存の動作（フィールドへの入力補助）を維持する

### Requirement 6: データ整合性の保証

**User Story:** As a システム管理者, I want データの整合性が常に保たれる, so that データベースが破損しない

#### Acceptance Criteria

1. WHEN 問合せ時ヒアリングを保存する THEN THE System SHALL トランザクション内で全ての更新を実行する
2. WHEN 希望条件フィールドの更新が失敗する THEN THE System SHALL ロールバックして問合せ時ヒアリングの保存も失敗させる
3. WHEN パース処理が例外をスローする THEN THE System SHALL エラーをキャッチして問合せ時ヒアリングの保存は成功させる
4. WHEN 複数のフィールドを同時に更新する THEN THE System SHALL 全てのフィールドの最終更新日時を同じ値に設定する

### Requirement 7: ログとモニタリング

**User Story:** As a システム管理者, I want パース処理の実行状況を確認できる, so that 問題が発生した時に原因を特定できる

#### Acceptance Criteria

1. WHEN パース処理が実行される THEN THE System SHALL 処理開始をログに記録する
2. WHEN パターンマッチングが成功する THEN THE System SHALL 抽出した値をログに記録する
3. WHEN フィールドの上書きが発生する THEN THE System SHALL 上書き前後の値と最終更新日時をログに記録する
4. WHEN パースエラーが発生する THEN THE System SHALL エラー内容とスタックトレースをログに記録する

### Requirement 8: パフォーマンス要件

**User Story:** As a ユーザー, I want 問合せ時ヒアリングの保存が遅延しない, so that スムーズに作業できる

#### Acceptance Criteria

1. WHEN 問合せ時ヒアリングを保存する THEN THE System SHALL 2秒以内に処理を完了する
2. WHEN パース処理が実行される THEN THE System SHALL データベースクエリを最小限に抑える
3. WHEN 複数のフィールドを更新する THEN THE System SHALL バッチ更新を使用する

