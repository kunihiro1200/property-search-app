# 通話モード「不通」フィールド追加機能 - 設計書

## 概要

売主リストの通話モードセクションに「不通」フィールドを追加し、通話の到達状況を管理できるようにする。このフィールドの状態に基づいて、売主のステータスを自動的に更新する。

---

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────┐
│                    フロントエンド                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  CallModePage.tsx                                 │  │
│  │  - 通話モードページ                                 │  │
│  │  - 「不通」フィールドの表示・入力                     │  │
│  │  - ラジオボタンUI                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PropertyListingsPage.tsx                         │  │
│  │  - 売主リストの表示                                 │  │
│  │  - ステータスカラムの表示                            │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  useSellerStatus.ts (カスタムフック)                │  │
│  │  - ステータス計算ロジック                            │  │
│  │  - 「当日TEL分_未着手」判定                         │  │
│  │  - 反響日付チェック（2026年1月1日以降）              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    バックエンド                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  SellerSyncService.ts                             │  │
│  │  - スプレッドシート同期                              │  │
│  │  - J列（不通）の読み書き                            │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Google Sheets API                                │  │
│  │  - スプレッドシートID: 1wKBRLWbT6pSKa9IlTDabjhj... │  │
│  │  - J列: 不通                                       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## データモデル

### Seller型の拡張

```typescript
interface Seller {
  // 既存フィールド
  seller_number: string;
  name: string;
  // ... その他の既存フィールド

  // ステータス計算に必要なフィールド
  next_call_date: string | null;          // 次電日 (D列)
  status: string | null;                   // 状況（当社） (AH列)
  inquiry_date: string | null;             // 反響日付
  
  // 新規追加フィールド
  unreachable_status: string | null;       // 不通フィールド (J列)
  // 可能な値: null（未入力）、'不通'、'通電OK'
}
```

---

## UI設計

### 通話モードページの「不通」フィールド

#### 配置位置
- 「通話メモ入力」セクションの右隣
- 通話メモ入力エリアと同じ高さに配置

#### UI構造

```typescript
// frontend/src/pages/CallModePage.tsx

<Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
  {/* 左側：通話メモ入力 */}
  <Box sx={{ flex: 1 }}>
    <Typography variant="h6">📝 通話メモ入力</Typography>
    <TextField
      multiline
      rows={10}
      fullWidth
      value={callMemo}
      onChange={(e) => setCallMemo(e.target.value)}
    />
  </Box>

  {/* 右側：不通フィールド */}
  <Box sx={{ width: '200px' }}>
    <Typography variant="h6" sx={{ mb: 1 }}>📞 不通</Typography>
    <FormControl component="fieldset">
      <RadioGroup
        value={unreachableStatus || ''}
        onChange={(e) => setUnreachableStatus(e.target.value || null)}
      >
        <FormControlLabel 
          value="" 
          control={<Radio />} 
          label="未選択" 
        />
        <FormControlLabel 
          value="不通" 
          control={<Radio />} 
          label="不通" 
        />
        <FormControlLabel 
          value="通電OK" 
          control={<Radio />} 
          label="通電OK" 
        />
      </RadioGroup>
    </FormControl>
  </Box>
</Box>
```

#### スタイリング

```typescript
// ラジオボタンのスタイル
sx={{
  '& .MuiFormControlLabel-root': {
    marginBottom: 1,
  },
  '& .MuiRadio-root': {
    padding: '4px',
  },
  '& .MuiFormControlLabel-label': {
    fontSize: '14px',
  },
}}
```

---

## ステータス計算ロジックの拡張

### 既存ロジックの修正

```typescript
// frontend/src/utils/sellerStatusUtils.ts

/**
 * 当日TEL（未着手）かどうかを判定
 * 条件:
 * - 次電日が今日を含めて過去
 * - 状況（当社）に「追客中」を含む
 * - 不通フィールドが未入力（空白）
 * - 電話担当（任意）が空欄
 * - 反響日付が2026年1月1日以降 ← 新規追加
 * @param seller 売主データ
 * @param today 今日の日付
 * @returns 当日TEL（未着手）かどうか
 */
export function isCallTodayUnstarted(
  seller: Seller,
  today: Date
): boolean {
  // 次電日が今日を含めて過去かチェック
  const nextCallDate = parseDate(seller.next_call_date);
  if (!nextCallDate || nextCallDate > today) {
    return false;
  }

  // 状況（当社）に「追客中」を含むかチェック
  if (!seller.status || !seller.status.includes('追客中')) {
    return false;
  }

  // 不通フィールドが未入力かチェック
  if (seller.unreachable_status && seller.unreachable_status.trim() !== '') {
    return false;
  }

  // 電話担当（任意）が空欄かチェック
  if (seller.phone_person && seller.phone_person.trim() !== '') {
    return false;
  }

  // 反響日付が2026年1月1日以降かチェック（新規追加）
  const inquiryDate = parseDate(seller.inquiry_date);
  if (!inquiryDate) {
    return false;
  }
  
  const cutoffDate = new Date(2026, 0, 1); // 2026年1月1日
  cutoffDate.setHours(0, 0, 0, 0);
  
  if (inquiryDate < cutoffDate) {
    return false;
  }

  return true;
}
```

---

## データフロー

### 1. 通話モードでの入力

```typescript
// frontend/src/pages/CallModePage.tsx

// 状態管理
const [unreachableStatus, setUnreachableStatus] = useState<string | null>(null);

// データ読み込み時
useEffect(() => {
  const loadSellerData = async () => {
    const response = await api.get(`/api/sellers/${id}`);
    const seller = response.data;
    setUnreachableStatus(seller.unreachable_status || null);
  };
  loadSellerData();
}, [id]);

// 保存時
const handleSave = async () => {
  await api.put(`/api/sellers/${id}`, {
    unreachable_status: unreachableStatus,
    // ... その他のフィールド
  });
};
```

### 2. スプレッドシート同期

```typescript
// backend/src/services/SellerSyncService.ts

// スプレッドシートから読み込み
async syncFromSpreadsheet() {
  const rows = await this.sheetsService.getRows(SPREADSHEET_ID, 'Sheet1');
  
  for (const row of rows) {
    const seller = {
      // ... 既存フィールド
      unreachable_status: row[9] || null, // J列（10列目、0始まり）
    };
    
    await this.saveSeller(seller);
  }
}

// スプレッドシートへ書き込み
async syncToSpreadsheet(seller: Seller) {
  const row = [
    // ... 既存カラム（A-I列）
    seller.unreachable_status || '', // J列
    // ... その他のカラム
  ];
  
  await this.sheetsService.updateRow(SPREADSHEET_ID, 'Sheet1', rowIndex, row);
}
```

### 3. 売主リストでのステータス表示

```typescript
// frontend/src/pages/PropertyListingsPage.tsx

function SellerRow({ seller }: { seller: Seller }) {
  const statuses = useSellerStatus(seller);

  return (
    <tr>
      <td>{seller.seller_number}</td>
      <td>{seller.name}</td>
      {/* ... その他のカラム ... */}
      <td>
        {statuses.length > 0 ? (
          <StatusBadges statuses={statuses} />
        ) : (
          <span>-</span>
        )}
      </td>
    </tr>
  );
}
```

---

## データベーススキーマ

### sellersテーブルの拡張

```sql
-- 新規カラムの追加
ALTER TABLE sellers
ADD COLUMN unreachable_status VARCHAR(20) NULL;

-- コメント追加
COMMENT ON COLUMN sellers.unreachable_status IS '不通フィールド: 未入力（NULL）、不通、通電OK';
```

### 制約

- **型**: VARCHAR(20)
- **NULL許可**: YES
- **デフォルト値**: NULL
- **可能な値**: NULL（未入力）、'不通'、'通電OK'

---

## API設計

### 売主情報の取得

**エンドポイント**: `GET /api/sellers/:id`

**レスポンス**:
```json
{
  "seller_number": "AA13487",
  "name": "赤田直之",
  "next_call_date": "2026/1/27",
  "status": "追客中",
  "inquiry_date": "2026/1/15",
  "unreachable_status": null,
  ...
}
```

### 売主情報の更新

**エンドポイント**: `PUT /api/sellers/:id`

**リクエストボディ**:
```json
{
  "unreachable_status": "不通"
}
```

**レスポンス**:
```json
{
  "success": true,
  "seller": {
    "seller_number": "AA13487",
    "unreachable_status": "不通",
    ...
  }
}
```

---

## バリデーション

### フロントエンド

```typescript
// frontend/src/utils/validation.ts

/**
 * 不通フィールドの値を検証
 * @param value 不通フィールドの値
 * @returns 有効な場合true、無効な場合false
 */
export function validateUnreachableStatus(value: string | null): boolean {
  if (value === null || value === '') {
    return true; // 未入力は許可
  }
  
  const validValues = ['不通', '通電OK'];
  return validValues.includes(value);
}
```

### バックエンド

```typescript
// backend/src/validators/sellerValidator.ts

export function validateUnreachableStatus(value: string | null): boolean {
  if (value === null || value === '') {
    return true;
  }
  
  const validValues = ['不通', '通電OK'];
  return validValues.includes(value);
}
```

---

## エラーハンドリング

### 1. 無効な値の処理

```typescript
// フロントエンド
const handleUnreachableStatusChange = (value: string) => {
  if (!validateUnreachableStatus(value)) {
    setError('不通フィールドの値が無効です');
    return;
  }
  setUnreachableStatus(value);
};
```

### 2. 保存失敗時の処理

```typescript
// フロントエンド
const handleSave = async () => {
  try {
    await api.put(`/api/sellers/${id}`, {
      unreachable_status: unreachableStatus,
    });
    setSuccessMessage('保存しました');
  } catch (error) {
    setError('保存に失敗しました');
    console.error('Save error:', error);
  }
};
```

---

## パフォーマンス最適化

### 1. メモ化

```typescript
// useSellerStatusフック内でuseMemoを使用
return useMemo(() => {
  return calculateSellerStatus(seller);
}, [
  seller.next_call_date,
  seller.status,
  seller.inquiry_date,
  seller.unreachable_status, // 新規追加
  // ... その他の依存配列
]);
```

### 2. 条件チェックの最適化

```typescript
// 早期リターンで不要な計算を避ける
export function isCallTodayUnstarted(seller: Seller, today: Date): boolean {
  // 最も頻繁に失敗する条件を最初にチェック
  if (seller.unreachable_status && seller.unreachable_status.trim() !== '') {
    return false; // 早期リターン
  }
  
  // ... その他の条件チェック
}
```

---

## テスト戦略

### 1. ユニットテスト

```typescript
// frontend/src/utils/sellerStatusUtils.test.ts

describe('isCallTodayUnstarted', () => {
  it('不通フィールドが未入力で、反響日付が2026年1月1日以降の場合、trueを返す', () => {
    const seller = {
      next_call_date: '2026/1/20',
      status: '追客中',
      inquiry_date: '2026/1/15',
      unreachable_status: null,
      phone_person: null,
    };
    const today = new Date(2026, 0, 27);
    
    expect(isCallTodayUnstarted(seller, today)).toBe(true);
  });

  it('不通フィールドが「不通」の場合、falseを返す', () => {
    const seller = {
      next_call_date: '2026/1/20',
      status: '追客中',
      inquiry_date: '2026/1/15',
      unreachable_status: '不通',
      phone_person: null,
    };
    const today = new Date(2026, 0, 27);
    
    expect(isCallTodayUnstarted(seller, today)).toBe(false);
  });

  it('反響日付が2026年1月1日より前の場合、falseを返す', () => {
    const seller = {
      next_call_date: '2026/1/20',
      status: '追客中',
      inquiry_date: '2025/12/31',
      unreachable_status: null,
      phone_person: null,
    };
    const today = new Date(2026, 0, 27);
    
    expect(isCallTodayUnstarted(seller, today)).toBe(false);
  });
});
```

### 2. 統合テスト

```typescript
// frontend/src/pages/CallModePage.test.tsx

describe('CallModePage - 不通フィールド', () => {
  it('不通フィールドが正しく表示される', async () => {
    const seller = {
      seller_number: 'AA13487',
      unreachable_status: null,
    };

    render(<CallModePage seller={seller} />);

    expect(screen.getByLabelText('未選択')).toBeChecked();
    expect(screen.getByLabelText('不通')).not.toBeChecked();
    expect(screen.getByLabelText('通電OK')).not.toBeChecked();
  });

  it('不通を選択して保存できる', async () => {
    const seller = {
      seller_number: 'AA13487',
      unreachable_status: null,
    };

    render(<CallModePage seller={seller} />);

    fireEvent.click(screen.getByLabelText('不通'));
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('保存しました')).toBeInTheDocument();
    });
  });
});
```

---

## セキュリティ

### 1. XSS対策

```typescript
// Reactが自動的にエスケープ
<FormControlLabel 
  value="不通" 
  control={<Radio />} 
  label="不通" 
/>
```

### 2. SQLインジェクション対策

```typescript
// パラメータ化クエリを使用
await db.query(
  'UPDATE sellers SET unreachable_status = $1 WHERE seller_number = $2',
  [unreachableStatus, sellerNumber]
);
```

---

## デプロイ

### マイグレーション手順

1. **データベースマイグレーション**
   ```bash
   # マイグレーションファイルを作成
   npm run migration:create add_unreachable_status_column
   
   # マイグレーションを実行
   npm run migration:run
   ```

2. **フロントエンドのデプロイ**
   ```bash
   cd frontend
   npm run build
   npm run deploy
   ```

3. **バックエンドのデプロイ**
   ```bash
   cd backend
   npm run build
   npm run deploy
   ```

---

## 保守性

### 1. 新しい選択肢の追加

将来的に「不通」「通電OK」以外の選択肢を追加する場合：

```typescript
// 定数として管理
const UNREACHABLE_STATUS_OPTIONS = [
  { value: '', label: '未選択' },
  { value: '不通', label: '不通' },
  { value: '通電OK', label: '通電OK' },
  // 新しい選択肢を追加
  { value: '留守電', label: '留守電' },
];

// UIで使用
{UNREACHABLE_STATUS_OPTIONS.map((option) => (
  <FormControlLabel 
    key={option.value}
    value={option.value} 
    control={<Radio />} 
    label={option.label} 
  />
))}
```

### 2. ステータス計算ロジックの変更

```typescript
// 条件を定数として管理
const INQUIRY_DATE_CUTOFF = new Date(2026, 0, 1);

// 関数内で使用
if (inquiryDate < INQUIRY_DATE_CUTOFF) {
  return false;
}
```

---

## 今後の拡張

### 1. 不通理由の記録

```typescript
// 将来的に実装可能
interface Seller {
  unreachable_status: string | null;
  unreachable_reason: string | null; // 不通理由
  unreachable_date: string | null;   // 不通日時
}
```

### 2. 不通履歴の管理

```typescript
// 将来的に実装可能
interface UnreachableHistory {
  seller_number: string;
  status: string;
  reason: string;
  created_at: Date;
}
```

---

**作成日**: 2026年1月28日  
**最終更新日**: 2026年1月28日  
**ステータス**: ✅ 設計完了
