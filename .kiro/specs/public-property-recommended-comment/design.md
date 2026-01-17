# おすすめコメント表示機能 - 設計書

## アーキテクチャ概要

```
┌─────────────────────────────────┐
│  PublicPropertyDetailPage       │
│  (フロントエンド)                │
└────────────┬────────────────────┘
             │ HTTP GET
             ▼
┌─────────────────────────────────┐
│  /api/public/properties/:id/    │
│  recommended-comment             │
│  (Express Route)                 │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  RecommendedCommentService       │
│  (ビジネスロジック)              │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  GoogleSheetsClient              │
│  (既存サービス)                  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Google Sheets API               │
│  (業務リスト - athomeシート)     │
└─────────────────────────────────┘
```

## データフロー

1. ユーザーが公開物件詳細ページにアクセス
2. フロントエンドが物件情報を取得（既存のAPI）
3. フロントエンドが非同期でおすすめコメントAPIを呼び出し
4. バックエンドが物件番号と物件タイプを取得
5. RecommendedCommentServiceが物件タイプに応じたセル位置を決定
6. GoogleSheetsClientがathomeシートから該当セルの値を取得
7. コメントをフロントエンドに返却
8. フロントエンドがコメントを画像ギャラリーの下に表示

## バックエンド設計

### 1. RecommendedCommentService

**ファイル**: `backend/src/services/RecommendedCommentService.ts`

```typescript
export interface RecommendedCommentResult {
  comment: string | null;
  propertyType: string;
}

export class RecommendedCommentService {
  private googleSheetsClient: GoogleSheetsClient;
  
  constructor() {
    // 業務リストのスプレッドシート設定
    this.googleSheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    });
  }
  
  /**
   * 物件番号からおすすめコメントを取得
   */
  async getRecommendedComment(
    propertyNumber: string,
    propertyType: string
  ): Promise<RecommendedCommentResult> {
    // 物件タイプに応じたセル位置を決定
    const cellPosition = this.getCellPosition(propertyType);
    
    if (!cellPosition) {
      return { comment: null, propertyType };
    }
    
    // スプレッドシートから該当物件のシートを検索
    // （物件番号でシートを特定する必要がある場合）
    const comment = await this.fetchCommentFromSheet(
      propertyNumber,
      cellPosition
    );
    
    return { comment, propertyType };
  }
  
  /**
   * 物件タイプからセル位置を取得
   */
  private getCellPosition(propertyType: string): string | null {
    const cellMap: Record<string, string> = {
      '土地': 'B53',
      '戸建て': 'B142',
      'マンション': 'B150',
    };
    
    return cellMap[propertyType] || null;
  }
  
  /**
   * スプレッドシートからコメントを取得
   */
  private async fetchCommentFromSheet(
    propertyNumber: string,
    cellPosition: string
  ): Promise<string | null> {
    try {
      await this.googleSheetsClient.authenticate();
      
      // athomeシートから該当セルの値を取得
      const range = `athome!${cellPosition}`;
      const data = await this.googleSheetsClient.readRange(range);
      
      if (data && data.length > 0 && data[0][cellPosition]) {
        const comment = data[0][cellPosition];
        return typeof comment === 'string' ? comment.trim() : null;
      }
      
      return null;
    } catch (error: any) {
      console.error(
        `[RecommendedCommentService] Failed to fetch comment for ${propertyNumber}:`,
        error.message
      );
      return null;
    }
  }
}
```



### 2. APIルート

**ファイル**: `backend/src/routes/publicProperties.ts` (既存ファイルに追加)

```typescript
// おすすめコメント取得エンドポイント
router.get('/:id/recommended-comment', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 物件情報を取得
    const property = await propertyListingService.getPublicPropertyById(id);
    
    if (!property) {
      return res.status(404).json({
        error: 'Property not found or not publicly available'
      });
    }
    
    // おすすめコメントを取得
    const recommendedCommentService = new RecommendedCommentService();
    const result = await recommendedCommentService.getRecommendedComment(
      property.property_number,
      property.property_type
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('[PublicProperties] Error fetching recommended comment:', error);
    res.status(500).json({
      error: 'Failed to fetch recommended comment',
      message: error.message
    });
  }
});
```

## フロントエンド設計

### 1. RecommendedCommentSection コンポーネント

**ファイル**: `frontend/src/components/RecommendedCommentSection.tsx`

```typescript
import React from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../services/publicApi';

interface RecommendedCommentSectionProps {
  propertyId: string;
}

const RecommendedCommentSection: React.FC<RecommendedCommentSectionProps> = ({
  propertyId,
}) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recommendedComment', propertyId],
    queryFn: () => publicApi.getRecommendedComment(propertyId),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // ローディング中
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // エラーまたはコメントなし
  if (isError || !data?.comment) {
    return null;
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: '#FFF9E6',
        borderLeft: '4px solid #FFC107',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontWeight: 'bold',
          color: '#F57C00',
        }}
      >
        おすすめポイント
      </Typography>
      <Typography
        variant="body1"
        sx={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.8,
          color: 'text.primary',
        }}
      >
        {data.comment}
      </Typography>
    </Paper>
  );
};

export default RecommendedCommentSection;
```

### 2. publicApi サービスの拡張

**ファイル**: `frontend/src/services/publicApi.ts` (既存ファイルに追加)

```typescript
// おすすめコメント取得
export const getRecommendedComment = async (
  propertyId: string
): Promise<{ comment: string | null; propertyType: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/public/properties/${propertyId}/recommended-comment`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch recommended comment');
  }
  
  return response.json();
};
```

### 3. PublicPropertyDetailPage の更新

**ファイル**: `frontend/src/pages/PublicPropertyDetailPage.tsx` (既存ファイルを更新)

```typescript
// インポートを追加
import RecommendedCommentSection from '../components/RecommendedCommentSection';

// 画像ギャラリーの直後に追加
<PropertyImageGallery 
  propertyId={property.id} 
  canDelete={false}
  canHide={isAuthenticated}
  showHiddenImages={isAuthenticated}
/>

{/* おすすめコメントセクション */}
<RecommendedCommentSection propertyId={property.id} />

{/* 物件基本情報 */}
<Paper elevation={2} sx={{ p: 3, mb: 3 }}>
  ...
</Paper>
```

## データモデル

### APIレスポンス

```typescript
interface RecommendedCommentResponse {
  comment: string | null;
  propertyType: string;
}
```

### エラーレスポンス

```typescript
interface ErrorResponse {
  error: string;
  message?: string;
}
```

## エラーハンドリング戦略

### バックエンド

1. **物件が見つからない**: 404エラーを返す
2. **スプレッドシートアクセスエラー**: ログ出力し、comment: null を返す
3. **認証エラー**: ログ出力し、500エラーを返す
4. **予期しないエラー**: ログ出力し、500エラーを返す

### フロントエンド

1. **APIエラー**: コメントセクションを非表示
2. **ネットワークエラー**: コメントセクションを非表示
3. **コメントがnull**: コメントセクションを非表示
4. **ローディング中**: 小さなスピナーを表示

## パフォーマンス最適化

### キャッシング戦略

1. **フロントエンド**: React Queryで5分間キャッシュ
2. **バックエンド**: GoogleSheetsClientの既存のレート制限機能を使用
3. **スプレッドシート**: 同一物件への連続アクセスを制限

### 非同期読み込み

1. 物件情報の取得とコメント取得を並列実行
2. コメント取得の失敗が物件情報表示をブロックしない
3. ローディング状態を適切に表示

## セキュリティ考慮事項

1. **認証情報**: 環境変数で管理、コードにハードコードしない
2. **入力検証**: 物件IDの形式を検証
3. **レート制限**: 既存のRateLimiterを使用
4. **エラーメッセージ**: 内部情報を公開しない

## テスト戦略

### ユニットテスト

1. **RecommendedCommentService**
   - 各物件タイプで正しいセル位置を返すか
   - スプレッドシートからコメントを正しく取得できるか
   - エラー時にnullを返すか

2. **RecommendedCommentSection**
   - ローディング状態を正しく表示するか
   - コメントがある場合に表示されるか
   - コメントがない場合に非表示になるか

### インテグレーションテスト

1. APIエンドポイントが正しいレスポンスを返すか
2. 物件が見つからない場合に404を返すか
3. スプレッドシートアクセスエラー時の動作

### E2Eテスト

1. 公開物件詳細ページでコメントが表示されるか
2. コメントがない物件でセクションが非表示になるか
3. エラー時にページが正常に表示されるか

## デプロイメント

### 環境変数

```bash
# 既存の環境変数を使用
GYOMU_LIST_SPREADSHEET_ID=<スプレッドシートID>
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=<サービスアカウントキーのパス>
```

### デプロイ手順

1. バックエンドのコード変更をデプロイ
2. フロントエンドのコード変更をデプロイ
3. 動作確認（各物件タイプでテスト）
4. エラーログを監視

## 今後の改善案

1. **管理画面**: おすすめコメントを直接編集できる機能
2. **多言語対応**: 英語版のコメント対応
3. **リッチテキスト**: HTMLやMarkdown形式のコメント対応
4. **画像埋め込み**: コメント内に画像を表示
5. **履歴管理**: コメントの変更履歴を記録
