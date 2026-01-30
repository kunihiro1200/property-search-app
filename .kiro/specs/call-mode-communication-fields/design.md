# 通話モード - コミュニケーションフィールド追加 設計書

## 概要

売主管理システムの通話モードページに、売主とのコミュニケーションを円滑にするための3つのフィールドを追加します。

---

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│ フロントエンド (frontend/src/pages/CallModePage.tsx)        │
│  - 3つの新しいフィールドを表示                               │
│  - スタッフプルダウンの実装                                  │
│  - 保存ボタンで一括保存                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ バックエンドAPI (backend/src/)                              │
│  - GET /api/employees/active - スタッフ一覧取得             │
│  - PATCH /api/sellers/:id - 売主情報更新                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ データベース (Supabase)                                      │
│  - sellers テーブルに3つのカラムを追加                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ スプレッドシート同期 (SpreadsheetSyncService)                │
│  - 双方向同期（DB ⇔ スプレッドシート）                       │
└─────────────────────────────────────────────────────────────┘
```

---

## データベース設計

### sellersテーブルへの追加カラム

```sql
-- 電話担当者（イニシャル）
ALTER TABLE sellers
ADD COLUMN phone_contact_person TEXT;

-- 連絡取りやすい日、時間帯
ALTER TABLE sellers
ADD COLUMN preferred_contact_time TEXT;

-- 連絡方法
ALTER TABLE sellers
ADD COLUMN contact_method TEXT;
```

### カラム仕様

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|---------|------------|------|
| `phone_contact_person` | TEXT | YES | NULL | 電話担当者のイニシャル |
| `preferred_contact_time` | TEXT | YES | NULL | 連絡取りやすい日、時間帯 |
| `contact_method` | TEXT | YES | NULL | 連絡方法 |

---

## API設計

### 1. スタッフ一覧取得API

**エンドポイント**: `GET /api/employees/active`

**説明**: 通常=TRUEのスタッフのイニシャル一覧を取得

**クエリパラメータ**: なし

**レスポンス**:
```typescript
{
  employees: Array<{
    id: string;
    initials: string;
    name: string;
    isActive: boolean;
  }>
}
```

**実装ファイル**: `backend/src/routes/employees.ts`

**実装例**:
```typescript
router.get('/active', async (req, res) => {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, initials, name, is_active')
      .eq('is_active', true)
      .order('initials', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. 売主情報更新API（拡張）

**エンドポイント**: `PATCH /api/sellers/:id`

**説明**: 既存の売主情報更新APIを拡張して、新しいフィールドをサポート

**リクエストボディ**:
```typescript
{
  phoneContactPerson?: string;      // 電話担当者のイニシャル
  preferredContactTime?: string;    // 連絡取りやすい日、時間帯
  contactMethod?: string;           // 連絡方法
  // ... 既存のフィールド
}
```

**レスポンス**:
```typescript
{
  seller: Seller  // 更新後の売主情報
}
```

**実装ファイル**: `backend/src/services/SellerService.supabase.ts`

**実装箇所**: `updateSeller` メソッドに以下を追加

```typescript
// 新しいフィールドの追加
if (data.phoneContactPerson !== undefined) {
  updates.phone_contact_person = data.phoneContactPerson;
}
if (data.preferredContactTime !== undefined) {
  updates.preferred_contact_time = data.preferredContactTime;
}
if (data.contactMethod !== undefined) {
  updates.contact_method = data.contactMethod;
}
```

---

## スプレッドシート同期設計

### カラムマッピング設定

**ファイル**: `backend/src/config/column-mapping.json`

**追加内容**:

```json
{
  "spreadsheetToDatabase": {
    "電話担当（任意）": "phone_contact_person",
    "連絡取りやすい日、時間帯": "preferred_contact_time",
    "連絡方法": "contact_method"
  },
  "databaseToSpreadsheet": {
    "phone_contact_person": "電話担当（任意）",
    "preferred_contact_time": "連絡取りやすい日、時間帯",
    "contact_method": "連絡方法"
  }
}
```

### 同期フロー

1. **読み込み**: 通話モードページを開いた時
   - `SellerService.getSeller()` → データベースから取得
   - フロントエンドで表示

2. **書き込み**: 保存ボタンをクリックした時
   - フロントエンド → `PATCH /api/sellers/:id`
   - `SellerService.updateSeller()` → データベースを更新
   - `SpreadsheetSyncService.syncToSpreadsheet()` → スプレッドシートに同期

---

## フロントエンド設計

### コンポーネント構造

**ファイル**: `frontend/src/pages/CallModePage.tsx`

### 状態管理

```typescript
// 新しい状態を追加
const [editedPhoneContactPerson, setEditedPhoneContactPerson] = useState<string>('');
const [editedPreferredContactTime, setEditedPreferredContactTime] = useState<string>('');
const [editedContactMethod, setEditedContactMethod] = useState<string>('');
const [activeEmployees, setActiveEmployees] = useState<Employee[]>([]);
```

### データ取得

```typescript
// スタッフ一覧を取得
useEffect(() => {
  const fetchActiveEmployees = async () => {
    try {
      const response = await api.get('/api/employees/active');
      setActiveEmployees(response.data.employees);
    } catch (error) {
      console.error('Failed to fetch active employees:', error);
    }
  };
  
  fetchActiveEmployees();
}, []);

// 売主情報を取得した時に初期化
useEffect(() => {
  if (seller) {
    setEditedPhoneContactPerson(seller.phoneContactPerson || '');
    setEditedPreferredContactTime(seller.preferredContactTime || '');
    setEditedContactMethod(seller.contactMethod || '');
  }
}, [seller]);
```

### UI実装

```tsx
{/* コミュニケーション履歴セクションの後に追加 */}

<Box sx={{ mt: 3, mb: 3 }}>
  <Typography variant="h6" gutterBottom>
    コミュニケーション設定
  </Typography>
  
  {/* 電話担当（任意） */}
  <FormControl fullWidth sx={{ mb: 2 }}>
    <InputLabel>電話担当（任意）</InputLabel>
    <Select
      value={editedPhoneContactPerson}
      onChange={(e) => setEditedPhoneContactPerson(e.target.value)}
      label="電話担当（任意）"
    >
      <MenuItem value="">
        <em>選択してください</em>
      </MenuItem>
      {activeEmployees.map((emp) => (
        <MenuItem key={emp.id} value={emp.initials}>
          {emp.initials} - {emp.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
  
  {/* 連絡取りやすい日、時間帯 */}
  <TextField
    fullWidth
    multiline
    rows={3}
    label="連絡取りやすい日、時間帯"
    value={editedPreferredContactTime}
    onChange={(e) => setEditedPreferredContactTime(e.target.value)}
    placeholder="例: 平日 10:00-12:00&#10;土曜日 14:00-16:00"
    sx={{ mb: 2 }}
  />
  
  {/* 連絡方法 */}
  <TextField
    fullWidth
    multiline
    rows={3}
    label="連絡方法"
    value={editedContactMethod}
    onChange={(e) => setEditedContactMethod(e.target.value)}
    placeholder="例: 電話優先&#10;メール可"
    sx={{ mb: 2 }}
  />
</Box>
```

### 保存処理

```typescript
const handleSave = async () => {
  try {
    setSaving(true);
    
    const updates = {
      phoneContactPerson: editedPhoneContactPerson,
      preferredContactTime: editedPreferredContactTime,
      contactMethod: editedContactMethod,
      // ... 既存のフィールド
    };
    
    await api.patch(`/api/sellers/${id}`, updates);
    
    setSuccessMessage('保存しました');
  } catch (error) {
    setError('保存に失敗しました');
  } finally {
    setSaving(false);
  }
};
```

---

## 型定義の更新

### backend/src/types/index.ts

```typescript
export interface Seller {
  // ... 既存のフィールド
  
  // 新しいフィールド
  phoneContactPerson?: string;      // 電話担当者のイニシャル
  preferredContactTime?: string;    // 連絡取りやすい日、時間帯
  contactMethod?: string;           // 連絡方法
}

export interface UpdateSellerRequest {
  // ... 既存のフィールド
  
  // 新しいフィールド
  phoneContactPerson?: string;
  preferredContactTime?: string;
  contactMethod?: string;
}
```

### frontend/src/types/index.ts

```typescript
export interface Seller {
  // ... 既存のフィールド
  
  // 新しいフィールド
  phoneContactPerson?: string;
  preferredContactTime?: string;
  contactMethod?: string;
}
```

---

## マイグレーション

### ファイル名

`backend/supabase/migrations/XXX_add_communication_fields_to_sellers.sql`

### マイグレーション内容

```sql
-- 通話モード - コミュニケーションフィールド追加

-- sellersテーブルに新しいカラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS phone_contact_person TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT,
ADD COLUMN IF NOT EXISTS contact_method TEXT;

-- コメント追加
COMMENT ON COLUMN sellers.phone_contact_person IS '電話担当者のイニシャル';
COMMENT ON COLUMN sellers.preferred_contact_time IS '連絡取りやすい日、時間帯';
COMMENT ON COLUMN sellers.contact_method IS '連絡方法';
```

---

## テスト計画

### 単体テスト

1. **API テスト**
   - スタッフ一覧取得APIが正しく動作するか
   - 売主情報更新APIが新しいフィールドを正しく保存するか

2. **スプレッドシート同期テスト**
   - データベース → スプレッドシートの同期が正しく動作するか
   - スプレッドシート → データベースの同期が正しく動作するか

### 統合テスト

1. **フロントエンド → バックエンド**
   - 保存ボタンをクリックした時に正しくAPIが呼ばれるか
   - APIレスポンスが正しく処理されるか

2. **エンドツーエンド**
   - 通話モードページで新しいフィールドを入力して保存
   - ページをリロードして値が保持されているか確認
   - スプレッドシートに正しく同期されているか確認

---

## セキュリティ考慮事項

1. **認証・認可**
   - スタッフ一覧取得は認証済みユーザーのみ
   - 売主情報更新は認証済みユーザーのみ

2. **入力検証**
   - `phoneContactPerson`: スタッフ管理に存在するイニシャルのみ許可
   - `preferredContactTime`: 最大文字数制限（1000文字）
   - `contactMethod`: 最大文字数制限（1000文字）

3. **SQLインジェクション対策**
   - Supabaseクライアントを使用（パラメータ化クエリ）

---

## パフォーマンス考慮事項

1. **スタッフ一覧のキャッシュ**
   - フロントエンドでスタッフ一覧をキャッシュ（セッション中）
   - 不要なAPI呼び出しを削減

2. **保存処理の最適化**
   - 既存の保存処理と統合（一括保存）
   - 不要なスプレッドシート同期を削減

---

## デプロイ手順

### ステップ1: マイグレーション実行

```bash
# マイグレーションファイルを作成
cd backend/supabase/migrations
# XXX_add_communication_fields_to_sellers.sql を作成

# マイグレーションを実行
npx supabase db push
```

### ステップ2: バックエンドのデプロイ

```bash
cd backend
git add .
git commit -m "feat: Add communication fields to call mode"
git push origin main
```

### ステップ3: フロントエンドのデプロイ

```bash
cd frontend
git add .
git commit -m "feat: Add communication fields to call mode"
git push origin main
```

### ステップ4: 動作確認

1. 通話モードページを開く
2. 新しいフィールドが表示されることを確認
3. スタッフプルダウンにスタッフ一覧が表示されることを確認
4. フィールドに値を入力して保存
5. ページをリロードして値が保持されていることを確認
6. スプレッドシートに同期されていることを確認

---

**作成日**: 2026年1月30日  
**作成者**: システム  
**ステータス**: レビュー待ち
