# 設計書

## 概要

通話モードページの訪問予約セクションに「訪問部」「営担」「訪問査定取得者」の3つのフィールドを追加します。これらのフィールドはスタッフ一覧から選択可能なドロップダウンとして実装し、データベースとスプレッドシートの両方に保存・同期されます。

## アーキテクチャ

### データフロー

```
┌─────────────────────────────────────────────────────────────┐
│                     通話モードページ                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         訪問予約セクション                           │   │
│  │                                                       │   │
│  │  訪問部: [ドロップダウン]                           │   │
│  │  営担:   [ドロップダウン]                           │   │
│  │  訪問査定取得者: [ドロップダウン]                   │   │
│  │                                                       │   │
│  │  [保存]                                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    [保存ボタンクリック]
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    バックエンドAPI                           │
│                                                               │
│  PUT /sellers/:id                                            │
│  - visit_department                                          │
│  - assigned_to (営担)                                        │
│  - visit_valuation_acquirer                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
              ┌─────────────┴─────────────┐
              ↓                           ↓
┌──────────────────────┐    ┌──────────────────────┐
│   Supabase Database  │    │  Google Spreadsheet  │
│                      │    │                      │
│  sellers テーブル    │    │  対応する列に書き込み│
│  - visit_department  │    │  - 訪問部            │
│  - assigned_to       │    │  - 営担              │
│  - visit_valuation_  │    │  - 訪問査定取得者    │
│    acquirer          │    │                      │
└──────────────────────┘    └──────────────────────┘
```

### 同期フロー

```
スプレッドシート → システム (読み込み)
┌──────────────────────┐
│  Google Spreadsheet  │
│  - 訪問部            │
│  - 営担              │
│  - 訪問査定取得者    │
└──────────────────────┘
          ↓
    [同期処理]
          ↓
┌──────────────────────┐
│  Supabase Database   │
│  - visit_department  │
│  - assigned_to       │
│  - visit_valuation_  │
│    acquirer          │
└──────────────────────┘

システム → スプレッドシート (書き込み)
┌──────────────────────┐
│  通話モードページ    │
│  [保存]              │
└──────────────────────┘
          ↓
    [API呼び出し]
          ↓
┌──────────────────────┐
│  Supabase Database   │
│  データ保存          │
└──────────────────────┘
          ↓
    [同期処理]
          ↓
┌──────────────────────┐
│  Google Spreadsheet  │
│  データ書き込み      │
└──────────────────────┘
```

## コンポーネントとインターフェース

### 1. データベーススキーマ拡張

`sellers` テーブルに以下の列を追加：

```sql
ALTER TABLE sellers
ADD COLUMN visit_department TEXT,
ADD COLUMN visit_valuation_acquirer TEXT;
```

- `visit_department`: 訪問部（スタッフのメールアドレスを保存）
- `visit_valuation_acquirer`: 訪問査定取得者（スタッフのメールアドレスを保存）
- `assigned_to`: 営担（既存の列、UUID型でemployees.idを参照）

**注意:** `assigned_to` は既存の列で、UUID型です。新しい2つの列はTEXT型でメールアドレスを保存します。これは既存の実装との一貫性を保つためです。

### 2. フロントエンド - CallModePage コンポーネント

#### 状態変数の追加

```typescript
// 訪問予約編集用の状態（既存）
const [editingAppointment, setEditingAppointment] = useState(false);
const [editedAppointmentDate, setEditedAppointmentDate] = useState<string>('');
const [editedAssignedTo, setEditedAssignedTo] = useState<string>(''); // 営担（既存）
const [editedAppointmentNotes, setEditedAppointmentNotes] = useState<string>('');

// 新規追加
const [editedVisitDepartment, setEditedVisitDepartment] = useState<string>(''); // 訪問部
const [editedVisitValuationAcquirer, setEditedVisitValuationAcquirer] = useState<string>(''); // 訪問査定取得者
```

#### UI実装

訪問予約セクションの編集モードに以下のフィールドを追加：

```tsx
{/* 訪問部 */}
<Grid item xs={12}>
  <FormControl fullWidth size="small">
    <InputLabel>訪問部</InputLabel>
    <Select
      value={editedVisitDepartment}
      label="訪問部"
      onChange={(e) => setEditedVisitDepartment(e.target.value)}
    >
      <MenuItem value="">
        <em>未設定</em>
      </MenuItem>
      {employees.map((emp) => (
        <MenuItem key={emp.email} value={emp.email}>
          {emp.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>

{/* 営担（既存） */}
<Grid item xs={12}>
  <FormControl fullWidth size="small">
    <InputLabel>営担</InputLabel>
    <Select
      value={editedAssignedTo}
      label="営担"
      onChange={(e) => setEditedAssignedTo(e.target.value)}
    >
      <MenuItem value="">
        <em>未設定</em>
      </MenuItem>
      {employees.map((emp) => (
        <MenuItem key={emp.email} value={emp.email}>
          {emp.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>

{/* 訪問査定取得者 */}
<Grid item xs={12}>
  <FormControl fullWidth size="small">
    <InputLabel>訪問査定取得者</InputLabel>
    <Select
      value={editedVisitValuationAcquirer}
      label="訪問査定取得者"
      onChange={(e) => setEditedVisitValuationAcquirer(e.target.value)}
    >
      <MenuItem value="">
        <em>未設定</em>
      </MenuItem>
      {employees.map((emp) => (
        <MenuItem key={emp.email} value={emp.email}>
          {emp.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>
```

表示モードでは以下のように表示：

```tsx
{/* 訪問部 */}
<Box sx={{ mb: 2 }}>
  <Typography variant="body2" color="text.secondary">
    訪問部
  </Typography>
  <Typography variant="body1">
    {seller?.visitDepartment 
      ? employees.find(emp => emp.email === seller.visitDepartment)?.name || seller.visitDepartment
      : '未設定'}
  </Typography>
</Box>

{/* 営担（既存） */}
<Box sx={{ mb: 2 }}>
  <Typography variant="body2" color="text.secondary">
    営担
  </Typography>
  <Typography variant="body1">
    {seller?.assignedTo 
      ? employees.find(emp => emp.email === seller.assignedTo)?.name || seller.assignedTo
      : '未設定'}
  </Typography>
</Box>

{/* 訪問査定取得者 */}
<Box sx={{ mb: 2 }}>
  <Typography variant="body2" color="text.secondary">
    訪問査定取得者
  </Typography>
  <Typography variant="body1">
    {seller?.visitValuationAcquirer 
      ? employees.find(emp => emp.email === seller.visitValuationAcquirer)?.name || seller.visitValuationAcquirer
      : '未設定'}
  </Typography>
</Box>
```

#### 訪問査定日時変更時の自動設定

訪問査定日時が入力されたときに、訪問査定取得者を自動的に設定：

```typescript
const handleAppointmentDateChange = (newDate: string) => {
  setEditedAppointmentDate(newDate);
  
  // 訪問査定日時が入力された場合、現在のログインユーザーを訪問査定取得者に設定
  if (newDate && currentUser?.email) {
    // 現在のログインユーザーのメールアドレスからスタッフを検索
    const currentStaff = employees.find(emp => emp.email === currentUser.email);
    
    if (currentStaff) {
      // スタッフが見つかった場合、訪問査定取得者に設定（既存の値を上書き）
      setEditedVisitValuationAcquirer(currentStaff.email);
    }
    // スタッフが見つからない場合は何もしない（空のまま）
  }
};
```

UIでの使用：

```tsx
<TextField
  fullWidth
  size="small"
  label="訪問査定日時"
  type="datetime-local"
  value={editedAppointmentDate}
  onChange={(e) => handleAppointmentDateChange(e.target.value)}
  InputLabelProps={{ shrink: true }}
/>
```

#### 保存処理の更新

```typescript
const handleSaveAppointment = async () => {
  if (!seller) return;
  
  try {
    setSavingAppointment(true);
    setError(null);
    setAppointmentSuccessMessage(null);

    await api.put(`/sellers/${id}`, {
      appointmentDate: editedAppointmentDate || null,
      assignedTo: editedAssignedTo || null,
      appointmentNotes: editedAppointmentNotes || null,
      visitDepartment: editedVisitDepartment || null, // 新規追加
      visitValuationAcquirer: editedVisitValuationAcquirer || null, // 新規追加
    });

    setAppointmentSuccessMessage('訪問予約情報を更新しました');
    setEditingAppointment(false);
    
    // データを再読み込み
    await loadAllData();
  } catch (err: any) {
    console.error('Failed to save appointment:', err);
    setError(err.response?.data?.error?.message || '訪問予約情報の更新に失敗しました');
  } finally {
    setSavingAppointment(false);
  }
};
```

### 3. バックエンド - API エンドポイント

#### PUT /sellers/:id の更新

`backend/src/routes/sellers.ts` の更新処理に新しいフィールドを追加：

```typescript
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      // ... 既存のフィールド
      appointmentDate,
      assignedTo,
      appointmentNotes,
      visitDepartment, // 新規追加
      visitValuationAcquirer, // 新規追加
    } = req.body;

    // Supabaseを更新
    const { data, error } = await supabase
      .from('sellers')
      .update({
        // ... 既存のフィールド
        appointment_date: appointmentDate,
        assigned_to: assignedTo,
        appointment_notes: appointmentNotes,
        visit_department: visitDepartment, // 新規追加
        visit_valuation_acquirer: visitValuationAcquirer, // 新規追加
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // スプレッドシートに同期
    await syncToSpreadsheet(id);

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});
```

### 4. スプレッドシート同期

#### column-mapping.json の更新

```json
{
  "spreadsheetToDatabase": {
    "訪問部": "visit_department",
    "営担": "visit_assignee",
    "訪問査定取得者": "visit_valuation_acquirer"
  },
  "databaseToSpreadsheet": {
    "visit_department": "訪問部",
    "visit_assignee": "営担",
    "visit_valuation_acquirer": "訪問査定取得者"
  }
}
```

#### ColumnMapper の更新

`backend/src/services/ColumnMapper.ts` に新しいフィールドのマッピングを追加：

```typescript
export interface SellerData {
  // ... 既存のフィールド
  visit_department?: string;
  visit_assignee?: string;
  visit_valuation_acquirer?: string;
}

class ColumnMapper {
  mapToSheet(seller: SellerData): SheetRow {
    return {
      // ... 既存のマッピング
      '訪問部': seller.visit_department || '',
      '営担': seller.visit_assignee || '',
      '訪問査定取得者': seller.visit_valuation_acquirer || '',
    };
  }

  mapFromSheet(row: SheetRow): SellerData {
    return {
      // ... 既存のマッピング
      visit_department: row['訪問部'] || null,
      visit_assignee: row['営担'] || null,
      visit_valuation_acquirer: row['訪問査定取得者'] || null,
    };
  }
}
```

### 5. 型定義の更新

#### frontend/src/types/index.ts

```typescript
export interface Seller {
  // ... 既存のフィールド
  appointmentDate?: string;
  assignedTo?: string;
  appointmentNotes?: string;
  visitDepartment?: string; // 新規追加
  visitValuationAcquirer?: string; // 新規追加
}
```

#### backend/src/types/index.ts

```typescript
export interface Seller {
  // ... 既存のフィールド
  appointment_date?: string;
  assigned_to?: string;
  appointment_notes?: string;
  visit_department?: string; // 新規追加
  visit_valuation_acquirer?: string; // 新規追加
}
```

## データモデル

### Seller テーブル（拡張後）

| 列名 | 型 | NULL許可 | 説明 |
|------|-----|----------|------|
| id | UUID | NO | 主キー |
| ... | ... | ... | 既存の列 |
| appointment_date | TIMESTAMP | YES | 訪問予定日時 |
| assigned_to | TEXT | YES | 営担（スタッフのメールアドレス） |
| appointment_notes | TEXT | YES | 訪問メモ |
| visit_department | TEXT | YES | 訪問部（スタッフのメールアドレス） |
| visit_valuation_acquirer | TEXT | YES | 訪問査定取得者（スタッフのメールアドレス） |
| ... | ... | ... | 既存の列 |

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。*

### Property 1: フィールド保存の一貫性

*任意の* 売主に対して、訪問予約情報を保存すると、訪問部、営担、訪問査定取得者の3つのフィールドすべてがデータベースに保存されるべきである

**検証: 要件 1.5**

### Property 2: ドロップダウン選択肢の一貫性

*任意の* スタッフ一覧に対して、訪問部、営担、訪問査定取得者のドロップダウンは同じスタッフ一覧を表示するべきである

**検証: 要件 2.1, 2.2, 2.3**

### Property 3: スプレッドシート同期の双方向性

*任意の* 売主に対して、システムで訪問予約情報を保存すると、スプレッドシートの対応する列に同じ値が書き込まれるべきである

**検証: 要件 3.1, 3.2, 3.3**

### Property 4: スプレッドシート読み込みの正確性

*任意の* スプレッドシートの行に対して、訪問部、営担、訪問査定取得者の列からデータを読み取ると、データベースに正しく保存されるべきである

**検証: 要件 4.1, 4.2, 4.3, 4.4**

### Property 5: 未設定値の表示

*任意の* 売主に対して、訪問部、営担、訪問査定取得者のいずれかが設定されていない場合、「未設定」と表示されるべきである

**検証: 要件 5.4**

### Property 6: スタッフ名の表示形式

*任意の* 売主に対して、訪問部、営担、訪問査定取得者のいずれかが設定されている場合、スタッフの名前が「姓 名」形式で表示されるべきである

**検証: 要件 2.4, 5.5**

### Property 7: 訪問査定取得者の自動設定

*任意の* ログインユーザーに対して、訪問査定日時を入力すると、そのユーザーのメールアドレスに対応するスタッフが訪問査定取得者フィールドに自動的に設定されるべきである

**検証: 要件 7.1, 7.2, 7.3**

### Property 8: 訪問査定取得者の上書き

*任意の* 訪問査定取得者の既存値に対して、訪問査定日時を入力すると、既存の値が現在のログインユーザーで上書きされるべきである

**検証: 要件 7.4**

### Property 9: スタッフ未検出時の動作

*任意の* ログインユーザーに対して、そのメールアドレスに対応するスタッフが見つからない場合、訪問査定取得者フィールドは空のままであるべきである

**検証: 要件 7.5**

## エラーハンドリング

### 1. データベース更新エラー

**シナリオ:** 訪問予約情報の保存時にデータベース更新が失敗

**対応:**
- エラーメッセージを表示
- 入力内容を保持
- 編集モードを維持
- 再試行を促す

### 2. スプレッドシート同期エラー

**シナリオ:** データベース更新は成功したが、スプレッドシートへの書き込みが失敗

**対応:**
- 警告メッセージを表示（「データベースは更新されましたが、スプレッドシートへの同期に失敗しました」）
- バックグラウンドで再試行
- 同期ログに記録

### 3. スタッフ一覧取得エラー

**シナリオ:** スタッフ一覧の取得に失敗

**対応:**
- エラーメッセージを表示
- ドロップダウンを無効化
- 手動入力を許可（フォールバック）

### 4. 無効なスタッフ参照

**シナリオ:** データベースに保存されているスタッフのメールアドレスが、現在のスタッフ一覧に存在しない

**対応:**
- メールアドレスをそのまま表示
- 警告アイコンを表示
- 編集時に有効なスタッフを選択するよう促す

### 5. ログインユーザー情報取得エラー

**シナリオ:** 訪問査定日時を入力したが、現在のログインユーザー情報が取得できない

**対応:**
- 訪問査定取得者の自動設定をスキップ
- エラーログに記録
- ユーザーには通知しない（手動で選択可能）

### 6. スタッフ検索失敗

**シナリオ:** ログインユーザーのメールアドレスに対応するスタッフが見つからない

**対応:**
- 訪問査定取得者を空のままにする
- エラーログに記録
- ユーザーには通知しない（手動で選択可能）

## テスト戦略

### ユニットテスト

1. **フロントエンド - CallModePage**
   - 訪問予約セクションに3つのフィールドが表示されることを確認
   - ドロップダウンにスタッフ一覧が表示されることを確認
   - 保存時に正しいデータがAPIに送信されることを確認
   - 未設定の場合に「未設定」と表示されることを確認
   - 訪問査定日時を入力すると、訪問査定取得者が自動設定されることを確認
   - ログインユーザーがスタッフ一覧に存在しない場合、訪問査定取得者が空のままであることを確認
   - 訪問査定取得者に既存値がある場合、訪問査定日時を入力すると上書きされることを確認

2. **バックエンド - API**
   - PUT /sellers/:id が新しいフィールドを受け取ることを確認
   - データベースに正しく保存されることを確認
   - スプレッドシート同期が呼び出されることを確認

3. **ColumnMapper**
   - mapToSheet が新しいフィールドを正しくマッピングすることを確認
   - mapFromSheet が新しいフィールドを正しくマッピングすることを確認

### 統合テスト

1. **エンドツーエンドフロー**
   - 通話モードページで訪問予約情報を入力
   - 保存ボタンをクリック
   - データベースに保存されることを確認
   - スプレッドシートに同期されることを確認
   - ページをリロードして値が保持されることを確認

2. **スプレッドシート同期テスト**
   - スプレッドシートに訪問予約情報を入力
   - 同期処理を実行
   - データベースに正しく保存されることを確認
   - 通話モードページで値が表示されることを確認

## 実装の注意事項

### データ型の一貫性

- `assigned_to` は既存の実装でUUID型（employees.idを参照）
- 新しい2つのフィールド（`visit_department`, `visit_valuation_acquirer`）はTEXT型でメールアドレスを保存
- これは既存の実装との一貫性を保つための設計判断

### スプレッドシートの列名

- スプレッドシートの列名は既存の命名規則に従う
- 「訪問部」「営担」「訪問査定取得者」という日本語の列名を使用

### マイグレーション

- 既存のデータに影響を与えないよう、新しい列はNULL許可
- デフォルト値は設定しない（NULL）

### パフォーマンス

- スタッフ一覧は既存のAPIエンドポイント（/employees）を使用
- ページ読み込み時に一度だけ取得
- キャッシュは不要（スタッフ一覧は頻繁に変更されない）

### セキュリティ

- 既存の認証ミドルウェアを使用
- スタッフのメールアドレスは暗号化不要（システム内部の識別子として使用）

### 訪問査定取得者の自動設定

- 訪問査定日時フィールドの `onChange` イベントで自動設定を実行
- 現在のログインユーザー情報は `authStore` から取得
- スタッフ一覧は既に読み込まれている `employees` 配列を使用
- 自動設定は既存の値を上書きする（ユーザーの意図を優先）
- 自動設定後もユーザーは手動で変更可能
