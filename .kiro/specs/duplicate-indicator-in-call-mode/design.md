# Design Document

## Overview

通話モードページに重複案件インジケーター機能を追加し、営業担当者が重複案件の存在を即座に認識し、過去の対応履歴を確認できるようにする。この機能は、既存の`DuplicateDetectionService`を活用し、フロントエンドに新しいUIコンポーネントを追加することで実現する。

重複検出は非同期で行われ、ページの初期読み込みをブロックしない。重複が検出された場合、ヘッダーに視覚的なインジケーターが表示され、クリックすることでモーダルダイアログが開き、各重複案件の詳細情報（スプレッドシートコメント、コミュニケーション履歴）を確認できる。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     CallModePage                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              CallModeHeader                           │  │
│  │  ┌─────────────┐  ┌──────────────────────────────┐  │  │
│  │  │ Seller Info │  │  DuplicateIndicatorBadge     │  │  │
│  │  │ (AA12345)   │  │  [重複 (2)]                  │  │  │
│  │  └─────────────┘  └──────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              DuplicateDetailsModal                    │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  Duplicate 1: AA12903                           │ │  │
│  │  │  - Match Type: phone                            │ │  │
│  │  │  - Inquiry Date: 2024-01-15                     │ │  │
│  │  │  ┌───────────────────────────────────────────┐  │ │  │
│  │  │  │ Spreadsheet Comments                      │  │ │  │
│  │  │  │ - 過去に訪問査定実施済み                  │  │ │  │
│  │  │  └───────────────────────────────────────────┘  │ │  │
│  │  │  ┌───────────────────────────────────────────┐  │ │  │
│  │  │  │ Communication History                     │  │ │  │
│  │  │  │ - 2024-01-20: Phone Call                  │  │ │  │
│  │  │  │ - 2024-01-18: Email Sent                  │  │ │  │
│  │  │  └───────────────────────────────────────────┘  │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  GET /sellers/:id/duplicates                          │  │
│  │  - Returns: DuplicateMatch[]                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  GET /sellers/:id/activities                          │  │
│  │  - Returns: Activity[]                                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  DuplicateDetectionService                            │  │
│  │  - checkDuplicates()                                  │  │
│  │  - getDuplicateHistory()                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initial Load**:
   - CallModePageが売主情報をロード
   - 非同期で重複検出APIを呼び出し
   - 重複が見つかった場合、DuplicateIndicatorBadgeを表示

2. **User Interaction**:
   - ユーザーがDuplicateIndicatorBadgeをクリック
   - DuplicateDetailsModalが開く
   - 各重複案件のコメントと履歴を並列で取得
   - モーダルに情報を表示

3. **Navigation**:
   - ユーザーが重複案件の売主番号をクリック
   - 新しいタブで該当売主の詳細ページを開く

## Components and Interfaces

### Frontend Components

#### 1. DuplicateIndicatorBadge

売主番号の右隣に表示される重複インジケーター。

```typescript
interface DuplicateIndicatorBadgeProps {
  duplicateCount: number;
  onClick: () => void;
}

const DuplicateIndicatorBadge: React.FC<DuplicateIndicatorBadgeProps> = ({
  duplicateCount,
  onClick,
}) => {
  return (
    <Chip
      label={`重複 (${duplicateCount})`}
      color="warning"
      size="small"
      onClick={onClick}
      sx={{
        ml: 1,
        fontWeight: 'bold',
        cursor: 'pointer',
        animation: 'pulse 2s infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
      }}
    />
  );
};
```

#### 2. DuplicateDetailsModal

重複案件の詳細情報を表示するモーダルダイアログ。

```typescript
interface DuplicateDetailsModalProps {
  open: boolean;
  onClose: () => void;
  duplicates: DuplicateWithDetails[];
  loading: boolean;
}

interface DuplicateWithDetails extends DuplicateMatch {
  comments?: string;
  activities?: Activity[];
}

const DuplicateDetailsModal: React.FC<DuplicateDetailsModalProps> = ({
  open,
  onClose,
  duplicates,
  loading,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        重複案件情報
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          duplicates.map((duplicate) => (
            <DuplicateCard key={duplicate.sellerId} duplicate={duplicate} />
          ))
        )}
      </DialogContent>
    </Dialog>
  );
};
```

#### 3. DuplicateCard

個別の重複案件情報を表示するカード。

```typescript
interface DuplicateCardProps {
  duplicate: DuplicateWithDetails;
}

const DuplicateCard: React.FC<DuplicateCardProps> = ({ duplicate }) => {
  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'phone':
        return '電話番号';
      case 'email':
        return 'メールアドレス';
      case 'both':
        return '電話番号・メールアドレス';
      default:
        return matchType;
    }
  };

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'both':
        return 'error';
      case 'phone':
        return 'warning';
      case 'email':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            <Link
              href={`/sellers/${duplicate.sellerId}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textDecoration: 'none', color: 'primary.main' }}
            >
              {duplicate.sellerInfo.sellerNumber || duplicate.sellerId}
            </Link>
          </Typography>
          <Chip
            label={getMatchTypeLabel(duplicate.matchType)}
            color={getMatchTypeColor(duplicate.matchType)}
            size="small"
          />
        </Box>

        {/* Seller Info */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              名前
            </Typography>
            <Typography variant="body1">{duplicate.sellerInfo.name}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              反響日
            </Typography>
            <Typography variant="body1">
              {duplicate.sellerInfo.inquiryDate
                ? new Date(duplicate.sellerInfo.inquiryDate).toLocaleDateString('ja-JP')
                : '-'}
            </Typography>
          </Grid>
        </Grid>

        {/* Property Info */}
        {duplicate.propertyInfo && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              物件情報
            </Typography>
            <Typography variant="body1">
              {duplicate.propertyInfo.address} ({duplicate.propertyInfo.propertyType})
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Spreadsheet Comments */}
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            スプレッドシートコメント
          </Typography>
          {duplicate.comments ? (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {duplicate.comments}
              </Typography>
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary">
              コメントはありません
            </Typography>
          )}
        </Box>

        {/* Communication History */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            コミュニケーション履歴
          </Typography>
          {duplicate.activities && duplicate.activities.length > 0 ? (
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {duplicate.activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              履歴はありません
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
```

#### 4. ActivityItem

個別の活動履歴を表示するコンポーネント。

```typescript
interface ActivityItemProps {
  activity: Activity;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'phone_call':
        return <PhoneIcon fontSize="small" />;
      case 'email':
        return <EmailIcon fontSize="small" />;
      case 'sms':
        return <SmsIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'phone_call':
        return '電話';
      case 'email':
        return 'メール';
      case 'sms':
        return 'SMS';
      default:
        return type;
    }
  };

  return (
    <Box
      display="flex"
      alignItems="flex-start"
      gap={1}
      p={1}
      sx={{
        borderLeft: 2,
        borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ color: 'text.secondary', mt: 0.5 }}>
        {getActivityIcon(activity.type)}
      </Box>
      <Box flex={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {getActivityTypeLabel(activity.type)}
            {activity.employee && ` - ${activity.employee.name}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(activity.createdAt).toLocaleString('ja-JP')}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            mt: 0.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 100,
            overflow: 'auto',
          }}
        >
          {activity.content}
        </Typography>
      </Box>
    </Box>
  );
};
```

### Backend API Endpoints

#### 1. GET /sellers/:id/duplicates

現在の売主の重複案件を取得する。

**Request:**
```
GET /sellers/:id/duplicates
```

**Response:**
```typescript
{
  duplicates: DuplicateMatch[]
}
```

**Implementation:**
```typescript
router.get('/:id/duplicates', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 売主情報を取得
    const seller = await sellerService.getSellerById(id);
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

### State Management

CallModePageに以下の状態を追加:

```typescript
// 重複案件関連の状態
const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
const [duplicatesLoading, setDuplicatesLoading] = useState(false);
const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
const [duplicatesWithDetails, setDuplicatesWithDetails] = useState<DuplicateWithDetails[]>([]);
const [detailsLoading, setDetailsLoading] = useState(false);
```

### Data Models

既存の`DuplicateMatch`インターフェースを拡張:

```typescript
interface DuplicateWithDetails extends DuplicateMatch {
  comments?: string;
  activities?: Activity[];
}
```

## Data Models

### Existing Models (No Changes Required)

- `DuplicateMatch`: 既存の重複検出結果の型
- `Activity`: 既存の活動履歴の型
- `Seller`: 既存の売主情報の型

### New Models

```typescript
// 重複案件の詳細情報（コメントと履歴を含む）
interface DuplicateWithDetails extends DuplicateMatch {
  comments?: string;
  activities?: Activity[];
}

// API レスポンス型
interface GetDuplicatesResponse {
  duplicates: DuplicateMatch[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Duplicate detection excludes current seller

*For any* seller ID and duplicate detection request, the returned duplicates should not include the current seller itself
**Validates: Requirements 1.1**

### Property 2: Duplicate indicator visibility matches duplicate existence

*For any* seller with duplicates detected, the duplicate indicator should be visible if and only if duplicates exist
**Validates: Requirements 1.2, 1.3**

### Property 3: Duplicate count accuracy

*For any* set of detected duplicates, the count displayed in the indicator should equal the number of duplicate matches
**Validates: Requirements 1.5**

### Property 4: Modal content completeness

*For any* duplicate seller displayed in the modal, all required information (seller number, name, inquiry date, match type) should be present
**Validates: Requirements 2.3, 2.4, 2.5, 2.6**

### Property 5: Activity chronological ordering

*For any* communication history displayed, activities should be ordered chronologically from newest to oldest
**Validates: Requirements 4.2**

### Property 6: Link navigation preservation

*For any* seller detail link clicked from the duplicate modal, the current call mode page state should remain unchanged
**Validates: Requirements 6.3**

### Property 7: Asynchronous loading non-blocking

*For any* call mode page load, duplicate detection should not block the initial page render
**Validates: Requirements 7.1, 7.3**

## Error Handling

### Frontend Error Handling

1. **Duplicate Detection Failure**:
   - ログにエラーを記録
   - インジケーターを表示しない（重複がないものとして扱う）
   - ユーザーには通知しない（非クリティカルな機能のため）

2. **Details Loading Failure**:
   - モーダル内にエラーメッセージを表示
   - リトライボタンを提供
   - 部分的なデータがあれば表示

3. **Network Timeout**:
   - 10秒のタイムアウトを設定
   - タイムアウト時はエラーとして扱う

### Backend Error Handling

1. **Database Query Failure**:
   - エラーログを記録
   - 500エラーを返す
   - retryable: trueを設定

2. **Seller Not Found**:
   - 404エラーを返す
   - retryable: falseを設定

3. **Invalid Seller ID**:
   - 400エラーを返す
   - retryable: falseを設定

## Testing Strategy

### Unit Tests

1. **DuplicateIndicatorBadge**:
   - 正しいカウントが表示されること
   - クリックイベントが発火すること
   - スタイルが適用されること

2. **DuplicateDetailsModal**:
   - 開閉が正しく動作すること
   - ローディング状態が表示されること
   - 重複案件が正しくレンダリングされること

3. **DuplicateCard**:
   - マッチタイプに応じた表示が正しいこと
   - コメントの有無に応じた表示が正しいこと
   - 履歴の有無に応じた表示が正しいこと

4. **Backend API**:
   - 重複検出が正しく動作すること
   - 自分自身が除外されること
   - エラーハンドリングが正しいこと

### Integration Tests

1. **End-to-End Flow**:
   - 通話モードページロード → 重複検出 → インジケーター表示
   - インジケータークリック → モーダル表示 → 詳細情報ロード
   - 売主番号クリック → 新しいタブで詳細ページ表示

2. **Error Scenarios**:
   - 重複検出API失敗時の動作
   - 詳細情報取得失敗時の動作
   - ネットワークタイムアウト時の動作

### Performance Tests

1. **Load Time**:
   - 重複検出が2秒以内に完了すること
   - 詳細情報ロードが3秒以内に完了すること

2. **Concurrent Requests**:
   - 複数の重複案件の詳細を並列で取得できること
   - 10件の重複案件でも5秒以内に表示できること

## Performance Considerations

### Optimization Strategies

1. **Asynchronous Loading**:
   - 重複検出は非同期で実行し、ページロードをブロックしない
   - 詳細情報は必要になったときのみ取得（遅延ロード）

2. **Parallel Fetching**:
   - 複数の重複案件の詳細情報を並列で取得
   - Promise.allを使用して効率化

3. **Caching**:
   - セッション中は重複検出結果をキャッシュ
   - 詳細情報もセッション中はキャッシュ

4. **Data Pagination**:
   - 活動履歴が多い場合は最新20件のみ表示
   - 「もっと見る」ボタンで追加ロード

### Database Optimization

1. **Indexes**:
   - `phone_number`と`email`にインデックスが既に存在
   - 追加のインデックスは不要

2. **Query Optimization**:
   - 必要な列のみをSELECT
   - JOINを最小限に抑える

## Security Considerations

1. **Authentication**:
   - すべてのAPIエンドポイントで認証を必須とする
   - JWTトークンで認証

2. **Authorization**:
   - ユーザーは自分がアクセス権を持つ売主の重複情報のみ閲覧可能
   - 管理者は全ての重複情報を閲覧可能

3. **Data Privacy**:
   - 暗号化された電話番号とメールアドレスを使用
   - 重複検出は暗号化されたデータで実行

4. **Input Validation**:
   - 売主IDの形式を検証
   - SQLインジェクション対策（ORMを使用）

## Deployment Considerations

1. **Feature Flag**:
   - 環境変数で機能の有効/無効を切り替え可能
   - `ENABLE_DUPLICATE_INDICATOR=true`

2. **Rollback Plan**:
   - フロントエンドのみの変更のため、簡単にロールバック可能
   - バックエンドAPIは既存機能を使用

3. **Monitoring**:
   - 重複検出APIの呼び出し回数を監視
   - エラー率を監視
   - レスポンスタイムを監視

4. **Documentation**:
   - ユーザーガイドに新機能の説明を追加
   - 開発者ドキュメントにAPI仕様を追加
