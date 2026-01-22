# 買主詳細ページ - 問い合わせ履歴テーブルとメール送信機能

## Overview
買主詳細ページに問い合わせ履歴をテーブル形式で表示し、複数の物件を選択して「内覧前伝達事項」を含むメールを送信できる機能を実装します。また、メール送信履歴を保存します。

## Background
- 現在、買主詳細ページには紐づいた物件が PropertyInfoCard コンポーネントで表示されている
- 買主番号6647のように、過去に買主番号6648として問い合わせた履歴がある場合、重複案件として「6648」としか表示されていない
- 過去の問い合わせと今回の問い合わせを明確に区別できるテーブル表示が必要
- ユーザーは特定の物件を選択して、それらの「内覧前伝達事項」についてメールを送信したい
- メール送信履歴を残す必要がある

## User Stories

### US-1: 問い合わせ履歴テーブル表示
**As a** 営業担当者  
**I want to** 買主詳細ページで買主の全ての問い合わせ履歴をテーブル形式で確認できる  
**So that** 過去の問い合わせと今回の問い合わせを明確に区別し、履歴を把握できる

**Acceptance Criteria:**
- 買主詳細ページに問い合わせ履歴テーブルが表示される
- テーブルには以下の列が含まれる:
  - チェックボックス（選択用）
  - 買主番号
  - 物件番号
  - 物件所在地
  - 受付日
  - ステータス（今回/過去）
- 今回の問い合わせと過去の問い合わせが視覚的に区別できる（例: 背景色、バッジ）
- テーブルは受付日の降順でソートされる
- 各行をクリックすると物件詳細が表示される

### US-2: 物件選択機能
**As a** 営業担当者  
**I want to** 問い合わせ履歴テーブルで複数の物件を選択できる  
**So that** 特定の物件についてのみメールを送信できる

**Acceptance Criteria:**
- 各行にチェックボックスが表示される
- チェックボックスをクリックすると物件が選択/解除される
- 選択された行は視覚的に区別できる（例: 背景色の変更）
- 複数の物件を同時に選択できる
- 全選択/全解除のチェックボックスがヘッダーに表示される

### US-3: 選択状態の管理
**As a** 営業担当者  
**I want to** 選択した物件の数と選択をクリアするボタンを確認できる  
**So that** 現在の選択状態を把握し、必要に応じてリセットできる

**Acceptance Criteria:**
- テーブルの上部に選択数が表示される（例: "2件選択中"）
- 「選択をクリア」ボタンが表示される
- 「選択をクリア」ボタンをクリックすると全ての選択が解除される
- 物件が選択されていない場合、選択数とクリアボタンは非表示または無効化される

### US-4: Gmail送信ボタン
**As a** 営業担当者  
**I want to** 選択した物件についてGmail送信ボタンをクリックできる  
**So that** 選択した物件の内覧前伝達事項をメールで送信できる

**Acceptance Criteria:**
- テーブルの上部に「Gmail送信」ボタンが表示される
- 物件が選択されていない場合、ボタンは無効化される
- 物件が選択されている場合、ボタンには選択数が表示される（例: "Gmail送信 (2件)"）
- ボタンをクリックすると InquiryResponseEmailModal が開く

### US-5: メール送信モーダルとの統合
**As a** 営業担当者  
**I want to** 選択した物件の情報がメール送信モーダルに渡される  
**So that** 選択した物件の内覧前伝達事項を含むメールを送信できる

**Acceptance Criteria:**
- InquiryResponseEmailModal に選択した物件の配列が渡される
- モーダルには選択した物件の一覧が表示される
- メール本文には各物件の「●内覧前伝達事項」(BQ列) が含まれる
- 買主の名前とメールアドレスは買主詳細情報から自動入力される
- メール送信後、選択状態がクリアされる

### US-6: メール送信履歴の保存
**As a** 営業担当者  
**I want to** メール送信後に送信履歴が保存される  
**So that** 後で誰がいつどの物件についてメールを送信したか確認できる

**Acceptance Criteria:**
- メール送信成功後、送信履歴がデータベースに保存される
- 送信履歴には以下の情報が含まれる:
  - 送信日時
  - 送信者（従業員ID）
  - 買主ID
  - 物件ID（複数）
  - 送信先メールアドレス
  - メール件名
  - メール本文
- 送信履歴は買主詳細ページまたは別の画面で確認できる
- 送信履歴は削除できない（監査証跡として保持）

### US-7: 既存PropertyInfoCardとの共存
**As a** 営業担当者  
**I want to** 既存のPropertyInfoCard表示も維持される  
**So that** 詳細な物件情報を確認できる

**Acceptance Criteria:**
- 問い合わせ履歴テーブルの下に既存のPropertyInfoCardが表示される
- PropertyInfoCardは折りたたみ可能なセクションに配置される
- テーブルとカード表示を切り替えられる（オプション）

## Technical Requirements

### Frontend Changes

#### 新規コンポーネント: InquiryHistoryTable.tsx
1. **Props**
   ```typescript
   interface InquiryHistoryTableProps {
     buyerId: string;
     inquiryHistory: InquiryHistoryItem[];
     selectedPropertyIds: Set<string>;
     onSelectionChange: (propertyIds: Set<string>) => void;
   }

   interface InquiryHistoryItem {
     buyerNumber: string;
     propertyNumber: string;
     propertyAddress: string;
     inquiryDate: string;
     status: 'current' | 'past';
     propertyId: string;
   }
   ```

2. **Features**
   - Material-UI TableContainer, Table, TableHead, TableBody を使用
   - チェックボックス列
   - ソート機能（受付日）
   - 行クリックで物件詳細表示
   - 全選択/全解除機能

#### BuyerDetailPage.tsx の更新
1. **State Management**
   - `selectedPropertyIds: Set<string>` - 選択された物件IDのセット
   - `inquiryHistory: InquiryHistoryItem[]` - 問い合わせ履歴データ

2. **UI Components**
   - InquiryHistoryTable コンポーネントを追加
   - テーブルの上部に選択コントロールを追加:
     - 選択数表示（例: "2件選択中"）
     - 「選択をクリア」ボタン
     - 「Gmail送信」ボタン
   
3. **Event Handlers**
   - `handleSelectionChange(propertyIds: Set<string>)` - 選択変更
   - `handleClearSelection()` - 全選択をクリア
   - `handleEmailSuccess()` - メール送信成功後の処理（選択クリア、履歴保存）

4. **Data Fetching**
   - 買主の全ての問い合わせ履歴を取得するAPI呼び出し
   - 重複買主番号（例: 6647と6648）を統合して表示

#### InquiryResponseEmailModal.tsx の更新
1. **Buyer Information Auto-fill**
   - 新しい props を追加:
     ```typescript
     interface InquiryResponseEmailModalProps {
       isOpen: boolean;
       onClose: () => void;
       selectedProperties: PropertyListing[];
       onSuccess?: () => void;
       // 新規追加
       buyerInfo?: {
         name: string;
         email: string;
       };
     }
     ```
   - `buyerInfo` が提供された場合、買主名とメールアドレスを自動入力

2. **Email Content Generation**
   - 各物件の「●内覧前伝達事項」フィールドをメール本文に含める
   - フォーマット例:
     ```
     【物件番号: AA12345】
     住所: 大分市○○町
     
     内覧前伝達事項:
     - 駐車場は物件前に2台分あります
     - 鍵は現地のポストに入っています
     
     【物件番号: AA12346】
     住所: 大分市△△町
     
     内覧前伝達事項:
     - 事前に管理会社への連絡が必要です
     ```

### Backend Changes

#### 新規API Endpoint: `/api/buyers/:buyerId/inquiry-history`
- **Method**: GET
- **Response**: 買主の全ての問い合わせ履歴
  ```typescript
  {
    inquiryHistory: [
      {
        buyerNumber: "6647",
        propertyNumber: "AA12345",
        propertyAddress: "大分市○○町",
        inquiryDate: "2024-01-15",
        status: "current",
        propertyId: "prop-123"
      },
      {
        buyerNumber: "6648",
        propertyNumber: "AA12346",
        propertyAddress: "大分市△△町",
        inquiryDate: "2023-12-01",
        status: "past",
        propertyId: "prop-124"
      }
    ]
  }
  ```

#### 新規API Endpoint: `/api/email-history`
- **Method**: POST
- **Request Body**:
  ```typescript
  {
    buyerId: string;
    propertyIds: string[];
    recipientEmail: string;
    subject: string;
    body: string;
    sentBy: string; // 従業員ID
  }
  ```
- **Response**: 送信履歴ID

#### API Endpoint更新: `/api/inquiry-response/generate`
- Request body に `pre_viewing_notes` を含める処理を追加
- 各物件の「●内覧前伝達事項」をメール本文に組み込む

#### API Endpoint更新: `/api/inquiry-response/send`
- メール送信成功後、`/api/email-history` を呼び出して履歴を保存

### Database Schema

#### 新規テーブル: `email_history`
```sql
CREATE TABLE email_history (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER REFERENCES buyers(id),
  property_ids INTEGER[], -- 配列型
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by INTEGER REFERENCES employees(id),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_history_buyer_id ON email_history(buyer_id);
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at);
```

#### 既存テーブル: `property_listings`
- 「●内覧前伝達事項」フィールド（BQ列）を使用（既存）
- カラム名を確認して適切にマッピング

## UI/UX Design

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ ← 買主詳細: 山田太郎                          [編集] [保存]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 問い合わせ履歴                                          │ │
│ │                                                         │ │
│ │ [2件選択中] [選択をクリア] [Gmail送信 (2件)]           │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────┐   │ │
│ │ │☑│買主番号│物件番号│物件所在地    │受付日  │状態│   │ │
│ │ ├─────────────────────────────────────────────────┤   │ │
│ │ │☑│6647   │AA12345 │大分市○○町   │2024-01 │今回│   │ │
│ │ │☑│6647   │AA12346 │大分市△△町   │2024-01 │今回│   │ │
│ │ │☐│6648   │AA12347 │大分市××町   │2023-12 │過去│   │ │
│ │ └─────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 物件詳細カード（折りたたみ可能）                        │ │
│ │ ▼ 物件情報を表示                                        │ │
│ │                                                         │ │
│ │ [PropertyInfoCard コンポーネント]                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 買主情報                                                │ │
│ │ - 買主番号: 6647                                        │ │
│ │ - 氏名: 山田太郎                                        │ │
│ │ - メール: yamada@example.com                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Visual States

#### テーブル行の状態
- **今回の問い合わせ**: 背景色 `#e3f2fd` (薄い青)、バッジ「今回」
- **過去の問い合わせ**: 背景色 `#f5f5f5` (グレー)、バッジ「過去」
- **選択された行**: 背景色 `#bbdefb` (濃い青)、チェックボックスにチェック

#### Gmail送信ボタン
- 物件未選択時: 無効化（グレーアウト）
- 物件選択時: 有効化（青色）、選択数を表示

## Implementation Steps

### Phase 1: 問い合わせ履歴テーブルの実装
1. InquiryHistoryTable コンポーネントを作成
2. テーブルUIを実装（Material-UI使用）
3. チェックボックス選択機能を実装
4. ソート機能を実装

### Phase 2: BuyerDetailPage の統合
1. InquiryHistoryTable を BuyerDetailPage に追加
2. 選択コントロールUI（選択数、クリアボタン、Gmail送信ボタン）を実装
3. イベントハンドラーを実装
4. 問い合わせ履歴データの取得API呼び出し

### Phase 3: メール送信モーダルとの統合
1. InquiryResponseEmailModal に `buyerInfo` props を追加
2. 買主情報の自動入力機能を実装
3. BuyerDetailPage から選択された物件と買主情報を渡す

### Phase 4: バックエンド - 問い合わせ履歴API
1. `/api/buyers/:buyerId/inquiry-history` エンドポイントを実装
2. 重複買主番号を統合するロジックを実装
3. 受付日でソートして返す

### Phase 5: バックエンド - メール生成ロジック
1. `/api/inquiry-response/generate` エンドポイントを更新
2. 「●内覧前伝達事項」をメール本文に含める処理を追加
3. メールテンプレートのフォーマットを調整

### Phase 6: バックエンド - メール送信履歴
1. `email_history` テーブルを作成（マイグレーション）
2. `/api/email-history` エンドポイントを実装
3. `/api/inquiry-response/send` を更新して履歴保存を追加

### Phase 7: テストと調整
1. 複数物件選択のテスト
2. メール送信のテスト
3. 送信履歴保存のテスト
4. UI/UXの微調整

## Testing Scenarios

### Test Case 1: 問い合わせ履歴テーブル表示
- [ ] 買主詳細ページに問い合わせ履歴テーブルが表示される
- [ ] 今回と過去の問い合わせが視覚的に区別できる
- [ ] テーブルは受付日の降順でソートされる
- [ ] 買主番号6647と6648が統合されて表示される

### Test Case 2: 物件選択
- [ ] チェックボックスをクリックして物件を選択できる
- [ ] 選択された行の背景色が変わる
- [ ] 複数の物件を選択できる
- [ ] 選択数が正しく表示される
- [ ] 全選択/全解除が機能する

### Test Case 3: 選択クリア
- [ ] 「選択をクリア」ボタンで全選択が解除される
- [ ] 選択数が0になる
- [ ] Gmail送信ボタンが無効化される

### Test Case 4: メール送信
- [ ] Gmail送信ボタンをクリックするとモーダルが開く
- [ ] 買主名とメールアドレスが自動入力される
- [ ] 選択した物件の一覧が表示される
- [ ] メール本文に各物件の内覧前伝達事項が含まれる
- [ ] メール送信後、選択がクリアされる

### Test Case 5: メール送信履歴
- [ ] メール送信成功後、送信履歴がデータベースに保存される
- [ ] 送信履歴に必要な情報が全て含まれる
- [ ] 送信履歴を確認できる

### Test Case 6: エッジケース
- [ ] 物件が0件の場合、適切なメッセージが表示される
- [ ] 物件が1件のみの場合、正常に動作する
- [ ] 内覧前伝達事項が空の物件の場合、適切に処理される
- [ ] 重複買主番号がない場合、正常に動作する

## Success Criteria
- ✅ 買主詳細ページに問い合わせ履歴テーブルが表示される
- ✅ 過去と今回の問い合わせが明確に区別できる
- ✅ 複数の物件を選択してメール送信できる
- ✅ メールに内覧前伝達事項が含まれる
- ✅ 買主情報が自動入力される
- ✅ メール送信履歴が保存される
- ✅ UI/UXが直感的で使いやすい

## Notes
- 既存の InquiryResponseEmailModal の機能を最大限活用する
- PropertyInfoCard の既存の表示機能は維持する（折りたたみ可能なセクションに配置）
- 買主番号6647（過去の買主番号6648を持つ）をテストケースとして使用する
- 「●内覧前伝達事項」フィールドは property_listings テーブルのBQ列に対応

## Current Status

### 🔴 BLOCKER: Task 3 - email_history Table Not Created

**Critical Issue**: The `email_history` table does not exist in the database. The migration SQL was never executed in Supabase SQL Editor.

**Impact**:
- Task 3 (Backend - Email History API) is blocked
- Cannot test API endpoints
- Cannot proceed to Task 4 (integration)
- Frontend tasks (6-10) are blocked

**Required Action**:
1. User must manually execute SQL in Supabase SQL Editor
2. See detailed instructions: `.kiro/specs/buyer-detail-property-email-selection/TASK_3_BLOCKER_STATUS.md`
3. Quick guide (Japanese): `backend/DATABASE_URL接続エラー_解決策.md`

**Files Ready**:
- ✅ Migration SQL: `backend/migrations/056_add_email_history.sql`
- ✅ Service implementation: `backend/src/services/EmailHistoryService.ts`
- ✅ REST API alternative: `backend/src/services/EmailHistoryService.rest.ts`
- ✅ Test script: `backend/check-email-history-table.ts`

**Next Step**: Execute migration SQL → Verify with test script → Continue to Task 4

---

## Related Files
- `frontend/src/pages/BuyerDetailPage.tsx`
- `frontend/src/components/InquiryHistoryTable.tsx` (新規)
- `frontend/src/components/PropertyInfoCard.tsx`
- `frontend/src/components/InquiryResponseEmailModal.tsx`
- `frontend/src/components/InquiryResponseButton.tsx`
- `backend/src/routes/inquiryResponse.ts`
- `backend/src/routes/buyers.ts`
- `backend/src/routes/emailHistory.ts` (新規)
- `backend/src/services/InquiryResponseService.ts`
- `backend/src/services/EmailHistoryService.ts` (新規 - ✅ Complete)
- `backend/src/services/EmailHistoryService.rest.ts` (新規 - ✅ Complete, DNS workaround)
- `backend/migrations/056_add_email_history.sql` (新規 - ⚠️ NOT EXECUTED)
