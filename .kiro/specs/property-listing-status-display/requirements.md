# Requirements Document

## Introduction

物件リストにおいて、スプレッドシートの「atbb成約済み/非公開」カラムの値に基づいて、分かりやすいステータスバッジを表示する機能を追加します。これにより、ユーザーは物件の公開状態を一目で把握でき、適切な対応を取ることができます。

## Glossary

- **Property_Listing_System**: 物件リストを管理・表示するシステム
- **Public_Property_URL**: 公開物件サイトのURL（例: https://example.com/properties/AA9313）
- **Status_Badge**: 物件のステータスを視覚的に示すバッジ（ラベル）
- **ATBB_Status_Column**: スプレッドシートの「atbb成約済み/非公開」カラム
- **Property_List_View**: 物件リストの一覧表示画面
- **Pre_Public_Badge**: 「公開前情報」を示すバッジ
- **Private_Property_Badge**: 「非公開物件」を示すバッジ
- **Completed_Badge**: 「成約済み」を示すバッジ

## Requirements

### Requirement 1: 公開前情報バッジの表示

**User Story:** As a ユーザー, I want 「atbb成約済み/非公開」に「公開前」という言葉が含まれたら「公開前情報」バッジを表示する, so that 公開前の物件を一目で識別できる

#### Acceptance Criteria

1. WHEN ATBB_Status_Column に「公開前」という文字列が含まれる, THE Property_Listing_System SHALL 「公開前情報」バッジを表示する
2. THE Pre_Public_Badge SHALL 物件番号の近くに表示される
3. THE Pre_Public_Badge SHALL 他のバッジと視覚的に区別できるデザインである
4. WHEN ATBB_Status_Column の値が変更され「公開前」が含まれなくなる, THE Property_Listing_System SHALL Pre_Public_Badge を削除する

### Requirement 2: 非公開物件バッジの表示

**User Story:** As a ユーザー, I want 「atbb成約済み/非公開」に「配信メールのみ」という言葉が含まれたら「非公開物件」バッジを表示する, so that 配信メール限定の物件を一目で識別できる

#### Acceptance Criteria

1. WHEN ATBB_Status_Column に「配信メールのみ」という文字列が含まれる, THE Property_Listing_System SHALL 「非公開物件」バッジを表示する
2. THE Private_Property_Badge SHALL 物件番号の近くに表示される
3. THE Private_Property_Badge SHALL 他のバッジと視覚的に区別できるデザインである
4. WHEN ATBB_Status_Column の値が変更され「配信メールのみ」が含まれなくなる, THE Property_Listing_System SHALL Private_Property_Badge を削除する

### Requirement 3: 成約済みバッジの表示

**User Story:** As a ユーザー, I want 「atbb成約済み/非公開」に「配信メール」という言葉がなく「非公開」という文字が含まれたら「成約済み」バッジを表示する, so that 成約済みの物件を一目で識別できる

#### Acceptance Criteria

1. WHEN ATBB_Status_Column に「非公開」という文字列が含まれる AND 「配信メール」という文字列が含まれない, THE Property_Listing_System SHALL 「成約済み」バッジを表示する
2. THE Completed_Badge SHALL 物件番号の近くに表示される
3. THE Completed_Badge SHALL 他のバッジと視覚的に区別できるデザインである
4. WHEN ATBB_Status_Column の値が変更され条件を満たさなくなる, THE Property_Listing_System SHALL Completed_Badge を削除する

### Requirement 4: 公開物件サイトURLの表示

**User Story:** As a ユーザー, I want すべての物件に対して公開物件サイトのURLを表示する, so that 公開中、成約済み、非公開に関わらず物件のURLに素早くアクセスできる

#### Acceptance Criteria

1. THE Property_Listing_System SHALL すべての物件に対して公開物件サイトのURLを表示する
2. THE Property_Listing_System SHALL 公開中、成約済み、非公開、公開前情報に関わらずURLを表示する
3. WHEN 表示されたURLがクリックされる, THE Property_Listing_System SHALL 新しいタブで公開物件サイトを開く
4. THE Property_Listing_System SHALL 物件番号を使用してURLを生成する（形式: /public/properties/{物件番号}）

### Requirement 5: データ同期とリアルタイム更新

**User Story:** As a ユーザー, I want スプレッドシートでステータスを変更したら自動的に画面に反映される, so that 手動で画面を更新する必要がない

#### Acceptance Criteria

1. WHEN スプレッドシートで ATBB_Status_Column が変更される, THE Property_Listing_System SHALL 変更を検出する
2. WHEN ステータス変更が検出される, THE Property_Listing_System SHALL データベースを更新する
3. WHEN データベースが更新される, THE Property_Listing_System SHALL 物件リスト表示を自動的に更新する
4. THE Property_Listing_System SHALL ステータス変更の検出を5分以内に行う

### Requirement 6: バッジの優先順位と表示ルール

**User Story:** As a ユーザー, I want バッジが適切な優先順位で表示される, so that 最も重要な情報を見逃さない

#### Acceptance Criteria

1. WHEN 複数の条件が同時に満たされる, THE Property_Listing_System SHALL 最も優先度の高いバッジのみを表示する
2. THE Property_Listing_System SHALL バッジの優先順位を以下の順序で適用する: 公開前情報 > 非公開物件 > 成約済み
3. THE Status_Badge SHALL 物件番号の近くに表示される
4. THE Status_Badge SHALL 背景色と文字色のコントラストが十分である
5. THE Status_Badge SHALL レスポンシブデザインに対応する

### Requirement 7: エラーハンドリング

**User Story:** As a システム, I want データ取得エラーが発生しても適切に処理する, so that システムが停止しない

#### Acceptance Criteria

1. WHEN スプレッドシートからのデータ取得に失敗する, THE Property_Listing_System SHALL エラーをログに記録する
2. WHEN データベース更新に失敗する, THE Property_Listing_System SHALL エラーをログに記録し、リトライを試みる
3. WHEN ATBB_Status_Column の値が空である, THE Property_Listing_System SHALL バッジを表示しない
4. IF エラーが発生する, THEN THE Property_Listing_System SHALL 既存の表示を維持する
