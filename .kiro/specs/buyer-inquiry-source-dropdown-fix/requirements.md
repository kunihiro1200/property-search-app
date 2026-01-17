# Requirements Document

## Introduction

買主の新規登録画面において、物件詳細ページから開いた場合に問合せ元の選択肢が古いハードコードされた値になっている問題を修正する。買主リストから開いた場合は正しい選択肢が表示されているため、同じ選択肢を使用するように統一する必要がある。

## Glossary

- **NewBuyerPage**: 買主の新規登録画面コンポーネント
- **INQUIRY_SOURCE_OPTIONS**: 問合せ元の選択肢を定義したユーティリティ定数
- **Autocomplete**: Material-UIのオートコンプリートコンポーネント（カテゴリ別グループ化をサポート）
- **Select**: Material-UIの基本的なセレクトコンポーネント

## Requirements

### Requirement 1

**User Story:** 買主登録担当者として、物件詳細ページから買主を新規登録する際に、正しい問合せ元の選択肢を選択できるようにしたい。

#### Acceptance Criteria

1. WHEN ユーザーが物件詳細ページから買主新規登録画面を開く THEN システムは`buyerInquirySourceOptions.ts`で定義された問合せ元の選択肢を表示する
2. WHEN ユーザーが買主リストページから買主新規登録画面を開く THEN システムは`buyerInquirySourceOptions.ts`で定義された問合せ元の選択肢を表示する
3. WHEN ユーザーが問合せ元の選択肢を開く THEN システムはカテゴリ別にグループ化された選択肢を表示する
4. WHEN ユーザーが問合せ元を選択する THEN システムは選択された値を正しく保存する
5. WHEN ユーザーが問合せ元の入力フィールドに文字を入力する THEN システムは入力内容に基づいて選択肢をフィルタリングする

### Requirement 2

**User Story:** 開発者として、問合せ元の選択肢を一元管理し、すべての画面で同じ選択肢を使用できるようにしたい。

#### Acceptance Criteria

1. WHEN 問合せ元の選択肢を更新する必要がある THEN 開発者は`buyerInquirySourceOptions.ts`のみを更新すればよい
2. WHEN 新規登録画面で問合せ元を表示する THEN システムは`INQUIRY_SOURCE_OPTIONS`定数を使用する
3. WHEN 詳細画面で問合せ元を表示する THEN システムは`INQUIRY_SOURCE_OPTIONS`定数を使用する
4. WHEN すべての買主関連画面で問合せ元を表示する THEN システムは同じデータソースから選択肢を取得する
