# Requirements Document

## Introduction

買主詳細ページのSMS送信機能において、SMS本文に所在地（住居表示）が含まれる場合、自動的に近隣物件へのリンクを追加する機能を実装します。これにより、買主が類似物件を簡単に閲覧でき、問い合わせの機会を増やすことができます。

## Glossary

- **SMS送信機能**: 買主詳細ページから買主にSMSを送信する機能
- **近隣物件リンク**: 買主に紐づいた物件の公開URLへのリンク
- **短縮URL**: 独自ドメインを使用した短いURL（例: `https://ifoo.jp/p/AA9831`）
- **所在地（住居表示）**: 物件の住所情報を示すプレースホルダー
- **linkedProperties**: 買主に紐づいた物件のリスト
- **プレースホルダー**: SMS本文内の動的に置換される変数（例: `{所在地（住居表示）}`）
- **SMS本文**: 送信されるSMSメッセージのテキスト内容
- **BuyerDetailPage**: 買主詳細ページコンポーネント
- **リダイレクト**: 短縮URLから実際の物件詳細ページへの転送処理

## Requirements

### Requirement 1: 近隣物件リンクの自動挿入

**User Story:** As a 営業担当者, I want SMS本文に近隣物件リンクを自動的に追加したい, so that 買主が類似物件を簡単に閲覧できる

#### Acceptance Criteria

1. WHEN SMS本文に所在地（住居表示）のプレースホルダーが含まれ、かつ買主に紐づいた物件が存在する場合, THEN THE System SHALL 「お気軽にお問合せください」の直前に近隣物件リンクを挿入する
2. WHEN 近隣物件リンクを挿入する場合, THEN THE System SHALL 「類似物件はこちらから」というテキストと改行、その後にURLを追加する
3. WHEN 買主に紐づいた物件が存在しない場合, THEN THE System SHALL 近隣物件リンクを挿入しない
4. WHEN SMS本文に所在地（住居表示）のプレースホルダーが含まれない場合, THEN THE System SHALL 近隣物件リンクを挿入しない

### Requirement 2: 短縮URL形式

**User Story:** As a 営業担当者, I want 短くて分かりやすいURLを生成したい, so that SMS文字数制限を節約し、買主が安心してクリックできる

#### Acceptance Criteria

1. WHEN 近隣物件リンクを生成する場合, THEN THE System SHALL 独自ドメインを使用した短縮URL形式 `https://ifoo.jp/p/{物件番号}` でURLを生成する
2. WHEN URLを生成する場合, THEN THE System SHALL linkedProperties配列の最初の物件（linkedProperties[0]）の物件番号を使用する
3. WHEN 物件番号が存在する場合, THEN THE System SHALL 物件番号をそのままURLパスに含める（例: `https://ifoo.jp/p/AA9831`）
4. WHEN 短縮URLがクリックされた場合, THEN THE System SHALL 実際の物件詳細ページ `https://property-site-frontend-kappa.vercel.app/public/properties/{物件番号}` にリダイレクトする
5. WHEN 短縮URLの文字数を計算する場合, THEN THE System SHALL 約25-30文字程度であることを確認する

### Requirement 3: 挿入位置の制御

**User Story:** As a 営業担当者, I want 近隣物件リンクが適切な位置に挿入されることを確認したい, so that SMS本文が自然な流れになる

#### Acceptance Criteria

1. WHEN 近隣物件リンクを挿入する場合, THEN THE System SHALL 「お気軽にお問合せください」というテキストを検索する
2. WHEN 「お気軽にお問合せください」が見つかった場合, THEN THE System SHALL その直前に近隣物件リンクを挿入する
3. WHEN 近隣物件リンクを挿入する場合, THEN THE System SHALL リンクの前後に適切な改行を追加する
4. WHEN 「お気軽にお問合せください」が見つからない場合, THEN THE System SHALL SMS本文の末尾に近隣物件リンクを追加する

### Requirement 4: 文字数制限の遵守

**User Story:** As a 営業担当者, I want SMS本文が文字数制限を超えないことを確認したい, so that SMSが正常に送信される

#### Acceptance Criteria

1. WHEN 近隣物件リンクを挿入した後, THEN THE System SHALL SMS本文の文字数が670文字以内であることを確認する
2. WHEN SMS本文が670文字を超える場合, THEN THE System SHALL ユーザーに警告を表示する
3. WHEN 文字数制限を超える場合, THEN THE System SHALL SMS送信を許可しない

### Requirement 5: 既存機能との互換性

**User Story:** As a 営業担当者, I want 既存のプレースホルダー置換機能が正常に動作することを確認したい, so that 他のSMS機能に影響を与えない

#### Acceptance Criteria

1. WHEN 近隣物件リンク機能を実装する場合, THEN THE System SHALL 既存のプレースホルダー置換機能（replacePlaceholders関数）を変更しない
2. WHEN SMS本文を生成する場合, THEN THE System SHALL プレースホルダー置換を実行した後に近隣物件リンクを挿入する
3. WHEN SMSテンプレートを選択する場合, THEN THE System SHALL 既存のhandleSmsTemplateSelect関数の動作を維持する
4. WHEN SMS送信記録を保存する場合, THEN THE System SHALL 既存の`/api/buyers/:id/send-sms`エンドポイントの動作を維持する

### Requirement 7: 短縮URLリダイレクト機能

**User Story:** As a システム管理者, I want 短縮URLから実際の物件ページへのリダイレクトを実装したい, so that 買主が正しいページにアクセスできる

#### Acceptance Criteria

1. WHEN 短縮URL `https://ifoo.jp/p/{物件番号}` にアクセスした場合, THEN THE System SHALL 実際の物件詳細ページ `https://property-site-frontend-kappa.vercel.app/public/properties/{物件番号}` にHTTP 301リダイレクトする
2. WHEN リダイレクト処理を実装する場合, THEN THE System SHALL 物件番号のバリデーションを行う（例: AA9831形式）
3. WHEN 無効な物件番号の場合, THEN THE System SHALL 404エラーページを表示する
4. WHEN リダイレクト処理を実装する場合, THEN THE System SHALL 高速なレスポンス（100ms以内）を提供する
5. WHEN 短縮URLドメイン（ifoo.jp）を設定する場合, THEN THE System SHALL DNSレコードとSSL証明書を適切に設定する

### Requirement 6: リンク挿入の表示フィードバック

**User Story:** As a 営業担当者, I want SMS本文プレビューで近隣物件リンクが表示されることを確認したい, so that 送信前に内容を確認できる

#### Acceptance Criteria

1. WHEN SMSテンプレートを選択した場合, THEN THE System SHALL SMS本文プレビューに短縮URL形式の近隣物件リンクを含めて表示する
2. WHEN SMS本文を編集した場合, THEN THE System SHALL リアルタイムで近隣物件リンクの挿入状態を更新する
3. WHEN 近隣物件リンクが挿入される条件を満たさない場合, THEN THE System SHALL 近隣物件リンクなしでSMS本文を表示する
