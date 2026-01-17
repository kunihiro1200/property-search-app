# Requirements Document

## Introduction

通話モードページのクイックボタン（EmailテンプレートとSMSテンプレート）において、ボタンをクリックして保存した後、ボタンが無効化されていることが視覚的に分かりにくい問題を解決します。現在、ボタンは`disabled`状態になり`opacity: 0.5`が適用されますが、元のボタンの色がグレー系のため、ユーザーが無効化されたことに気づきにくい状況です。

## Glossary

- **Quick_Button**: 通話モードページのEmailテンプレートまたはSMSテンプレート選択ボタン
- **Disabled_State**: ボタンが使用済みで再度クリックできない状態
- **Visual_Feedback**: ユーザーにボタンの状態を伝えるための視覚的な表現
- **MenuItem**: Material-UIのSelectコンポーネント内の選択肢項目

## Requirements

### Requirement 1: ボタンの視覚的フィードバック強化

**User Story:** 通話モードページのユーザーとして、クイックボタンを使用した後、そのボタンが無効化されたことを明確に認識したい。

#### Acceptance Criteria

1. WHEN Quick_Buttonが無効化された状態（disabled=true）の場合、THEN THE System SHALL 背景色を明確に変更する（例: 薄いグレー `#f5f5f5` または `#e0e0e0`）
2. WHEN Quick_Buttonが無効化された状態の場合、THEN THE System SHALL テキストに取り消し線を表示する
3. WHEN Quick_Buttonが無効化された状態の場合、THEN THE System SHALL テキストの色を薄いグレー（`#9e9e9e`）に変更する
4. WHEN Quick_Buttonが「pending」状態（保存待ち）の場合、THEN THE System SHALL 黄色系の背景色（`#fff9c4`）を表示する
5. WHEN Quick_Buttonが「persisted」状態（使用済み）の場合、THEN THE System SHALL グレー系の背景色（`#f5f5f5`）を表示する

### Requirement 2: 状態バッジの視認性向上

**User Story:** 通話モードページのユーザーとして、ボタンの状態（保存待ち/使用済み）を一目で判断したい。

#### Acceptance Criteria

1. WHEN Quick_Buttonが「pending」状態の場合、THEN THE System SHALL 「保存待ち」バッジを黄色（warning color）で表示する
2. WHEN Quick_Buttonが「persisted」状態の場合、THEN THE System SHALL 「使用済み」バッジをグレー（default color）で表示する
3. WHEN バッジが表示される場合、THEN THE System SHALL バッジのフォントサイズを読みやすいサイズ（0.75rem以上）にする
4. WHEN バッジが表示される場合、THEN THE System SHALL バッジの高さを十分な高さ（20px以上）にする

### Requirement 3: ホバー時の動作

**User Story:** 通話モードページのユーザーとして、無効化されたボタンにマウスを合わせたとき、クリックできないことを明確に理解したい。

#### Acceptance Criteria

1. WHEN ユーザーが無効化されたQuick_Buttonにマウスをホバーした場合、THEN THE System SHALL カーソルを`not-allowed`に変更する
2. WHEN ユーザーが無効化されたQuick_Buttonにマウスをホバーした場合、THEN THE System SHALL ホバー時の背景色変化を無効にする
3. WHEN ユーザーが有効なQuick_Buttonにマウスをホバーした場合、THEN THE System SHALL 通常のホバーエフェクト（背景色の変化）を表示する

### Requirement 4: 一貫性のある視覚デザイン

**User Story:** 通話モードページのユーザーとして、EmailテンプレートとSMSテンプレートの両方で一貫した視覚的フィードバックを受け取りたい。

#### Acceptance Criteria

1. WHEN EmailテンプレートのQuick_Buttonが無効化された場合、THEN THE System SHALL SMSテンプレートと同じ視覚スタイルを適用する
2. WHEN SMSテンプレートのQuick_Buttonが無効化された場合、THEN THE System SHALL Emailテンプレートと同じ視覚スタイルを適用する
3. WHEN 両方のテンプレートタイプで状態バッジが表示される場合、THEN THE System SHALL 同じスタイル（色、サイズ、フォント）を使用する

### Requirement 5: アクセシビリティ

**User Story:** 視覚障害のあるユーザーとして、ボタンの無効化状態をスクリーンリーダーで理解したい。

#### Acceptance Criteria

1. WHEN Quick_Buttonが無効化された状態の場合、THEN THE System SHALL `aria-disabled="true"`属性を設定する
2. WHEN Quick_Buttonが無効化された状態の場合、THEN THE System SHALL `aria-label`に状態情報（「使用済み」または「保存待ち」）を含める
3. WHEN バッジが表示される場合、THEN THE System SHALL バッジのテキストがスクリーンリーダーで読み上げられるようにする
