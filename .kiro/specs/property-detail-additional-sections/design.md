# 設計ドキュメント：公開物件詳細ページ追加セクション機能

## 概要

公開物件詳細ページの最下部に2つの新しいセクションを追加します：
1. 「こちらの物件について」- 物件シートのBQ列から説明文を取得して表示
2. 「概算書」- クリックすると概算書シートに物件番号を入力し、PDF化して表示

## アーキテクチャ

### データフロー

#### 「こちらの物件について」セクション

```
ユーザー → 公開物件詳細ページ表示
              ↓
        物件データ取得（既存API）
              ↓
        BQ列データ取得API呼び出し
              ↓
        Googleスプレッドシート（物件シート）
              ↓
        BQ列から説明文を取得
              ↓
        【説明文が存在する場合】
              ↓
        「こちらの物件について」セクションに表示
```

#### 「概算書」セクション

```
ユーザー → 「概算書を見る」ボタンクリック
              ↓
        概算書PDF生成API呼び出し
              ↓
        概算書シートのC2セルに物件番号を入力
              ↓
        スプレッドシートの計算完了を待機
              ↓
        Google Sheets APIでPDFエクスポート
              ↓
        新しいタブでPDFを表示
```

## コンポーネントとインターフェース

### 1. バックエンド: BQ列データ取得API

**新規エンドポイント**: `GET /api/public/properties/:propertyNumber/about`

**レスポンス**:
```typescript
interface PropertyAboutResponse {
  about: string | null;  // BQ列の説明文またはnull
}
```

### 2. バックエンド: 概算書PDF生成API

**新規エンドポイント**: `POST /api/public/properties/:propertyNumber/estimate-pdf`

**レスポンス**:
```typescript
interface EstimatePdfResponse {
  pdfUrl: string;  // 生成されたPDFのURL
}
```

### 3. バックエンド: PropertyService拡張

**新規メソッド1**: `getPropertyAbout(propertyNumber: string)`

```typescript
class PropertyService {
  /**
   * 物件番号からBQ列の説明文を取得
   * @param propertyNumber 物件番号（例: AA10424）
   * @returns 説明文またはnull
   */
  async getPropertyAbout(propertyNumber: string): Promise<string | null> {
    try {
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
        sheetName: '物件',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      });
      
      await sheetsClient.authenticate();
      
      // 物件番号で行を検索
      const rowIndex = await sheetsClient.findRowByColumn('物件番号', propertyNumber);
      
      if (!rowIndex) {
        return null;
      }
      
      // BQ列を取得（BQ列は69番目の列）
      const range = `BQ${rowIndex}`;
      const data = await sheetsClient.readRange(range);
      
      if (data.length === 0 || !data[0]['こちらの物件について']) {
        return null;
      }
      
      return data[0]['こちらの物件について'] as string;
    } catch (error) {
      console.error('Failed to get property about:', error);
      return null;
    }
  }
}
```

**新規メソッド2**: `generateEstimatePdf(propertyNumber: string)`

```typescript
class PropertyService {
  /**
   * 概算書PDFを生成
   * @param propertyNumber 物件番号（例: AA10424）
   * @returns PDFのURL
   */
  async generateEstimatePdf(propertyNumber: string): Promise<string> {
    try {
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: '1M9uVzHWD2ipzoY5Om3h3a2-_uQa9D_UGhpB5U4_nyRc',
        sheetName: '威風専用公開サイト用',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      });
      
      await sheetsClient.authenticate();
      
      // C2セルに物件番号を入力
      await sheetsClient.updateRow(2, { '物件番号': propertyNumber });
      
      // 計算完了を待機（2秒）
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // PDFをエクスポート
      const pdfUrl = await this.exportSheetAsPdf(
        '1M9uVzHWD2ipzoY5Om3h3a2-_uQa9D_UGhpB5U4_nyRc',
        '威風専用公開サイト用'
      );
      
      return pdfUrl;
    } catch (error) {
      console.error('Failed to generate estimate PDF:', error);
      throw new Error('概算書の生成に失敗しました');
    }
  }
  
  /**
   * スプレッドシートをPDFとしてエクスポート
   */
  private async exportSheetAsPdf(
    spreadsheetId: string,
    sheetName: string
  ): Promise<string> {
    // Google Sheets APIを使用してPDFエクスポートURLを生成
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&gid=0&size=A4`;
    return exportUrl;
  }
}
```

### 4. フロントエンド: PublicPropertyDetailPage拡張

**追加する状態管理**:
```typescript
const [propertyAbout, setPropertyAbout] = useState<string | null>(null);
const [isLoadingAbout, setIsLoadingAbout] = useState(false);
const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
```

**BQ列データ取得ロジック**:
```typescript
useEffect(() => {
  if (property) {
    fetchPropertyAbout();
  }
}, [property]);

const fetchPropertyAbout = async () => {
  if (!property) return;
  
  setIsLoadingAbout(true);
  try {
    const response = await fetch(
      `/api/public/properties/${property.property_number}/about`
    );
    
    if (response.ok) {
      const data = await response.json();
      setPropertyAbout(data.about);
    }
  } catch (error) {
    console.error('Failed to fetch property about:', error);
  } finally {
    setIsLoadingAbout(false);
  }
};
```

**概算書PDF生成ロジック**:
```typescript
const handleGenerateEstimatePdf = async () => {
  if (!property) return;
  
  setIsGeneratingPdf(true);
  try {
    const response = await fetch(
      `/api/public/properties/${property.property_number}/estimate-pdf`,
      { method: 'POST' }
    );
    
    if (response.ok) {
      const data = await response.json();
      // 新しいタブでPDFを開く
      window.open(data.pdfUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('概算書の生成に失敗しました');
    }
  } catch (error) {
    console.error('Failed to generate estimate PDF:', error);
    alert('概算書の生成に失敗しました');
  } finally {
    setIsGeneratingPdf(false);
  }
};
```

**表示ロジック**:
```typescript
{/* こちらの物件について */}
{propertyAbout && (
  <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      こちらの物件について
    </Typography>
    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
      {propertyAbout}
    </Typography>
  </Paper>
)}

{/* 概算書 */}
<Paper elevation={2} sx={{ p: 3, mb: 3 }}>
  <Typography variant="h6" sx={{ mb: 2 }}>
    概算書
  </Typography>
  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
    この物件の概算書をPDFで確認できます
  </Typography>
  <Button
    variant="contained"
    onClick={handleGenerateEstimatePdf}
    disabled={isGeneratingPdf}
    fullWidth
    sx={{
      backgroundColor: '#FFC107',
      color: '#000',
      '&:hover': {
        backgroundColor: '#FFB300',
      },
    }}
  >
    {isGeneratingPdf ? '生成中...' : '概算書を見る'}
  </Button>
</Paper>
```

## データモデル

### Googleスプレッドシート（物件シート）

- **スプレッドシートID**: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
- **シート名**: `物件`
- **A列**: 物件番号（検索キー）
- **BQ列**: こちらの物件について（取得対象）

### Googleスプレッドシート（概算書シート）

- **スプレッドシートID**: `1M9uVzHWD2ipzoY5Om3h3a2-_uQa9D_UGhpB5U4_nyRc`
- **シート名**: `威風専用公開サイト用`
- **C2セル**: 物件番号入力セル

## 正確性プロパティ

### プロパティ1: BQ列データの正確な取得

*すべての*物件番号に対して、Googleスプレッドシートから正しいBQ列のデータが取得されること

**検証**: 要件 1.2

### プロパティ2: 概算書PDFの正確な生成

*すべての*物件番号に対して、C2セルに正しく入力され、PDFが生成されること

**検証**: 要件 2.2, 2.3, 2.4

### プロパティ3: エラー時の非破壊性

*すべての*データ取得エラーにおいて、ページ全体の表示が正常に行われること

**検証**: 要件 3.1, 3.4

## エラーハンドリング

### 1. BQ列データ取得エラー

- **対応**: エラーをログに記録し、セクションを非表示にする

### 2. 概算書PDF生成エラー

- **対応**: ユーザーにアラートメッセージを表示

### 3. スプレッドシートアクセスエラー

- **対応**: エラーをログに記録し、適切なエラーメッセージを返す

## テスト戦略

### ユニットテスト

1. **PropertyService.getPropertyAbout**
   - 物件番号が存在する場合、正しいBQ列データを返すこと
   - 物件番号が存在しない場合、nullを返すこと
   - エラー時にnullを返すこと

2. **PropertyService.generateEstimatePdf**
   - 物件番号を正しくC2セルに入力すること
   - PDFのURLを返すこと
   - エラー時に例外をスローすること

### E2Eテスト

1. **「こちらの物件について」セクション**
   - BQ列にデータがある物件で表示されること
   - BQ列にデータがない物件で非表示になること

2. **「概算書」セクション**
   - ボタンをクリックするとPDFが新しいタブで開くこと
   - 生成中はローディング表示されること

## パフォーマンスへの影響

### 非同期取得

BQ列データの取得は非同期で行われるため、ページ全体の初期表示速度には影響しません。

### PDF生成の遅延

概算書PDF生成はユーザーがボタンをクリックした時のみ実行されるため、ページ読み込み時のパフォーマンスには影響しません。

## セキュリティ考慮事項

### 1. スプレッドシートアクセス

サービスアカウント認証を使用し、スプレッドシートへのアクセスを制限します。

### 2. PDF生成の制限

概算書PDF生成APIにレート制限を適用して、過度なアクセスを防ぎます。

## 実装の詳細

### 変更が必要なファイル

1. **バックエンド**:
   - `backend/src/services/PropertyService.ts`（新規メソッド追加）
   - `backend/src/routes/publicProperties.ts`（APIエンドポイント追加）

2. **フロントエンド**:
   - `frontend/src/pages/PublicPropertyDetailPage.tsx`（表示ロジック追加）

### 配置順序

新しいセクションは、ページ最下部に配置します：

```
1. 物件画像ギャラリー
2. 物件基本情報
3. 成約情報（成約済みの場合）
4. Athome情報
5. おすすめコメント
6. 【新規】こちらの物件について ← ここに追加
7. 【新規】概算書 ← ここに追加
```

## まとめ

この設計では、既存のGoogleSheetsClientを活用し、2つの新しいセクションを追加します。エラーハンドリングを適切に行うことで、ページ全体の表示に影響を与えずに新機能を提供できます。
