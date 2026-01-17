# 重複案件インジケーター機能 - 開発者ガイド

## 概要

このドキュメントは、重複案件インジケーター機能の技術的な詳細と、開発者が機能を理解・拡張するために必要な情報を提供します。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              CallModePage.tsx                         │  │
│  │  - 重複検出ロジック                                   │  │
│  │  - 状態管理                                           │  │
│  │  - キャッシュ管理                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         UI Components                                 │  │
│  │  - DuplicateIndicatorBadge                            │  │
│  │  - DuplicateDetailsModal                              │  │
│  │  - DuplicateCard                                      │  │
│  │  - ActivityItem                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Express)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              API Routes                               │  │
│  │  GET /sellers/:id/duplicates                          │  │
│  │  GET /sellers/:id/activities                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Services                                      │  │
│  │  - DuplicateDetectionService                          │  │
│  │  - SellerService                                      │  │
│  │  - ActivityLogService                                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database (Supabase)                      │
│  - sellers                                                   │
│  - properties                                                │
│  - activity_logs                                             │
└─────────────────────────────────────────────────────────────┘
```

## バックエンド実装

### API エンドポイント

#### GET /sellers/:id/duplicates

売主の重複案件を取得します。

**リクエスト**:
```http
GET /api/sellers/:id/duplicates
Authorization: Bearer <token>
```

**レスポンス**:
```typescript
{
  duplicates: DuplicateMatch[]
}
```

**DuplicateMatch型**:
```typescript
interface DuplicateMatch {
  sellerId: string;
  matchType: 'phone' | 'email' | 'both';
  sellerInfo: {
    sellerNumber: string;
    name: string;
    inquiryDate: string;
    phoneNumber: string;
    email: string;
  };
  propertyInfo?: {
    address: string;
    propertyType: string;
  };
}
```

**実装場所**: `backend/src/routes/sellers.ts`

```typescript
router.get('/:id/duplicates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 売主情報を取得
    const seller = await sellerService.getSeller(id);
    
    if (!seller) {
      return res.status(404).json({
        error: {
          code: 'SELLER_NOT_FOUND',
          message: 'Seller not found',
          retryable: false,
        },
      });
    }
    
    // 重複を検出（自分自身を除外）
    const { duplicateDetectionService } = await import('../services/DuplicateDetectionService');
    const duplicates = await duplicateDetectionService.checkDuplicates(
      seller.phoneNumber,
      seller.email,
      id
    );
    
    res.json({ duplicates });
  } catch (error) {
    console.error('Get duplicates error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get duplicates',
        retryable: true,
      },
    });
  }
});
```

### DuplicateDetectionService

重複検出ロジックを提供するサービス。

**実装場所**: `backend/src/services/DuplicateDetectionService.ts`

**主要メソッド**:

```typescript
class DuplicateDetectionService {
  /**
   * 電話番号とメールアドレスで重複を検出
   * @param phoneNumber 電話番号
   * @param email メールアドレス
   * @param excludeId 除外する売主ID（自分自身）
   * @returns 重複案件の配列
   */
  async checkDuplicates(
    phoneNumber: string,
    email?: string,
    excludeId?: string
  ): Promise<DuplicateMatch[]>;
}
```

**重複検出ロジック**:
1. 電話番号で検索（暗号化されたデータで比較）
2. メールアドレスで検索（暗号化されたデータで比較）
3. 結果をマージし、重複を除去
4. 除外IDを除外
5. マッチタイプを判定（phone/email/both）

### エラーハンドリング

**エラーコード**:
- `SELLER_NOT_FOUND` (404): 売主が見つからない
- `INTERNAL_ERROR` (500): サーバーエラー

**リトライ可能性**:
- `retryable: false`: クライアント側のエラー（404など）
- `retryable: true`: サーバー側のエラー（500など）

## フロントエンド実装

### コンポーネント構成

#### 1. DuplicateIndicatorBadge

重複案件の存在を示すバッジコンポーネント。

**実装場所**: `frontend/src/components/DuplicateIndicatorBadge.tsx`

**Props**:
```typescript
interface DuplicateIndicatorBadgeProps {
  duplicateCount: number;  // 重複件数
  onClick: () => void;     // クリックハンドラー
}
```

**特徴**:
- Material-UIのChipコンポーネントを使用
- パルスアニメーション（2秒周期）
- 警告色（warning）で表示

**使用例**:
```tsx
<DuplicateIndicatorBadge
  duplicateCount={duplicates.length}
  onClick={handleOpenDuplicateModal}
/>
```

#### 2. DuplicateDetailsModal

重複案件の詳細情報を表示するモーダルダイアログ。

**実装場所**: `frontend/src/components/DuplicateDetailsModal.tsx`

**Props**:
```typescript
interface DuplicateDetailsModalProps {
  open: boolean;                        // モーダルの開閉状態
  onClose: () => void;                  // 閉じるハンドラー
  duplicates: DuplicateWithDetails[];   // 重複案件データ
  loading: boolean;                     // ローディング状態
  error?: string | null;                // エラーメッセージ
  onRetry?: () => void;                 // リトライハンドラー
}
```

**特徴**:
- Material-UIのDialogコンポーネントを使用
- ローディング状態の表示
- エラー時のリトライボタン
- Escキーで閉じる機能

**使用例**:
```tsx
<DuplicateDetailsModal
  open={duplicateModalOpen}
  onClose={handleCloseDuplicateModal}
  duplicates={duplicatesWithDetails}
  loading={detailsLoading}
  error={detailsError}
  onRetry={handleRetryLoadDetails}
/>
```

#### 3. DuplicateCard

個別の重複案件情報を表示するカード。

**実装場所**: `frontend/src/components/DuplicateCard.tsx`

**Props**:
```typescript
interface DuplicateCardProps {
  duplicate: DuplicateWithDetails;  // 重複案件データ
}

interface DuplicateWithDetails extends DuplicateMatch {
  comments?: string;      // スプレッドシートコメント
  activities?: Activity[]; // コミュニケーション履歴
}
```

**特徴**:
- マッチタイプに応じた色分け
  - both: error（赤）
  - phone: warning（オレンジ）
  - email: info（青）
- 売主番号をクリック可能なリンクとして表示
- コメントと履歴の表示/非表示
- 履歴は最新20件のみ表示

#### 4. ActivityItem

個別の活動履歴を表示するコンポーネント。

**実装場所**: `frontend/src/components/ActivityItem.tsx`

**Props**:
```typescript
interface ActivityItemProps {
  activity: Activity;  // 活動データ
}
```

**特徴**:
- 活動タイプに応じたアイコン表示
  - phone_call: 📞
  - email: ✉️
  - sms: 💬
- 日時の日本語フォーマット
- 担当者名の表示
- 長いコンテンツのスクロール対応

### 状態管理

CallModePageで管理される状態:

```typescript
// 重複案件関連の状態
const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
const [duplicatesLoading, setDuplicatesLoading] = useState(false);
const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
const [duplicatesWithDetails, setDuplicatesWithDetails] = useState<DuplicateWithDetails[]>([]);
const [detailsLoading, setDetailsLoading] = useState(false);
const [detailsError, setDetailsError] = useState<string | null>(null);
```

### データフロー

#### 1. 重複検出フロー

```typescript
// 1. ページロード時に非同期で重複を検出
useEffect(() => {
  if (seller) {
    loadDuplicates();
  }
}, [seller]);

// 2. 重複検出関数
const loadDuplicates = async () => {
  if (!id) return;
  
  // セッションキャッシュをチェック
  const cacheKey = `duplicates_${id}`;
  const cachedData = sessionStorage.getItem(cacheKey);
  
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      setDuplicates(parsed);
      return;
    } catch (e) {
      console.error('Failed to parse cached duplicates:', e);
    }
  }
  
  try {
    setDuplicatesLoading(true);
    const response = await api.get(`/sellers/${id}/duplicates`, {
      timeout: 10000,
    });
    const duplicatesData = response.data.duplicates || [];
    setDuplicates(duplicatesData);
    
    // セッションキャッシュに保存
    sessionStorage.setItem(cacheKey, JSON.stringify(duplicatesData));
  } catch (error) {
    console.error('Failed to load duplicates:', error);
    setDuplicates([]);
  } finally {
    setDuplicatesLoading(false);
  }
};
```

#### 2. 詳細情報取得フロー

```typescript
// モーダルを開く時に詳細情報を取得
const handleOpenDuplicateModal = async () => {
  setDuplicateModalOpen(true);
  
  if (duplicates.length === 0) return;
  
  // セッションキャッシュをチェック
  const cacheKey = `duplicate_details_${id}`;
  const cachedDetails = sessionStorage.getItem(cacheKey);
  
  if (cachedDetails) {
    try {
      const parsed = JSON.parse(cachedDetails);
      setDuplicatesWithDetails(parsed);
      return;
    } catch (e) {
      console.error('Failed to parse cached details:', e);
    }
  }
  
  try {
    setDetailsLoading(true);
    setDetailsError(null);
    
    // 各重複案件の詳細情報を並列で取得
    const detailsPromises = duplicates.map(async (duplicate: DuplicateMatch) => {
      try {
        // 売主情報とアクティビティを並列で取得
        const [sellerResponse, activitiesResponse] = await Promise.all([
          api.get(`/sellers/${duplicate.sellerId}`, { timeout: 10000 }),
          api.get(`/sellers/${duplicate.sellerId}/activities`, { timeout: 10000 }),
        ]);
        
        return {
          ...duplicate,
          comments: sellerResponse.data.comments,
          activities: activitiesResponse.data.activities || [],
        };
      } catch (error) {
        console.error(`Failed to load details for ${duplicate.sellerId}:`, error);
        return {
          ...duplicate,
          comments: undefined,
          activities: [],
        };
      }
    });
    
    const details = await Promise.all(detailsPromises);
    setDuplicatesWithDetails(details);
    
    // セッションキャッシュに保存
    sessionStorage.setItem(cacheKey, JSON.stringify(details));
  } catch (error) {
    console.error('Failed to load duplicate details:', error);
    setDetailsError('詳細情報の取得に失敗しました');
  } finally {
    setDetailsLoading(false);
  }
};
```

### キャッシュ戦略

**セッションストレージを使用したキャッシュ**:

1. **重複検出結果のキャッシュ**:
   - キー: `duplicates_${sellerId}`
   - 有効期限: セッション中（ブラウザを閉じるまで）
   - 目的: 同じ売主の重複検出を繰り返さない

2. **詳細情報のキャッシュ**:
   - キー: `duplicate_details_${sellerId}`
   - 有効期限: セッション中（ブラウザを閉じるまで）
   - 目的: モーダルを開閉する度に詳細情報を取得しない

**キャッシュのクリア**:
- ページリロード時に自動的にクリア
- セッション終了時に自動的にクリア

### パフォーマンス最適化

1. **非同期読み込み**:
   - 重複検出はページロード後に非同期で実行
   - ページの初期表示をブロックしない

2. **並列取得**:
   - 複数の重複案件の詳細情報を`Promise.all`で並列取得
   - 取得時間を短縮

3. **タイムアウト設定**:
   - すべてのAPIリクエストに10秒のタイムアウト
   - ネットワーク遅延時のフリーズを防止

4. **データ制限**:
   - 活動履歴は最新20件のみ表示
   - 大量のデータによるパフォーマンス低下を防止

## データベーススキーマ

### sellers テーブル

```sql
CREATE TABLE sellers (
  id UUID PRIMARY KEY,
  seller_number VARCHAR(10),
  name VARCHAR(255),
  phone_number TEXT,  -- 暗号化
  email TEXT,         -- 暗号化
  comments TEXT,
  inquiry_date DATE,
  -- その他のフィールド
);

-- 重複検出用のインデックス
CREATE INDEX idx_sellers_phone ON sellers(phone_number);
CREATE INDEX idx_sellers_email ON sellers(email);
```

### activity_logs テーブル

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES sellers(id),
  type VARCHAR(50),  -- 'phone_call', 'email', 'sms'
  content TEXT,
  employee_id UUID,
  created_at TIMESTAMP,
  -- その他のフィールド
);

-- 活動履歴取得用のインデックス
CREATE INDEX idx_activity_logs_seller_created ON activity_logs(seller_id, created_at DESC);
```

## テスト

### ユニットテスト

**バックエンド**:
```bash
cd backend
npm test -- sellers.test.ts
```

**フロントエンド**:
```bash
cd frontend
npm test -- DuplicateIndicatorBadge.test.tsx
npm test -- DuplicateDetailsModal.test.tsx
npm test -- DuplicateCard.test.tsx
npm test -- ActivityItem.test.tsx
```

### 統合テスト

```bash
cd frontend
npm test -- CallModePage.integration.test.tsx
```

### 手動テスト

詳細は `MANUAL_TEST_GUIDE.md` を参照してください。

## デプロイ

### 環境変数

特別な環境変数は不要です。既存の認証とデータベース接続の設定を使用します。

### デプロイ手順

1. **バックエンド**:
```bash
cd backend
npm run build
npm run start
```

2. **フロントエンド**:
```bash
cd frontend
npm run build
# ビルドされたファイルを静的ホスティングにデプロイ
```

### ロールバック

フロントエンドのみの変更のため、簡単にロールバック可能:

1. 前のバージョンのフロントエンドをデプロイ
2. バックエンドAPIは既存機能を使用しているため、変更不要

## トラブルシューティング

### 問題: 重複が検出されない

**原因**:
- 電話番号やメールアドレスの形式が異なる
- 暗号化の問題

**解決策**:
1. データベースで直接確認
2. 暗号化/復号化ロジックを確認
3. ログを確認

### 問題: パフォーマンスが遅い

**原因**:
- データベースのインデックスが不足
- ネットワーク遅延
- 大量の重複案件

**解決策**:
1. データベースのインデックスを確認
2. キャッシュが有効か確認
3. ネットワーク状況を確認
4. 活動履歴の表示件数を調整

### 問題: エラーが頻発する

**原因**:
- APIエンドポイントの問題
- 認証の問題
- データベース接続の問題

**解決策**:
1. サーバーログを確認
2. ブラウザのコンソールを確認
3. ネットワークタブでAPIレスポンスを確認
4. 認証トークンを確認

## 拡張ポイント

### 1. 重複検出ロジックの拡張

現在は電話番号とメールアドレスのみで検出していますが、以下を追加可能:

- 名前の類似度
- 住所の類似度
- 物件情報の類似度

**実装場所**: `backend/src/services/DuplicateDetectionService.ts`

### 2. 表示情報の拡張

現在はコメントと活動履歴のみですが、以下を追加可能:

- 査定履歴
- 契約履歴
- ドキュメント履歴

**実装場所**: `frontend/src/components/DuplicateCard.tsx`

### 3. フィルタリング機能

重複案件が多い場合、以下のフィルタリングを追加可能:

- マッチタイプでフィルター
- 日付範囲でフィルター
- 担当者でフィルター

**実装場所**: `frontend/src/components/DuplicateDetailsModal.tsx`

### 4. ソート機能

重複案件のソート順を変更可能:

- 反響日順
- マッチタイプ順
- 最終活動日順

**実装場所**: `frontend/src/components/DuplicateDetailsModal.tsx`

## API リファレンス

### GET /sellers/:id/duplicates

**説明**: 指定された売主の重複案件を取得

**認証**: 必須

**パラメータ**:
- `id` (path): 売主ID (UUID)

**レスポンス**:
```typescript
{
  duplicates: DuplicateMatch[]
}
```

**エラー**:
- 404: 売主が見つからない
- 500: サーバーエラー

**例**:
```bash
curl -X GET \
  http://localhost:3000/api/sellers/123e4567-e89b-12d3-a456-426614174000/duplicates \
  -H 'Authorization: Bearer <token>'
```

### GET /sellers/:id/activities

**説明**: 指定された売主の活動履歴を取得

**認証**: 必須

**パラメータ**:
- `id` (path): 売主ID (UUID)

**レスポンス**:
```typescript
{
  activities: Activity[]
}
```

**エラー**:
- 404: 売主が見つからない
- 500: サーバーエラー

## 参考資料

- [Requirements Document](./requirements.md)
- [Design Document](./design.md)
- [User Guide](./USER_GUIDE.md)
- [Manual Test Guide](./MANUAL_TEST_GUIDE.md)

---

**最終更新日**: 2024年12月9日
**バージョン**: 1.0.0
