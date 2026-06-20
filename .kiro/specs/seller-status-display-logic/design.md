# 売主リスト ステータス表示ロジック - 設計書

## 概要

売主リストにおいて、複数の条件に基づいてステータスを動的に計算・表示する機能を実装します。

---

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────┐
│                    フロントエンド                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PropertyListingsPage.tsx                         │  │
│  │  - 売主リストの表示                                 │  │
│  │  - ステータスカラムの表示                            │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  useSellerStatus.ts (カスタムフック)                │  │
│  │  - ステータス計算ロジック                            │  │
│  │  - 日付比較ロジック                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  sellerStatusUtils.ts (ユーティリティ)              │  │
│  │  - 日付パース                                       │  │
│  │  - 訪問日前日判定                                   │  │
│  │  - 休業日考慮                                       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    バックエンド                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Google Sheets API                                │  │
│  │  - スプレッドシートからデータ取得                     │  │
│  │  - 既存のSyncService利用                           │  │
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
  status: string | null;                   // 状況（当社） (AH列) ※DBフィールド名
  visit_date: string | null;               // 訪問日 Y/M/D (AB列)
  phone_person: string | null;             // 電話担当（任意） (CQ列)
  pinrich: string | null;                  // Pinrich (BF列)
  not_reachable: string | null;            // 不通 (J列)
  is_unreachable: boolean | null;          // 不通フラグ（boolean型）
  inquiry_date: string | null;             // 反響日付

  // 計算されたステータス（フロントエンドで追加）
  displayStatus?: string[];                // 表示用ステータスの配列
}
```

---

## ステータス計算ロジック

### 1. ステータス判定関数

```typescript
// frontend/src/utils/sellerStatusUtils.ts

/**
 * 売主のステータスを計算する
 * @param seller 売主データ
 * @returns ステータスの配列
 */
export function calculateSellerStatus(seller: Seller): string[] {
  const statuses: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 時刻をリセット

  // 1. 不通チェック（最優先）
  if (seller.not_reachable && seller.not_reachable.trim() !== '') {
    statuses.push('不通');
  }

  // 2. 訪問日前日チェック
  if (isVisitDayBefore(seller.visit_date, today)) {
    statuses.push('訪問日前日');
  }

  // 3. 当日TEL（担当名）チェック
  if (seller.phone_person && seller.phone_person.trim() !== '') {
    const nextCallDate = parseDate(seller.next_call_date);
    if (nextCallDate && nextCallDate <= today) {
      statuses.push(`当日TEL（${seller.phone_person}）`);
    }
  }

  // 4. 当日TEL（未着手）チェック
  if (isCallTodayUnstarted(seller, today)) {
    statuses.push('当日TEL（未着手）');
  }

  // 5. Pinrich空欄チェック
  if (!seller.pinrich || seller.pinrich.trim() === '') {
    statuses.push('Pinrich空欄');
  }

  return statuses;
}
```

### 2. 日付パース関数

```typescript
/**
 * 日付文字列をDateオブジェクトに変換
 * @param dateStr 日付文字列 (例: "2026/1/27" または "2026-01-27")
 * @returns Dateオブジェクト、または null
 */
export function parseDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  try {
    // "2026/1/27" 形式または "2026-01-27" 形式をパース
    const parts = dateStr.includes('/') 
      ? dateStr.split('/') 
      : dateStr.split('-');
    
    if (parts.length !== 3) {
      return null;
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 月は0始まり
    const day = parseInt(parts[2], 10);

    // 数値が有効かチェック
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    // 有効な日付かチェック
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    console.error('日付のパースに失敗:', dateStr, error);
    return null;
  }
}
```

### 3. 訪問日前日判定関数

```typescript
/**
 * 訪問日前日かどうかを判定
 * 水曜日は休みのため、木曜日訪問の場合は火曜日（前々日）に表示
 * @param visitDateStr 訪問日文字列
 * @param today 今日の日付
 * @returns 訪問日前日かどうか
 */
export function isVisitDayBefore(
  visitDateStr: string | null,
  today: Date
): boolean {
  const visitDate = parseDate(visitDateStr);
  if (!visitDate) {
    return false;
  }

  // 訪問日の曜日を取得（0=日曜, 1=月曜, ..., 6=土曜）
  const visitDayOfWeek = visitDate.getDay();

  // 訪問日が木曜日（4）の場合、前々日（火曜日）に表示
  if (visitDayOfWeek === 4) {
    const twoDaysBefore = new Date(visitDate);
    twoDaysBefore.setDate(visitDate.getDate() - 2);
    twoDaysBefore.setHours(0, 0, 0, 0);
    return today.getTime() === twoDaysBefore.getTime();
  }

  // それ以外の場合、前日に表示
  const oneDayBefore = new Date(visitDate);
  oneDayBefore.setDate(visitDate.getDate() - 1);
  oneDayBefore.setHours(0, 0, 0, 0);
  return today.getTime() === oneDayBefore.getTime();
}
```

### 4. 当日TEL（未着手）判定関数

```typescript
/**
 * 当日TEL（未着手）かどうかを判定
 * 条件:
 * - 次電日が今日を含めて過去
 * - 状況（当社）に「追客中」を含む
 * - 不通カラムが空欄（is_unreachableがfalse）
 * - 電話担当（任意）が空欄
 * - 反響日付が2026年1月1日以降
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
  // ※フィールド名は status（DBの実際のカラム名）
  if (
    !seller.status ||
    !seller.status.includes('追客中')
  ) {
    return false;
  }

  // 不通カラムが空欄かチェック（is_unreachableがfalse）
  const isUnreachable = seller.is_unreachable === true || 
    (seller.not_reachable && seller.not_reachable.trim() !== '' && seller.not_reachable !== '通電OK');
  
  if (isUnreachable) {
    return false;
  }

  // 電話担当（任意）が空欄かチェック
  if (seller.phone_person && seller.phone_person.trim() !== '') {
    return false;
  }

  // 反響日付が2026年1月1日以降かチェック
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

## カスタムフック

### useSellerStatus

```typescript
// frontend/src/hooks/useSellerStatus.ts

import { useMemo } from 'react';
import { calculateSellerStatus } from '../utils/sellerStatusUtils';
import type { Seller } from '../types/seller';

/**
 * 売主のステータスを計算するカスタムフック
 * @param seller 売主データ
 * @returns ステータスの配列
 */
export function useSellerStatus(seller: Seller): string[] {
  return useMemo(() => {
    return calculateSellerStatus(seller);
  }, [
    seller.next_call_date,
    seller.status,                    // ※situation_companyではなくstatus
    seller.visit_date,
    seller.phone_person,
    seller.pinrich,
    seller.not_reachable,
    seller.is_unreachable,
    seller.inquiry_date,              // 反響日付を追加
  ]);
}
```

---

## UI実装

### ステータスカラムの表示

```typescript
// frontend/src/pages/PropertyListingsPage.tsx

import { useSellerStatus } from '../hooks/useSellerStatus';

function SellerListTable({ sellers }: { sellers: Seller[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>売主番号</th>
          <th>名前</th>
          {/* ... その他のカラム ... */}
          <th>ステータス</th>
        </tr>
      </thead>
      <tbody>
        {sellers.map((seller) => (
          <SellerRow key={seller.seller_number} seller={seller} />
        ))}
      </tbody>
    </table>
  );
}

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

function StatusBadges({ statuses }: { statuses: string[] }) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {statuses.map((status, index) => (
        <span
          key={index}
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: getStatusColor(status),
            color: 'white',
          }}
        >
          {status}
        </span>
      ))}
    </div>
  );
}

function getStatusColor(status: string): string {
  if (status === '不通') return '#f44336'; // 赤
  if (status === '訪問日前日') return '#ff9800'; // オレンジ
  if (status.startsWith('当日TEL')) return '#2196f3'; // 青
  if (status === 'Pinrich空欄') return '#9e9e9e'; // グレー
  return '#757575'; // デフォルト
}
```

---

## データフロー

### 1. データ取得

```typescript
// 既存のSyncServiceを利用
// backend/src/services/SellerSyncService.ts

// スプレッドシートから売主データを取得
const sellers = await sellerSyncService.getSellers();

// 必要なカラムがマッピングされていることを確認
// - 次電日 (D列)
// - 状況（当社） (AH列)
// - 訪問日 Y/M/D (AB列)
// - 電話担当（任意） (CQ列)
// - Pinrich (BF列)
// - 不通 (J列)
```

### 2. フロントエンドでの処理

```typescript
// frontend/src/pages/PropertyListingsPage.tsx

// 1. 売主データを取得
const { data: sellers, isLoading } = useQuery('sellers', fetchSellers);

// 2. 各売主のステータスを計算（useSellerStatusフック内で実行）
// 3. テーブルに表示
```

---

## パフォーマンス最適化

### 1. メモ化

```typescript
// useSellerStatusフック内でuseMemoを使用
// 依存配列に必要なフィールドのみを含める
return useMemo(() => {
  return calculateSellerStatus(seller);
}, [
  seller.next_call_date,
  seller.status,                    // ※situation_companyではなくstatus
  seller.visit_date,
  seller.phone_person,
  seller.pinrich,
  seller.not_reachable,
  seller.is_unreachable,
  seller.inquiry_date,              // 反響日付を追加
]);
```

### 2. 日付計算の最適化

```typescript
// 今日の日付は1回だけ計算
const today = new Date();
today.setHours(0, 0, 0, 0);

// 各売主のステータス計算時に再利用
```

---

## エラーハンドリング

### 1. 日付パースエラー

```typescript
try {
  const date = parseDate(dateStr);
  if (!date) {
    console.warn('無効な日付形式:', dateStr);
    return null;
  }
} catch (error) {
  console.error('日付のパースに失敗:', dateStr, error);
  return null;
}
```

### 2. 空データの処理

```typescript
// null、undefined、空文字列を適切に処理
if (!seller.next_call_date || seller.next_call_date.trim() === '') {
  return false;
}
```

---

## テスト戦略

### 1. ユニットテスト

```typescript
// frontend/src/utils/sellerStatusUtils.test.ts

describe('calculateSellerStatus', () => {
  it('不通カラムに値がある場合、「不通」を返す', () => {
    const seller = {
      not_reachable: '不通',
      // ... その他のフィールド
    };
    const statuses = calculateSellerStatus(seller);
    expect(statuses).toContain('不通');
  });

  it('訪問日が翌日の場合、「訪問日前日」を返す', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const visitDateStr = `${tomorrow.getFullYear()}/${tomorrow.getMonth() + 1}/${tomorrow.getDate()}`;

    const seller = {
      visit_date: visitDateStr,
      // ... その他のフィールド
    };
    const statuses = calculateSellerStatus(seller);
    expect(statuses).toContain('訪問日前日');
  });

  // ... その他のテストケース
});
```

### 2. 統合テスト

```typescript
// frontend/src/pages/PropertyListingsPage.test.tsx

describe('PropertyListingsPage', () => {
  it('ステータスが正しく表示される', async () => {
    const sellers = [
      {
        seller_number: 'AA13487',
        name: '赤田直之',
        not_reachable: '不通',
        // ... その他のフィールド
      },
    ];

    render(<PropertyListingsPage sellers={sellers} />);

    expect(screen.getByText('不通')).toBeInTheDocument();
  });
});
```

---

## デプロイ

### ローカル環境のみ

- 本番環境へのデプロイは不要
- ローカル開発環境で動作確認

---

## 保守性

### 1. ステータス条件の追加

新しいステータス条件を追加する場合：

1. `calculateSellerStatus`関数に新しい条件を追加
2. 必要に応じて新しいヘルパー関数を作成
3. ユニットテストを追加

### 2. ステータスの表示順序変更

`calculateSellerStatus`関数内の条件チェックの順序を変更するだけ

---

## セキュリティ

### 1. XSS対策

```typescript
// ステータス文字列はReactが自動的にエスケープ
<span>{status}</span>
```

### 2. データ検証

```typescript
// 日付フォーマットの検証
if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
  return null;
}
```

---

## 今後の拡張

### 1. ステータスに基づくフィルタリング

```typescript
// 将来的に実装可能
const [statusFilter, setStatusFilter] = useState<string[]>([]);

const filteredSellers = sellers.filter((seller) => {
  const statuses = calculateSellerStatus(seller);
  return statusFilter.length === 0 || 
         statusFilter.some((filter) => statuses.includes(filter));
});
```

### 2. ステータスに基づくソート

```typescript
// 将来的に実装可能
const sortedSellers = sellers.sort((a, b) => {
  const statusesA = calculateSellerStatus(a);
  const statusesB = calculateSellerStatus(b);
  // ステータスの優先順位に基づいてソート
});
```

---

**作成日**: 2026年1月27日  
**最終更新日**: 2026年1月27日  
**ステータス**: ✅ 設計完了（実装に合わせて更新済み）
