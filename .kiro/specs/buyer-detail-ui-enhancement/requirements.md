# Requirements Document

## Introduction

買主詳細画面において、重要な情報の視認性を向上させ、最新状況の入力を効率化するためのUI改善を行う。

## Glossary

- **Buyer_Detail_Screen**: 買主の詳細情報を表示・編集する画面
- **Pre_Viewing_Notes**: 内覧前伝達事項フィールド
- **Latest_Status**: ★最新状況フィールド
- **Status_Dropdown**: 最新状況の選択肢を表示するドロップダウンメニュー

## Requirements

### Requirement 1: 内覧前伝達事項の視認性向上

**User Story:** As a 営業担当者, I want 内覧前伝達事項が目立つように表示される, so that 重要な情報を見落とさずに確認できる

#### Acceptance Criteria

1. WHEN 買主詳細画面が表示される, THEN THE Buyer_Detail_Screen SHALL 内覧前伝達事項フィールドに背景色を適用する
2. THE Buyer_Detail_Screen SHALL 内覧前伝達事項フィールドの背景色を他のフィールドと明確に区別できる色にする
3. WHEN 内覧前伝達事項に値が入力されている, THEN THE Buyer_Detail_Screen SHALL 背景色付きで内容を表示する
4. WHEN 内覧前伝達事項が空の場合, THEN THE Buyer_Detail_Screen SHALL 背景色付きの空フィールドを表示する

### Requirement 2: 最新状況フィールドのドロップダウン化

**User Story:** As a 営業担当者, I want 最新状況を定型の選択肢から選べる, so that 入力ミスを防ぎ、効率的に状況を記録できる

#### Acceptance Criteria

1. WHEN 買主詳細画面が表示される, THEN THE Buyer_Detail_Screen SHALL ★最新状況フィールドをドロップダウン形式で表示する
2. THE Status_Dropdown SHALL 以下の選択肢を含む:
   - A:この物件を気に入っている(こちらからの一押しが必要)
   - B:1年以内に引っ越し希望だが、この物件ではない。駐車場の要件や、日当たり等が合わない。
   - C:引っ越しは1年以上先
   - D:配信・追客不要案件(業者や確度が低く追客不要案件等)
   - 買付外れました
   - 買(一般 両手)
   - 買(一般 片手)
   - 買(専任 両手)
   - 買(専任 片手)
   - 買(他社、片手)
   - 他決
   - 2番手
   - 3番手
   - AZ:Aだが次電日不要
   - 2番手買付提出済み
   - 3番手買付提出済み
3. WHEN ユーザーがドロップダウンをクリックする, THEN THE Status_Dropdown SHALL すべての選択肢を表示する
4. WHEN ユーザーが選択肢を選ぶ, THEN THE Buyer_Detail_Screen SHALL 選択された値を★最新状況フィールドに設定する
5. WHEN 既存の買主データに最新状況の値がある, THEN THE Status_Dropdown SHALL その値を初期選択状態で表示する
6. WHEN 既存の買主データの最新状況が選択肢にない値の場合, THEN THE Status_Dropdown SHALL その値をカスタム値として表示する

### Requirement 3: データ整合性の維持

**User Story:** As a システム管理者, I want 既存データとの互換性を保つ, so that データ移行やシステム更新がスムーズに行える

#### Acceptance Criteria

1. WHEN 最新状況フィールドが更新される, THEN THE Buyer_Detail_Screen SHALL データベースに選択された値を保存する
2. THE Buyer_Detail_Screen SHALL 既存の最新状況データ形式と互換性を保つ
3. WHEN APIから買主データを取得する, THEN THE Buyer_Detail_Screen SHALL 最新状況フィールドの値を正しく読み込む
4. WHEN 買主データを保存する, THEN THE Buyer_Detail_Screen SHALL 最新状況フィールドの値を正しく保存する
