# 業務リスト「契約決済」タブのフィールド追加・変更 - 設計書

## 1. 設計概要

本設計書は、業務リスト詳細モーダルの「契約決済」タブにおけるフィールドの追加・変更・削除を実装するための技術設計を定義する。

### 1.1 主要な変更点

1. **売買契約確認フィールドの位置変更**: 売買契約締め日の直後に移動
2. **売買資料ドライブフィールドの追加**: URLフィールドとして実装
3. **チャット送信フィールドの変更**: 物件担当者のみのチャット送信フィールドに変更
4. **動的スタッフ選択**: スタッフシートの「通常=true」のイニシャルを使用
5. **条件付きフィールド表示**: 依頼先に応じた完了チャットフィールドの表示
6. **不要フィールドの削除**: 添付資料関連フィールドと固定チャットフィールドの削除

## 2. アーキテクチャ設計

### 2.1 コンポーネント構成

```
WorkTaskDetailModal
├── ContractSettlementSection (修正)
│   ├── EditableField (既存)
│   ├── EditableButtonSelect (既存)
│   ├── EditableYesNo (既存、拡張済み)
│   ├── EditableMultilineField (既存)
│   └── ConditionalChatField (新規)
└── API連携
    ├── /api/work-tasks/:propertyNumber (既存)
    ├── /api/employees/active-initials (既存)
    └── /api/employees/chat-address/:initial (新規検討)
```

### 2.2 データフロー

```
1. モーダル表示
   ↓
2. work_tasksデータ取得 (/api/work-tasks/:propertyNumber)
   ↓
3. activeStaffInitials取得 (/api/employees/active-initials)
   ↓
4. 担当者チャットフィールド表示判定 (sales_assignee存在チェック)
   ↓
5. 条件付きフィールド表示判定 (hirose_request_sales, cw_request_sales)
   ↓
6. フィールド編集
   ↓
7. 保存 (PUT /api/work-tasks/:propertyNumber)
```

## 3. データモデル設計

### 3.1 work_tasksテーブル

既存のカラムを使用（新規カラム追加なし）：

| カラム名 | 型 | 説明 | 備考 |
|---------|---|------|------|
| sales_contract_deadline | DATE | 売買契約締め日 | カテゴリー表示に使用 |
| sales_contract_confirmed | VARCHAR | 売買契約確認 | 「確認中」「確認OK」「他」 |
| sales_materials_drive | VARCHAR | 売買資料ドライブURL | 既存カラム確認必要 |
| sales_assignee | VARCHAR | 営業担当 | チャット送信フィールド表示判定に使用 |
| hirose_request_sales | VARCHAR | 広瀬さんへ依頼 | Y/N/TRUE/FALSE対応 |
| cw_request_sales | VARCHAR | CWへ依頼 | Y/N/TRUE/FALSE対応 |
| work_completed_comment | VARCHAR | 作業完了コメント | 既存カラム確認必要 |
| hirose_completed_chat_sales | VARCHAR | 作業完了チャット（廣瀬） | 既存カラム |
| cw_completed_chat_sales | VARCHAR | CWへ完了チャット | 既存カラム確認必要 |
| completed_comment_sales | VARCHAR | 完了コメント（売買関連） | 既存カラム |
| kunihiro_chat | VARCHAR | 国広とチャット | 削除（UI非表示） |
| yamamoto_chat | VARCHAR | 山本へチャット送信 | 削除（UI非表示） |
| ura_chat | VARCHAR | 裏へチャット送信 | 削除（UI非表示） |
| kadoi_chat | VARCHAR | 角井へチャット送信 | 削除（UI非表示） |

**注記**: 削除フィールドはデータベースには残すが、UIには表示しない。

### 3.2 スタッフシート

既存のスタッフシートから以下のデータを取得：

| カラム名 | 型 | 説明 | 使用目的 |
|---------|---|------|---------|
| イニシャル | VARCHAR | スタッフのイニシャル | 担当者識別 |
| 通常 | BOOLEAN | 通常スタッフフラグ | activeStaffInitials取得 |
| チャットアドレス | VARCHAR | チャットアドレス | 担当者チャット送信用 |

## 4. UI設計

### 4.1 担当者チャットフィールド

**条件**: `sales_assignee`が存在する場合のみ表示

**表示形式**:
```
{イニシャル}へチャット送信: [Y] [N]
```

**実装**:
```typescript
const AssigneeChatField = () => {
  const assignee = getValue('sales_assignee');
  
  if (!assignee) return null;
  
  // フィールド名を動的に生成（例: kunihiro_chat, yamamoto_chat等）
  const fieldName = getAssigneeChatFieldName(assignee);
  
  return (
    <EditableYesNo 
      label={`${assignee}へチャット送信`} 
      field={fieldName} 
    />
  );
};

// 担当者イニシャルからフィールド名を取得
const getAssigneeChatFieldName = (assignee: string): string => {
  const mapping: { [key: string]: string } = {
    'K': 'kunihiro_chat',
    'Y': 'yamamoto_chat',
    'U': 'ura_chat',
    'H': 'kadoi_chat',
    // 他のマッピングを追加
  };
  return mapping[assignee] || 'assignee_chat';
};
```

### 4.2 フィールド配置順序

```typescript
const ContractSettlementSection = () => (
  <Box sx={{ p: 2 }}>
    {/* 1. 売買契約締め日 */}
    <EditableField label="売買契約締め日" field="sales_contract_deadline" type="date" />
    
    {/* 2. 売買契約確認（位置変更） */}
    <EditableButtonSelect label="売買契約確認" field="sales_contract_confirmed" options={['確認中', '確認OK', '他']} />
    
    {/* 3. 売買契約備考 */}
    <EditableField label="売買契約備考" field="sales_contract_notes" />
    
    {/* 4. 売買資料ドライブ（新規） */}
    <EditableField label="売買資料ドライブ" field="sales_materials_drive" type="url" />
    
    {/* 5-17. 既存フィールド */}
    {/* ... */}
    
    {/* 18. 完了コメント（売買関連） */}
    <EditableMultilineField label="完了コメント（売買関連）" field="completed_comment_sales" />
    
    {/* 19-36. 既存フィールド */}
    {/* ... */}
    
    {/* 37. 担当者チャットフィールド（新規、条件付き） */}
    <AssigneeChatField />
  </Box>
);
```

## 5. API設計

### 5.1 既存APIの使用

**GET /api/work-tasks/:propertyNumber**
- 業務タスクデータの取得
- 変更なし

**PUT /api/work-tasks/:propertyNumber**
- 業務タスクデータの更新
- 変更なし

**GET /api/employees/active-initials**
- 通常スタッフのイニシャル取得
- 変更なし

### 5.2 新規API（検討中）

**GET /api/employees/chat-address/:initial**
- スタッフのチャットアドレス取得
- 必要に応じて実装

**レスポンス例**:
```json
{
  "initial": "U",
  "chatAddress": "ura@example.com"
}
```

## 6. バックエンド設計

### 6.1 カラムマッピング確認

`backend/src/config/work-task-column-mapping.json`で以下のマッピングを確認：

```json
{
  "spreadsheetToDatabase": {
    "売買資料ドライブ": "sales_materials_drive",
    "作業完了コメント": "work_completed_comment",
    "廣瀬さんへ完了チャット（売買関連）": "hirose_completed_chat_sales",
    "CWへ完了チャット（売買関連）": "cw_completed_chat_sales",
    "完了コメント（売買関連）": "completed_comment_sales"
  }
}
```

### 6.2 同期ロジック

**EnhancedAutoSyncService**:
- 既存の同期ロジックを使用
- Y/N → TRUE/FALSE変換に対応済み（EditableYesNoコンポーネントで対応）

## 7. テスト設計

### 7.1 単体テスト

**カテゴリー表示**:
- [ ] 締め日が設定されている場合、正しい形式で表示される
- [ ] 締め日が未設定の場合、「売買契約_未設定」と表示される

**担当者チャットフィールド**:
- [ ] sales_assigneeが存在する場合、チャットフィールドが表示される
- [ ] sales_assigneeが存在しない場合、チャットフィールドが表示されない
- [ ] 正しいフィールド名にマッピングされる

**条件付きフィールド**:
- [ ] hirose_request_sales='Y'の場合、作業完了チャット（廣瀬）が表示される
- [ ] cw_request_sales='Y'の場合、CWへ完了チャットが表示される

### 7.2 統合テスト

**AA2022での動作確認**:
- [ ] カテゴリーが「売買契約_営業確認中2/12」と表示される
- [ ] 担当が「U」なので「Uへチャット送信」が表示される
- [ ] 広瀬さんへ依頼が「N」（FALSE）と正しく表示される
- [ ] 全フィールドが正しい順序で表示される

### 7.3 手動テスト

- [ ] 複数の物件で動作確認
- [ ] 担当者が異なる物件で正しいチャットフィールドが表示される
- [ ] 保存後、スプレッドシートに正しく反映される

## 8. 実装順序

1. **フロントエンド - 売買契約確認の位置変更**
   - ContractSettlementSectionの順序変更

2. **フロントエンド - 担当者チャットフィールド**
   - AssigneeChatFieldコンポーネントの実装
   - イニシャル→フィールド名マッピング

3. **フロントエンド - 不要フィールドの削除**
   - 国広、山本、裏、角井のチャットフィールドを削除

4. **テスト**
   - AA2022での動作確認
   - 他の物件での動作確認

## 9. リスク管理

### 9.1 イニシャル→フィールド名マッピング

**リスク**: 全てのイニシャルに対応するフィールド名が存在しない可能性

**対策**:
- デフォルトフィールド名を用意
- マッピングテーブルを拡張可能にする
- 存在しないフィールドの場合はログに記録

### 9.2 後方互換性

**リスク**: 既存の業務リストデータが正しく表示されない

**対策**:
- 削除フィールドはデータベースに残す
- UIのみ非表示にする
- スプレッドシート同期は維持

## 10. パフォーマンス考慮事項

- 担当者チャットフィールドは条件分岐のみ（追加API不要）
- 既存のAPIを使用するため、追加のネットワークリクエストなし

## 11. セキュリティ考慮事項

- URLフィールドのバリデーション（既存のEditableFieldで対応）
- XSS対策（MUIコンポーネントで自動エスケープ）
- チャットアドレスの取得は認証済みユーザーのみ

## 12. 正確性プロパティ

### 12.1 担当者チャットフィールドの表示条件

**プロパティ**: sales_assigneeが存在する場合のみ、担当者チャットフィールドが表示される

**検証方法**:
```typescript
// 担当者が存在する場合
const assignee = 'U';
const shouldDisplay = assignee !== null && assignee !== undefined && assignee !== '';
assert(shouldDisplay === true);

// 担当者が存在しない場合
const assignee = null;
const shouldDisplay = assignee !== null && assignee !== undefined && assignee !== '';
assert(shouldDisplay === false);
```

### 12.2 フィールド順序の正確性

**プロパティ**: フィールドは要件定義で指定された順序で表示される

**検証方法**:
- 手動テストで順序を確認
- スクリーンショットで比較

## 13. まとめ

本設計書では、業務リスト「契約決済」タブのフィールド追加・変更・削除を実装するための技術設計を定義した。主要な変更点は以下の通り：

1. 担当者チャットフィールドの動的表示（物件担当者のみ）
2. 不要フィールドの削除（UI非表示、データは保持）
3. フィールド順序の最適化

実装は既存のコンポーネントとAPIを最大限活用し、新規APIの追加を最小限に抑える設計とした。

**注記**: 「売買契約_営業確認中{締め日}」はサイドバーのカテゴリ表示であり、契約決済タブには実装しない。
