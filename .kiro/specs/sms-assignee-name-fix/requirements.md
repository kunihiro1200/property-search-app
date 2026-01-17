# Requirements Document

## Introduction

SMSテンプレート生成機能において、訪問後お礼メールで「営担」（担当者）がUUID（例：`112cec78-171c-4012-a064-d508e72ba9d3`）として表示される問題を修正する。担当者の実際の名前（例：「生野」）を正しく表示する必要がある。

## Glossary

- **SMS Template Generator**: SMSメッセージのテンプレートを生成するフロントエンドユーティリティ
- **Assignee**: 訪問査定の担当者（営担）
- **Employee**: システムに登録されている従業員
- **UUID**: 従業員を一意に識別するID
- **Initials**: 従業員の略称コード（例：'U', 'M', 'Y', 'W', 'K', '生'）

## Requirements

### Requirement 1

**User Story:** SMSテンプレート生成者として、訪問後お礼メールで担当者の実際の名前を表示したい。そうすることで、顧客に対してプロフェッショナルで個人的なメッセージを送信できる。

#### Acceptance Criteria

1. WHEN 訪問後お礼SMSを生成する THEN システムは担当者のUUIDを実際の名前に変換する
2. WHEN 担当者がinitialsコードで保存されている THEN システムは既存のマッピングを使用して名前を取得する
3. WHEN 担当者がUUIDで保存されている THEN システムは従業員データから名前を取得する
4. WHEN 担当者情報が見つからない THEN システムはデフォルトで「担当者」と表示する
5. WHEN 複数の担当者フィールド（visitAssignee、assignedTo）が存在する THEN システムは優先順位に従って正しいフィールドを使用する

### Requirement 2

**User Story:** 開発者として、従業員名の取得ロジックを再利用可能にしたい。そうすることで、他のSMSテンプレートでも同じロジックを使用できる。

#### Acceptance Criteria

1. WHEN 従業員名取得関数を作成する THEN 関数はUUIDとinitialsコードの両方を処理する
2. WHEN 従業員データが必要な THEN システムはAPIから従業員情報を取得する
3. WHEN 従業員データをキャッシュする THEN システムは不要なAPI呼び出しを削減する
4. WHEN エラーが発生する THEN システムは適切なフォールバック値を返す

### Requirement 3

**User Story:** システム管理者として、従業員データの整合性を確認したい。そうすることで、すべての担当者が正しく表示されることを保証できる。

#### Acceptance Criteria

1. WHEN 従業員テーブルを確認する THEN すべての従業員にinitialsフィールドが設定されている
2. WHEN 従業員テーブルを確認する THEN すべての従業員に名前フィールドが設定されている
3. WHEN initialsマッピングを更新する THEN 新しい従業員が追加されたときにマッピングも更新される
