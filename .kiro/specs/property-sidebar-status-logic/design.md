# 物件リスト：サイドバーカテゴリー ステータス判定仕様 - 設計書

## 1. 概要

物件リストのサイドバーに表示されるカテゴリーステータスを、スプレッドシートの複数のカラムから判定して表示する機能の設計書です。

## 2. アーキテクチャ

### 2.1 システム構成

```
┌─────────────────────────────────────────────────────────────┐
│ Google Sheets                                               │
├─────────────────────────────────────────────────────────────┤
│ 1. 物件リストスプレッドシート（メインソース）              │
│    - 物件番号、atbb成約済み/非公開、報告日、確認、等       │
│ 2. 業務依頼シート（補助情報）                              │
│    - 物件番号、公開予定日                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    15分ごとに同期
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PropertyListingSyncService                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. 物件リストスプレッドシートを読み取り                    │
│ 2. 業務依頼シートを1回だけ読み取り                         │
│ 3. 各物件のステータスを計算（calculateSidebarStatus）      │
│ 4. property_listingsテーブルに保存                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    DBに保存
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Supabase (property_listings)                                │
├─────────────────────────────────────────────────────────────┤
│ - property_number                                           │
│ - atbb_status                                               │
│ - sidebar_status ← 新規追加                                │
│ - その他のフィールド                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    APIで取得
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ フロントエンド（物件リスト画面）                            │
├─────────────────────────────────────────────────────────────┤
│ サイドバー：                                                │
│ ┌─────────────────────┐                                     │
│ │ 物件ステータス      │                                     │
│ ├─────────────────────┤                                     │
│ │ 未報告 (山本) [5]   │ ← sidebar_statusでグループ化       │
│ │ 未完了 [3]          │                                     │
│ │ 本日公開予定 [2]    │                                     │
│ │ ...                 │                                     │
│ └─────────────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 データフロー

1. **同期開始**（15分ごと）
2. **物件リストスプレッドシート読み取り**（1回）
3. **業務依頼シート読み取り**（1回）
4. **各物件の処理**（ループ）:
   - ステータス計算（`calculateSidebarStatus()`）
   - DB保存（upsert）
5. **同期完了**

## 3. データベース設計

### 3.1 スキーマ変更

**テーブル**: `property_listings`

**新規カラム**:
```sql
ALTER TABLE property_listings
ADD COLUMN sidebar_status TEXT;
```

**説明**:
- `sidebar_status`: 計算されたサイドバーステータス（例: "未報告 山本", "未完了", "Y専任公開中"）
- NULL許可（該当なしの場合は空文字またはNULL）

### 3.2 インデックス

```sql
-- サイドバーでのグループ化を高速化
CREATE INDEX idx_property_listings_sidebar_status 
ON property_listings(sidebar_status);
```

## 4. バックエンド設計

### 4.1 PropertyListingSyncService の拡張

**ファイル**: `backend/api/src/services/PropertyListingSyncService.ts`


#### 4.1.1 runFullSync() メソッドの変更

```typescript
async runFullSync(triggeredBy: 'scheduled' | 'manual' = 'scheduled'): Promise<PropertyListingSyncResult> {
  // ... 既存の初期化処理
  
  // 1. 物件リストスプレッドシートを読み取り（既存）
  const rows = await this.propertyListSheetsClient.readAll();
  
  // 2. 業務依頼シートを1回だけ読み取り（新規）
  const gyomuListData = await this.gyomuListSheetsClient.readAll();
  
  // 3. 各物件を処理
  for (const row of rows) {
    // ... 既存の処理
    
    // 4. サイドバーステータスを計算（新規）
    const sidebarStatus = this.calculateSidebarStatus(row, gyomuListData);
    
    // 5. propertyDataに追加
    const propertyData = {
      // ... 既存のフィールド
      sidebar_status: sidebarStatus,  // ← 新規追加
      updated_at: new Date().toISOString(),
    };
    
    // 6. DB保存（既存）
    await this.supabase.from('property_listings').upsert(propertyData);
  }
}
```

#### 4.1.2 calculateSidebarStatus() メソッド（新規）

```typescript
/**
 * サイドバーステータスを計算
 * @param row 物件リストスプレッドシートの1行
 * @param gyomuListData 業務依頼シートの全データ
 * @returns ステータス文字列（例: "未報告 山本", "未完了", ""）
 */
private calculateSidebarStatus(row: any, gyomuListData: any[]): string {
  const propertyNumber = String(row['物件番号'] || '');
  const atbbStatus = String(row['atbb成約済み/非公開'] || '');
  
  // ① 未報告（最優先）
  const reportDate = row['報告日'];
  if (reportDate && this.isDateBeforeOrToday(reportDate)) {
    const assignee = row['報告担当_override'] || row['報告担当'] || '';
    return assignee ? `未報告 ${assignee}` : '未報告';
  }
  
  // ② 未完了
  if (row['確認'] === '未') {
    return '未完了';
  }
  
  // ③ 非公開予定（確認後）
  if (row['一般媒介非公開（仮）'] === '非公開予定') {
    return '非公開予定（確認後）';
  }
  
  // ④ 一般媒介の掲載確認未
  if (row['１社掲載'] === '未確認') {
    return '一般媒介の掲載確認未';
  }
  
  // ⑤ 本日公開予定
  if (atbbStatus.includes('公開前')) {
    const scheduledDate = this.lookupGyomuList(propertyNumber, gyomuListData, '公開予定日');
    if (scheduledDate && this.isDateBeforeOrToday(scheduledDate)) {
      return '本日公開予定';
    }
  }
  
  // ⑥ SUUMO / レインズ登録必要
  if (atbbStatus === '一般・公開中' || atbbStatus === '専任・公開中') {
    const scheduledDate = this.lookupGyomuList(propertyNumber, gyomuListData, '公開予定日');
    const suumoUrl = row['Suumo URL'];
    const suumoRegistration = row['Suumo登録'];
    
    if (scheduledDate && 
        this.isDateBeforeYesterday(scheduledDate) && 
        !suumoUrl && 
        suumoRegistration !== 'S不要') {
      return atbbStatus === '一般・公開中' 
        ? 'SUUMO URL　要登録' 
        : 'レインズ登録＋SUUMO登録';
    }
  }
  
  // ⑦ 買付申込み（内覧なし）２
  const kaitsukeStatus = row['買付'];
  if (
    (kaitsukeStatus === '専任片手' && atbbStatus === '専任・公開中') ||
    (kaitsukeStatus === '一般他決' && atbbStatus === '一般・公開中') ||
    (kaitsukeStatus === '専任両手' && atbbStatus === '専任・公開中') ||
    (kaitsukeStatus === '一般両手' && atbbStatus === '一般・公開中') ||
    (kaitsukeStatus === '一般片手' && atbbStatus === '一般・公開中')
  ) {
    return '買付申込み（内覧なし）２';
  }
  
  // ⑧ 公開前情報
  if (atbbStatus === '一般・公開前' || atbbStatus === '専任・公開前') {
    return '公開前情報';
  }
  
  // ⑨ 非公開（配信メールのみ）
  if (atbbStatus === '非公開（配信メールのみ）') {
    return '非公開（配信メールのみ）';
  }
  
  // ⑩ 一般公開中物件
  if (atbbStatus === '一般・公開中') {
    return '一般公開中物件';
  }
  
  // ⑪ 専任・公開中（担当別）
  if (atbbStatus === '専任・公開中') {
    const assignee = row['担当名（営業）'];
    return this.getAssigneeStatus(assignee);
  }
  
  // ⑫ それ以外
  return '';
}
```

#### 4.1.3 ヘルパーメソッド（新規）

```typescript
/**
 * 業務依頼シートからデータを検索（LOOKUP相当）
 */
private lookupGyomuList(
  propertyNumber: string, 
  gyomuListData: any[], 
  columnName: string
): any {
  const row = gyomuListData.find(r => r['物件番号'] === propertyNumber);
  return row ? row[columnName] : null;
}

/**
 * 日付が今日以前かチェック
 */
private isDateBeforeOrToday(dateValue: any): boolean {
  if (!dateValue) return false;
  const date = this.parseDate(dateValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
}

/**
 * 日付が昨日以前かチェック
 */
private isDateBeforeYesterday(dateValue: any): boolean {
  if (!dateValue) return false;
  const date = this.parseDate(dateValue);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return date <= yesterday;
}

/**
 * 日付をパース（シリアル値対応）
 */
private parseDate(dateValue: any): Date {
  // シリアル値の場合（数値）
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + dateValue * 86400000);
  }
  
  // 文字列の場合
  return new Date(dateValue);
}

/**
 * 担当者名から専任公開中ステータスを取得
 */
private getAssigneeStatus(assignee: string): string {
  const mapping = this.loadStaffMapping();
  return mapping[assignee] || '専任・公開中';
}

/**
 * 担当者マッピングを読み込み
 */
private loadStaffMapping(): Record<string, string> {
  // TODO: 設定ファイルから読み込み（オプション）
  // 現在はハードコード
  return {
    '山本': 'Y専任公開中',
    '生野': '生・専任公開中',
    '久': '久・専任公開中',
    '裏': 'U専任公開中',
    '林': '林・専任公開中',
    '国広': 'K専任公開中',
    '木村': 'R専任公開中',
    '角井': 'I専任公開中',
  };
}
```

### 4.2 設定ファイル（オプション）

**ファイル**: `backend/api/config/staff-mapping.json`

```json
{
  "山本": "Y専任公開中",
  "生野": "生・専任公開中",
  "久": "久・専任公開中",
  "裏": "U専任公開中",
  "林": "林・専任公開中",
  "国広": "K専任公開中",
  "木村": "R専任公開中",
  "角井": "I専任公開中"
}
```

**読み込み方法**:
```typescript
import staffMapping from '../config/staff-mapping.json';

private loadStaffMapping(): Record<string, string> {
  return staffMapping;
}
```

## 5. フロントエンド設計

### 5.1 サイドバーコンポーネント

**新規ファイル**: `frontend/src/components/PropertySidebarStatus.tsx`


```typescript
import React, { useMemo } from 'react';

interface PropertySidebarStatusProps {
  properties: any[];
  selectedStatus: string | null;
  onStatusSelect: (status: string | null) => void;
}

export const PropertySidebarStatus: React.FC<PropertySidebarStatusProps> = ({
  properties,
  selectedStatus,
  onStatusSelect,
}) => {
  // ステータスごとにグループ化
  const statusGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    
    properties.forEach(property => {
      const status = property.sidebar_status || 'その他';
      groups[status] = (groups[status] || 0) + 1;
    });
    
    return groups;
  }, [properties]);
  
  // ステータスを優先順位順にソート
  const sortedStatuses = useMemo(() => {
    const statusOrder = [
      '未報告',
      '未完了',
      '非公開予定（確認後）',
      '一般媒介の掲載確認未',
      '本日公開予定',
      'SUUMO URL　要登録',
      'レインズ登録＋SUUMO登録',
      '買付申込み（内覧なし）２',
      '公開前情報',
      '非公開（配信メールのみ）',
      '一般公開中物件',
      'Y専任公開中',
      '生・専任公開中',
      '久・専任公開中',
      'U専任公開中',
      '林・専任公開中',
      'K専任公開中',
      'R専任公開中',
      'I専任公開中',
      'その他',
    ];
    
    return Object.keys(statusGroups).sort((a, b) => {
      // 未報告系は担当者名でソート
      if (a.startsWith('未報告') && b.startsWith('未報告')) {
        return a.localeCompare(b);
      }
      
      // 優先順位順
      const indexA = statusOrder.findIndex(s => a.startsWith(s));
      const indexB = statusOrder.findIndex(s => b.startsWith(s));
      
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
  }, [statusGroups]);
  
  return (
    <div className="property-sidebar-status">
      <h3>物件ステータス</h3>
      <ul className="status-list">
        {/* 全て表示 */}
        <li
          className={selectedStatus === null ? 'active' : ''}
          onClick={() => onStatusSelect(null)}
        >
          全て [{properties.length}]
        </li>
        
        {/* 各ステータス */}
        {sortedStatuses.map(status => (
          <li
            key={status}
            className={selectedStatus === status ? 'active' : ''}
            onClick={() => onStatusSelect(status)}
          >
            {status} [{statusGroups[status]}]
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### 5.2 物件リスト画面の変更

**ファイル**: `frontend/src/pages/PropertyListPage.tsx`（または該当ファイル）

```typescript
import React, { useState, useMemo } from 'react';
import { PropertySidebarStatus } from '../components/PropertySidebarStatus';

export const PropertyListPage: React.FC = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // ステータスでフィルタリング
  const filteredProperties = useMemo(() => {
    if (!selectedStatus) return properties;
    
    return properties.filter(property => {
      const status = property.sidebar_status || 'その他';
      return status === selectedStatus;
    });
  }, [properties, selectedStatus]);
  
  return (
    <div className="property-list-page">
      {/* サイドバー */}
      <aside className="sidebar">
        <PropertySidebarStatus
          properties={properties}
          selectedStatus={selectedStatus}
          onStatusSelect={setSelectedStatus}
        />
      </aside>
      
      {/* メインコンテンツ */}
      <main className="main-content">
        <h1>物件リスト</h1>
        {/* 物件一覧テーブル */}
        <PropertyTable properties={filteredProperties} />
      </main>
    </div>
  );
};
```

### 5.3 スタイリング

**ファイル**: `frontend/src/components/PropertySidebarStatus.css`

```css
.property-sidebar-status {
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.property-sidebar-status h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.status-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.status-list li {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.25rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.status-list li:hover {
  background-color: #e0e0e0;
}

.status-list li.active {
  background-color: #1976d2;
  color: white;
  font-weight: 600;
}

/* 未報告は赤色 */
.status-list li:has-text("未報告") {
  color: #d32f2f;
}

/* 未完了はオレンジ色 */
.status-list li:has-text("未完了") {
  color: #f57c00;
}
```

## 6. API設計

### 6.1 既存APIの変更

**エンドポイント**: `GET /api/properties`

**変更内容**: `sidebar_status`カラムを含めて返す

```typescript
// backend/src/routes/properties.ts

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')  // sidebar_statusも含まれる
    .order('updated_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
});
```

**レスポンス例**:
```json
[
  {
    "id": "uuid",
    "property_number": "AA13501",
    "address": "大分市中央町1-1-1",
    "atbb_status": "専任・公開中",
    "sidebar_status": "Y専任公開中",
    "updated_at": "2026-02-12T10:00:00Z"
  }
]
```

## 7. テスト設計

### 7.1 単体テスト

**ファイル**: `backend/api/src/services/PropertyListingSyncService.test.ts`

```typescript
import { PropertyListingSyncService } from './PropertyListingSyncService';

describe('PropertyListingSyncService', () => {
  let service: PropertyListingSyncService;
  
  beforeEach(() => {
    service = new PropertyListingSyncService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  });
  
  describe('calculateSidebarStatus', () => {
    const gyomuListData = [
      { '物件番号': 'AA13501', '公開予定日': '2026-02-10' },
    ];
    
    test('① 未報告（最優先）', () => {
      const row = {
        '物件番号': 'AA13501',
        '報告日': '2026-02-11',
        '報告担当': '山本',
      };
      
      const result = service['calculateSidebarStatus'](row, gyomuListData);
      expect(result).toBe('未報告 山本');
    });
    
    test('② 未完了', () => {
      const row = {
        '物件番号': 'AA13501',
        '確認': '未',
      };
      
      const result = service['calculateSidebarStatus'](row, gyomuListData);
      expect(result).toBe('未完了');
    });
    
    test('⑪ 専任・公開中（担当別）', () => {
      const row = {
        '物件番号': 'AA13501',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '山本',
      };
      
      const result = service['calculateSidebarStatus'](row, gyomuListData);
      expect(result).toBe('Y専任公開中');
    });
    
    test('⑫ それ以外', () => {
      const row = {
        '物件番号': 'AA13501',
        'atbb成約済み/非公開': '成約済み',
      };
      
      const result = service['calculateSidebarStatus'](row, gyomuListData);
      expect(result).toBe('');
    });
  });
});
```

### 7.2 統合テスト

**ファイル**: `backend/api/test/property-sidebar-status.integration.test.ts`

```typescript
describe('Property Sidebar Status Integration', () => {
  test('同期後にsidebar_statusが保存される', async () => {
    // 1. 同期を実行
    const service = getPropertyListingSyncService();
    await service.initialize();
    const result = await service.runFullSync('manual');
    
    expect(result.success).toBe(true);
    
    // 2. DBから取得
    const { data } = await supabase
      .from('property_listings')
      .select('property_number, sidebar_status')
      .limit(10);
    
    // 3. sidebar_statusが設定されていることを確認
    expect(data).toBeDefined();
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0].sidebar_status).toBeDefined();
  });
});
```

### 7.3 フロントエンドテスト

**ファイル**: `frontend/src/components/PropertySidebarStatus.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertySidebarStatus } from './PropertySidebarStatus';

describe('PropertySidebarStatus', () => {
  const mockProperties = [
    { id: 1, sidebar_status: '未報告 山本' },
    { id: 2, sidebar_status: '未報告 山本' },
    { id: 3, sidebar_status: '未完了' },
    { id: 4, sidebar_status: 'Y専任公開中' },
  ];
  
  test('ステータスごとにグループ化される', () => {
    const onStatusSelect = jest.fn();
    
    render(
      <PropertySidebarStatus
        properties={mockProperties}
        selectedStatus={null}
        onStatusSelect={onStatusSelect}
      />
    );
    
    expect(screen.getByText('未報告 山本 [2]')).toBeInTheDocument();
    expect(screen.getByText('未完了 [1]')).toBeInTheDocument();
    expect(screen.getByText('Y専任公開中 [1]')).toBeInTheDocument();
  });
  
  test('ステータスをクリックするとフィルタリングされる', () => {
    const onStatusSelect = jest.fn();
    
    render(
      <PropertySidebarStatus
        properties={mockProperties}
        selectedStatus={null}
        onStatusSelect={onStatusSelect}
      />
    );
    
    fireEvent.click(screen.getByText('未報告 山本 [2]'));
    expect(onStatusSelect).toHaveBeenCalledWith('未報告 山本');
  });
});
```

## 8. デプロイ手順

### 8.1 データベースマイグレーション

```sql
-- 1. sidebar_statusカラムを追加
ALTER TABLE property_listings
ADD COLUMN sidebar_status TEXT;

-- 2. インデックスを作成
CREATE INDEX idx_property_listings_sidebar_status 
ON property_listings(sidebar_status);
```

### 8.2 バックエンドデプロイ

```bash
# 1. コードをコミット
git add backend/api/src/services/PropertyListingSyncService.ts
git commit -m "feat: Add sidebar status calculation to property sync"

# 2. プッシュ
git push origin main

# 3. Vercelに自動デプロイ
```

### 8.3 フロントエンドデプロイ

```bash
# 1. コードをコミット
git add frontend/src/components/PropertySidebarStatus.tsx
git add frontend/src/pages/PropertyListPage.tsx
git commit -m "feat: Add property sidebar status filter"

# 2. プッシュ
git push origin main

# 3. Vercelに自動デプロイ
```

### 8.4 動作確認

1. **同期の確認**:
   - Vercel Dashboardで次回の同期ログを確認
   - `sidebar_status`が計算されていることを確認

2. **DBの確認**:
   ```sql
   SELECT property_number, sidebar_status 
   FROM property_listings 
   LIMIT 10;
   ```

3. **フロントエンドの確認**:
   - 物件リスト画面を開く
   - サイドバーにステータスカテゴリーが表示されることを確認
   - カテゴリーをクリックしてフィルタリングが動作することを確認

## 9. パフォーマンス最適化

### 9.1 同期処理の最適化

**現在の処理時間**（100件）:
- 物件リストスプレッドシート読み取り: 1-2秒
- 業務依頼シート読み取り: 1-2秒（1回のみ）
- ステータス計算: 0.001秒 × 100件 = 0.1秒
- DB保存: 0.1秒 × 100件 = 10秒
- **合計: 約12-14秒**

**最適化案**:
1. バッチ保存: 1件ずつではなく、10件ずつまとめて保存
2. 並列処理: 複数の物件を並列で処理（注意: APIクォータ）

### 9.2 フロントエンドの最適化

1. **メモ化**: `useMemo`でステータスグループを計算
2. **仮想スクロール**: 物件数が多い場合は仮想スクロールを使用
3. **遅延ロード**: 初回は最初の50件のみ表示

## 10. 保守性

### 10.1 判定ロジックの変更

**手順**:
1. `calculateSidebarStatus()`メソッドを修正
2. 単体テストを更新
3. デプロイ

**例**: 新しいステータスを追加
```typescript
// ⑬ 新しいステータス（追加）
if (row['新しいフィールド'] === '新しい値') {
  return '新しいステータス';
}
```

### 10.2 担当者マッピングの変更

**方法1**: ハードコードを変更
```typescript
private loadStaffMapping(): Record<string, string> {
  return {
    '山本': 'Y専任公開中',
    '新担当': '新・専任公開中',  // ← 追加
  };
}
```

**方法2**: 設定ファイルを変更（推奨）
```json
{
  "山本": "Y専任公開中",
  "新担当": "新・専任公開中"
}
```

## 11. トラブルシューティング

### 11.1 sidebar_statusが空文字になる

**原因**: 判定ロジックのどの条件にも該当しない

**確認方法**:
```sql
SELECT property_number, atbb_status, sidebar_status
FROM property_listings
WHERE sidebar_status = '' OR sidebar_status IS NULL
LIMIT 10;
```

**対処法**: 該当物件のスプレッドシートデータを確認

### 11.2 同期が遅い

**原因**: 業務依頼シートの読み取りが遅い

**確認方法**: Vercel Dashboardのログを確認

**対処法**: 
1. 業務依頼シートのデータ量を確認
2. 不要な行を削除
3. バッチ処理を検討

### 11.3 フロントエンドでステータスが表示されない

**原因**: APIレスポンスに`sidebar_status`が含まれていない

**確認方法**:
```bash
curl https://your-api.vercel.app/api/properties | jq '.[0].sidebar_status'
```

**対処法**: バックエンドのSELECTクエリを確認

## 12. 正確性の保証（Correctness Properties）

### 12.1 Property 1: ステータスの一意性

**仕様**: 各物件は最大1つのステータスを持つ

**検証方法**:
```typescript
test('各物件は最大1つのステータスを持つ', () => {
  const row = { /* テストデータ */ };
  const status = service['calculateSidebarStatus'](row, gyomuListData);
  
  // 空文字または非空文字列
  expect(typeof status).toBe('string');
});
```

### 12.2 Property 2: 優先順位の保証

**仕様**: 複数の条件に該当する場合、優先順位の高い方が選ばれる

**検証方法**:
```typescript
test('未報告は未完了より優先される', () => {
  const row = {
    '報告日': '2026-02-11',
    '報告担当': '山本',
    '確認': '未',  // 未完了の条件も満たす
  };
  
  const status = service['calculateSidebarStatus'](row, gyomuListData);
  expect(status).toBe('未報告 山本');  // 未報告が優先
});
```

### 12.3 Property 3: 日付比較の正確性

**仕様**: 日付比較は正確に行われる（シリアル値対応）

**検証方法**:
```typescript
test('シリアル値の日付を正しく比較', () => {
  const row = {
    '報告日': 44952,  // 2026-02-11のシリアル値
    '報告担当': '山本',
  };
  
  const status = service['calculateSidebarStatus'](row, gyomuListData);
  expect(status).toContain('未報告');
});
```

---

**最終更新日**: 2026年2月12日  
**作成者**: Kiro AI  
**レビュー状態**: 初稿
