# Requirements Document

## Introduction

本機能は、売主詳細画面（SellerDetailPage）に存在する「査定計算」セクションを通話モード画面（CallModePage）に移動させることで、通話中のオペレーターが査定計算を即座に実行できるようにするものです。これにより、通話中に売主から物件情報を聞き取りながら、リアルタイムで査定額を提示できるようになります。

## Glossary

- **System**: 不動産売主管理システム
- **CallModePage**: 通話モード画面。オペレーターが売主と通話しながら情報を入力・確認する専用画面
- **SellerDetailPage**: 売主詳細画面。売主の全情報を表示・編集する画面
- **ValuationSection**: 査定計算セクション。固定資産税路線価を入力すると自動的に査定額1〜3を計算する機能
- **FixedAssetTaxRoadPrice**: 固定資産税路線価。土地の評価額を計算するための基準値
- **ValuationAmount**: 査定額。最低額（査定額1）、中間額（査定額2）、最高額（査定額3）の3つの価格帯
- **AutoCalculation**: 自動計算機能。固定資産税路線価を入力すると1秒後に自動的に査定額を計算する機能

## Requirements

### Requirement 1

**User Story:** オペレーターとして、通話中に売主から物件情報を聞き取りながら査定額を即座に計算したい。そうすることで、通話を中断せずに査定額を提示できる。

#### Acceptance Criteria

1. WHEN オペレーターが通話モード画面を開く THEN the System SHALL 査定計算セクションを表示する
2. WHEN オペレーターが固定資産税路線価を入力する THEN the System SHALL 1秒後に自動的に査定額1、査定額2、査定額3を計算する
3. WHEN 査定額が計算される THEN the System SHALL 計算根拠（建物価格と土地価格の詳細）を表示する
4. WHEN 査定額が計算される THEN the System SHALL 査定担当者名を現在のログインユーザー名で自動設定する
5. WHEN 査定額が既に存在する THEN the System SHALL 簡潔な表示モード（査定額のみ）と詳細な編集モードを切り替え可能にする

### Requirement 2

**User Story:** オペレーターとして、査定計算セクションが売主詳細画面から削除されることを確認したい。そうすることで、画面の重複を避け、通話モードに集中できる。

#### Acceptance Criteria

1. WHEN 売主詳細画面を開く THEN the System SHALL 査定計算セクションを表示しない
2. WHEN 売主詳細画面で査定額を確認する必要がある THEN the System SHALL 簡潔な査定額表示（金額のみ）を提供する
3. WHEN 売主詳細画面で査定額を編集する必要がある THEN the System SHALL 通話モード画面へのリンクを提供する

### Requirement 3

**User Story:** オペレーターとして、査定メール送信機能が通話モードで利用できることを確認したい。そうすることで、通話中に査定結果をメールで送信できる。

#### Acceptance Criteria

1. WHEN 査定額が計算されている THEN the System SHALL 査定メール送信ボタンを表示する
2. WHEN オペレーターが査定メール送信ボタンをクリックする THEN the System SHALL 売主のメールアドレスに査定結果を送信する
3. WHEN 査定額が未計算の場合 THEN the System SHALL 査定メール送信ボタンを無効化する

### Requirement 4

**User Story:** オペレーターとして、既存の査定計算ロジックが正確に動作することを確認したい。そうすることで、移動後も同じ計算結果が得られる。

#### Acceptance Criteria

1. WHEN 固定資産税路線価が入力される THEN the System SHALL 土地価格を「土地面積 × 固定資産税路線価 ÷ 0.6」で計算する
2. WHEN 建物情報が存在する THEN the System SHALL 建物価格を「建築単価 × 建物面積 - 減価償却」で計算する
3. WHEN 査定額1が計算される THEN the System SHALL 土地価格と建物価格の合計を査定額1として設定する
4. WHEN 査定額1が計算される THEN the System SHALL 査定額2を査定額1の1.1倍として計算する
5. WHEN 査定額1が計算される THEN the System SHALL 査定額3を査定額1の1.2倍として計算する

### Requirement 5

**User Story:** オペレーターとして、計算根拠が詳細に表示されることを確認したい。そうすることで、売主に対して計算方法を説明できる。

#### Acceptance Criteria

1. WHEN 査定額が計算される THEN the System SHALL 建物価格の計算根拠（物件種別、構造、建物面積、築年、築年数、建築単価、基準価格、減価償却）を表示する
2. WHEN 査定額が計算される THEN the System SHALL 土地価格の計算根拠（土地面積、固定資産税路線価、計算式）を表示する
3. WHEN 査定額が計算される THEN the System SHALL 計算式を段階的に表示する
4. WHEN 査定額が計算される THEN the System SHALL 路線価確認リンクを提供する

### Requirement 6

**User Story:** 開発者として、既存のコードを最小限の変更で移動させたい。そうすることで、バグの混入リスクを最小化できる。

#### Acceptance Criteria

1. WHEN 査定計算セクションを移動する THEN the System SHALL 既存のコンポーネント構造を維持する
2. WHEN 査定計算セクションを移動する THEN the System SHALL 既存のstate管理ロジックを維持する
3. WHEN 査定計算セクションを移動する THEN the System SHALL 既存のAPI呼び出しロジックを維持する
4. WHEN 査定計算セクションを移動する THEN the System SHALL 既存のスタイリングを維持する
