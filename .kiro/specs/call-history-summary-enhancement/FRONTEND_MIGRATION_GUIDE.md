# フロントエンド移行ガイド

## 概要

通話履歴サマリー機能の新しいAPIエンドポイントへの移行方法を説明します。既存のコードは引き続き動作しますが、新しいフォーマットを使用することで、より詳細で正確なサマリーを生成できます。

## 移行オプション

### オプション1: 既存コードをそのまま使用（推奨：最も簡単）

既存のコードは変更不要です。後方互換性が維持されています。

```typescript
// 既存のコード - そのまま動作します
const response = await fetch('/api/summarize/call-memos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    memos: ['3/2 12:00 訪問査定の日程調整', '2/28 15:30 物件情報のヒアリング']
  })
});

const { summary } = await response.json();
```

### オプション2: 新しいGETエンドポイントを使用（推奨：最も簡単で高機能）

売主IDだけで自動的にデータを取得してサマリーを生成します。

```typescript
// 新しいコード - 売主IDから自動取得
const response = await fetch(`/api/summarize/seller/${sellerId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { summary, metadata, seller } = await response.json();

// メタデータも利用可能
console.log(`通話回数: ${metadata.totalCalls}回`);
console.log(`最新のエントリー: ${metadata.newestEntry}`);
console.log(`生成されたセクション: ${metadata.sectionsGenerated.join(', ')}`);
```

### オプション3: 新しいPOSTフォーマットを使用（推奨：最も柔軟）

コミュニケーション履歴とスプレッドシートコメントを明示的に渡します。

```typescript
// 新しいコード - 構造化データを使用
const response = await fetch('/api/summarize/call-memos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    communicationHistory: activityLogs, // ActivityLog[]
    spreadsheetComments: comments,      // string[]
    sellerData: {                       // オプション
      name: seller.name,
      status: seller.status,
      confidence: seller.confidence
    }
  })
});

const { summary, metadata } = await response.json();
```

## 詳細な実装例

### React コンポーネントでの使用例

```typescript
import React, { useState, useEffect } from 'react';

interface SummaryMetadata {
  totalCalls: number;
  callsFromHistory: number;
  callsFromComments: number;
  sectionsGenerated: string[];
  oldestEntry?: string;
  newestEntry?: string;
}

interface SummaryResponse {
  summary: string;
  metadata: SummaryMetadata;
  seller?: {
    id: string;
    name: string;
    status: string;
  };
}

const CallHistorySummary: React.FC<{ sellerId: string }> = ({ sellerId }) => {
  const [summary, setSummary] = useState<string>('');
  const [metadata, setMetadata] = useState<SummaryMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/summarize/seller/${sellerId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('サマリーの取得に失敗しました');
        }

        const data: SummaryResponse = await response.json();
        setSummary(data.summary);
        setMetadata(data.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [sellerId]);

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div className="call-history-summary">
      <h3>通話履歴サマリー</h3>
      
      {metadata && (
        <div className="summary-metadata">
          <span className="badge">通話回数: {metadata.totalCalls}回</span>
          <span className="badge">
            セクション数: {metadata.sectionsGenerated.length}
          </span>
        </div>
      )}
      
      <div className="summary-content">
        {summary.split('\n').map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    </div>
  );
};

export default CallHistorySummary;
```

### カスタムフックでの使用例

```typescript
import { useState, useEffect } from 'react';

interface UseSummaryOptions {
  sellerId?: string;
  communicationHistory?: any[];
  spreadsheetComments?: string[];
  autoFetch?: boolean;
}

export const useSummary = (options: UseSummaryOptions) => {
  const [summary, setSummary] = useState<string>('');
  const [metadata, setMetadata] = useState<SummaryMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      let response: Response;

      if (options.sellerId) {
        // オプション2: GETエンドポイント
        response = await fetch(`/api/summarize/seller/${options.sellerId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        // オプション3: POSTエンドポイント
        response = await fetch('/api/summarize/call-memos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            communicationHistory: options.communicationHistory || [],
            spreadsheetComments: options.spreadsheetComments || []
          })
        });
      }

      if (!response.ok) {
        throw new Error('サマリーの取得に失敗しました');
      }

      const data = await response.json();
      setSummary(data.summary);
      setMetadata(data.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchSummary();
    }
  }, [options.sellerId, options.communicationHistory, options.spreadsheetComments]);

  return {
    summary,
    metadata,
    loading,
    error,
    refetch: fetchSummary
  };
};

// 使用例
const MyComponent = ({ sellerId }) => {
  const { summary, metadata, loading, error } = useSummary({ 
    sellerId,
    autoFetch: true 
  });

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div>
      <h3>通話回数: {metadata?.totalCalls}回</h3>
      <pre>{summary}</pre>
    </div>
  );
};
```

## レスポンスフォーマット

### 旧フォーマット（後方互換）
```json
{
  "summary": "【次のアクション】訪問査定の日程調整を行う\n【通話回数】3回\n..."
}
```

### 新フォーマット
```json
{
  "summary": "【次のアクション】訪問査定の日程調整を行う\n【通話回数】3回\n...",
  "metadata": {
    "totalCalls": 3,
    "callsFromHistory": 2,
    "callsFromComments": 1,
    "sectionsGenerated": ["次のアクション", "通話回数", "状況", "物件情報"],
    "oldestEntry": "2024-02-28T15:30:00.000Z",
    "newestEntry": "2024-03-02T12:00:00.000Z"
  },
  "seller": {
    "id": "seller-123",
    "name": "山田太郎",
    "status": "active"
  }
}
```

## エラーハンドリング

```typescript
try {
  const response = await fetch(`/api/summarize/seller/${sellerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    
    switch (errorData.error.code) {
      case 'VALIDATION_ERROR':
        console.error('バリデーションエラー:', errorData.error.message);
        break;
      case 'NOT_FOUND':
        console.error('売主が見つかりません');
        break;
      case 'SUMMARIZATION_ERROR':
        console.error('サマリー生成エラー:', errorData.error.message);
        if (errorData.error.retryable) {
          // リトライ可能
          setTimeout(() => fetchSummary(), 3000);
        }
        break;
      default:
        console.error('不明なエラー:', errorData.error);
    }
    return;
  }

  const data = await response.json();
  // 成功時の処理
} catch (error) {
  console.error('ネットワークエラー:', error);
}
```

## パフォーマンスの考慮事項

### キャッシング
APIは5分間のキャッシュを実装しています。同じデータで複数回リクエストしても、サーバー側で効率的に処理されます。

### ローディング状態
サマリー生成には最大2秒かかる場合があります。適切なローディングインジケーターを表示してください。

```typescript
{loading && (
  <div className="loading-spinner">
    <Spinner />
    <p>サマリーを生成中...</p>
  </div>
)}
```

### エラーリトライ
`retryable: true` のエラーは自動的にリトライすることを推奨します。

```typescript
const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      const errorData = await response.json();
      if (!errorData.error.retryable) {
        throw new Error(errorData.error.message);
      }
      
      // 指数バックオフ
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
};
```

## TypeScript型定義

```typescript
// types/summary.ts
export interface ActivityLog {
  id: string;
  employeeId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SummaryInput {
  communicationHistory?: ActivityLog[];
  spreadsheetComments?: string[];
  sellerData?: {
    name?: string;
    status?: string;
    confidence?: string;
    assignedTo?: string;
  };
}

export interface SummaryMetadata {
  totalCalls: number;
  callsFromHistory: number;
  callsFromComments: number;
  sectionsGenerated: string[];
  oldestEntry?: string;
  newestEntry?: string;
}

export interface SummaryOutput {
  summary: string;
  metadata: SummaryMetadata;
  seller?: {
    id: string;
    name: string;
    status: string;
  };
}

export interface SummaryError {
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SUMMARIZATION_ERROR';
    message: string;
    retryable: boolean;
  };
}
```

## テスト例

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import CallHistorySummary from './CallHistorySummary';

const server = setupServer(
  rest.get('/api/summarize/seller/:sellerId', (req, res, ctx) => {
    return res(
      ctx.json({
        summary: '【次のアクション】訪問査定の日程調整を行う\n【通話回数】3回',
        metadata: {
          totalCalls: 3,
          callsFromHistory: 2,
          callsFromComments: 1,
          sectionsGenerated: ['次のアクション', '通話回数']
        }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('サマリーを表示する', async () => {
  render(<CallHistorySummary sellerId="seller-123" />);
  
  await waitFor(() => {
    expect(screen.getByText(/訪問査定の日程調整/)).toBeInTheDocument();
    expect(screen.getByText(/通話回数: 3回/)).toBeInTheDocument();
  });
});
```

## まとめ

- **既存コードは変更不要** - 後方互換性が維持されています
- **新しいGETエンドポイント** - 最も簡単で推奨される方法
- **メタデータの活用** - 通話回数や生成されたセクションなどの追加情報
- **エラーハンドリング** - 適切なエラー処理とリトライロジック
- **TypeScript対応** - 型安全な実装

質問や問題がある場合は、バックエンドチームにお問い合わせください。
