# 設計ドキュメント：成約済み物件の決済日表示機能

## 概要

公開物件詳細ページにおいて、成約済み物件の場合に物件番号を表示し、Googleスプレッドシート（物件シート）から決済日を取得して「成約日」として表示する機能を実装します。

## アーキテクチャ

### データフロー

```
ユーザー → 公開物件詳細ページ表示
              ↓
        物件データ取得（既存API）
              ↓
        成約済み判定（getBadgeType）
              ↓
        【成約済みの場合】
              ↓
        物件番号を表示
              ↓
        決済日取得API呼び出し
              ↓
        Googleスプレッドシート（物件シート）
              ↓
        E列から決済日を取得
              ↓
        【決済日が存在する場合】
              ↓
        「成約日」として表示
```

### コンポーネント構成

```
PublicPropertyDetailPage (フロントエンド)
    ↓
    ├─ 既存: 物件情報表示
    ├─ 新規: 物件番号表示（成約済みの場合）
    └─ 新規: 成約日表示（決済日が存在する場合）
    
PropertyService (バックエンド)
    ↓
    └─ 新規: getSettlementDate(propertyNumber)
           ↓
           GoogleSheetsClient
               ↓
               物件シート（E列）
```

## コンポーネントとインターフェース

### 1. バックエンド: 決済日取得API

**新規エンドポイント**: `GET /api/public/properties/:propertyNumber/settlement-date`

**レスポンス**:
```typescript
interface SettlementDateResponse {
  settlementDate: string | null;  // ISO 8601形式（例: "2024-01-15"）またはnull
}
```

**実装場所**: `backend/src/routes/publicPropertyRoutes.ts`

### 2. バックエンド: PropertyService拡張

**新規メソッド**: `getSettlementDate(propertyNumber: string)`

```typescript
class PropertyService {
  // 既存メソッド...
  
  /**
   * 物件番号から決済日を取得
   * @param propertyNumber 物件番号（例: AA10424）
   * @returns 決済日（ISO 8601形式）またはnull
   */
  async getSettlementDate(propertyNumber: string): Promise<string | null> {
    try {
      // GoogleSheetsClientを使用して物件シートにアクセス
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
        sheetName: '物件',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      });
      
      await sheetsClient.authenticate();
      
      // 物件番号で行を検索（A列に物件番号があると仮定）
      const rowIndex = await sheetsClient.findRowByColumn('物件番号', propertyNumber);
      
      if (!rowIndex) {
        console.log(`Property ${propertyNumber} not found in sheet`);
        return null;
      }
      
      // E列（決済日）を取得
      const range = `E${rowIndex}`;
      const data = await sheetsClient.readRange(range);
      
      if (data.length === 0 || !data[0]['決済日']) {
        return null;
      }
      
      // 日付を正規化（ISO 8601形式に変換）
      const settlementDate = this.normalizeDate(data[0]['決済日']);
      return settlementDate;
    } catch (error) {
      console.error('Failed to get settlement date:', error);
      return null;  // エラー時はnullを返す（ページ全体の表示には影響しない）
    }
  }
  
  /**
   * 日付を正規化（ISO 8601形式に変換）
   */
  private normalizeDate(dateValue: any): string | null {
    if (!dateValue) return null;
    
    try {
      // Googleスプレッドシートの日付形式を処理
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];  // YYYY-MM-DD形式
    } catch (error) {
      console.error('Failed to normalize date:', error);
      return null;
    }
  }
}
```

### 3. フロントエンド: PublicPropertyDetailPage拡張

**変更箇所**: `frontend/src/pages/PublicPropertyDetailPage.tsx`

**追加する状態管理**:
```typescript
const [settlementDate, setSettlementDate] = useState<string | null>(null);
const [isLoadingSettlementDate, setIsLoadingSettlementDate] = useState(false);
```

**決済日取得ロジック**:
```typescript
useEffect(() => {
  // 成約済み物件の場合のみ決済日を取得
  if (property && isSold) {
    fetchSettlementDate();
  }
}, [property, isSold]);

const fetchSettlementDate = async () => {
  if (!property) return;
  
  setIsLoadingSettlementDate(true);
  try {
    const response = await fetch(
      `/api/public/properties/${property.property_number}/settlement-date`
    );
    
    if (response.ok) {
      const data = await response.json();
      setSettlementDate(data.settlementDate);
    }
  } catch (error) {
    console.error('Failed to fetch settlement date:', error);
    // エラー時は何も表示しない
  } finally {
    setIsLoadingSettlementDate(false);
  }
};
```

**表示ロジック**:
```typescript
{/* 成約済み物件の場合: 物件番号と成約日を表示 */}
{isSold && (
  <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      成約情報
    </Typography>
    
    {/* 物件番号 */}
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary">
        物件番号
      </Typography>
      <Typography variant="body1" fontWeight="medium">
        {property.property_number}
      </Typography>
    </Box>
    
    {/* 成約日（決済日が存在する場合のみ） */}
    {settlementDate && (
      <Box>
        <Typography variant="body2" color="text.secondary">
          成約日
        </Typography>
        <Typography variant="body1" fontWeight="medium">
          {formatSettlementDate(settlementDate)}
        </Typography>
      </Box>
    )}
  </Paper>
)}
```

**日付フォーマット関数**:
```typescript
const formatSettlementDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
};
```

## データモデル

### Googleスプレッドシート（物件シート）

- **スプレッドシートID**: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
- **シート名**: `物件`
- **A列**: 物件番号（検索キー）
- **E列**: 決済日（取得対象）

### APIレスポンス

```typescript
interface SettlementDateResponse {
  settlementDate: string | null;  // ISO 8601形式（YYYY-MM-DD）
}
```

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性または動作です。*

### プロパティ1: 成約済み物件の物件番号表示

*すべての*成約済み物件において、物件番号が公開物件詳細ページに表示されること

**検証**: 要件 1.1

### プロパティ2: 決済日の正確な取得

*すべての*物件番号に対して、Googleスプレッドシートから正しい決済日が取得されること（存在する場合）

**検証**: 要件 2.1, 2.2

### プロパティ3: 決済日の条件付き表示

*すべての*成約済み物件において、決済日が存在する場合のみ「成約日」が表示されること

**検証**: 要件 2.2, 2.3

### プロパティ4: エラー時の非破壊性

*すべての*決済日取得エラーにおいて、ページ全体の表示が正常に行われること

**検証**: 要件 3.3, NFR-2

## エラーハンドリング

### 1. スプレッドシートアクセスエラー

- **原因**: 認証失敗、ネットワークエラー、スプレッドシートIDの誤り
- **対応**: エラーをログに記録し、決済日を表示しない（ページ全体は正常表示）

### 2. 物件番号が見つからない

- **原因**: スプレッドシートに該当物件が存在しない
- **対応**: ログに記録し、決済日を表示しない

### 3. 決済日が空またはnull

- **原因**: 決済日がまだ入力されていない
- **対応**: 成約日セクションを表示しない（正常な動作）

### 4. 日付フォーマットエラー

- **原因**: 決済日の形式が不正
- **対応**: 元の文字列をそのまま表示（フォールバック）

## テスト戦略

### ユニットテスト

1. **PropertyService.getSettlementDate**
   - 物件番号が存在する場合、正しい決済日を返すこと
   - 物件番号が存在しない場合、nullを返すこと
   - 決済日が空の場合、nullを返すこと
   - エラー時にnullを返すこと

2. **日付正規化関数**
   - 有効な日付文字列をISO 8601形式に変換すること
   - 無効な日付文字列の場合、nullを返すこと

3. **日付フォーマット関数**
   - ISO 8601形式を日本語形式に変換すること
   - 無効な日付の場合、元の文字列を返すこと

### 統合テスト

1. **APIエンドポイント**
   - 有効な物件番号で決済日が返されること
   - 無効な物件番号で404エラーが返されること
   - 決済日が存在しない場合、nullが返されること

### E2Eテスト

1. **成約済み物件の表示**
   - 成約済み物件の詳細ページで物件番号が表示されること
   - 決済日が存在する場合、成約日が表示されること
   - 決済日が存在しない場合、成約日が表示されないこと

2. **非成約物件の表示**
   - 非成約物件の詳細ページで物件番号が表示されないこと
   - お問い合わせフォームが表示されること

## パフォーマンスへの影響

### 非同期取得

決済日の取得は非同期で行われるため、ページ全体の初期表示速度には影響しません。決済日の取得中は、他の物件情報が先に表示されます。

### キャッシュ戦略

現時点ではキャッシュを実装しませんが、将来的には以下のキャッシュ戦略を検討できます：

- **ブラウザキャッシュ**: 決済日は変更されないため、ブラウザのlocalStorageにキャッシュ
- **サーバーキャッシュ**: Redisなどを使用してサーバー側でキャッシュ

## セキュリティ考慮事項

### 1. 公開情報の制限

物件番号と決済日は公開情報として扱われますが、成約済み物件のみに表示を制限します。

### 2. APIアクセス制御

決済日取得APIは公開エンドポイントですが、レート制限を適用して過度なアクセスを防ぎます。

### 3. スプレッドシートアクセス

サービスアカウント認証を使用し、スプレッドシートへのアクセスを制限します。

## 実装の詳細

### 変更が必要なファイル

1. **バックエンド**:
   - `backend/src/services/PropertyService.ts`（決済日取得メソッド追加）
   - `backend/src/routes/publicPropertyRoutes.ts`（APIエンドポイント追加）

2. **フロントエンド**:
   - `frontend/src/pages/PublicPropertyDetailPage.tsx`（表示ロジック追加）

### 環境変数

既存の環境変数を使用：
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`: サービスアカウントJSONファイルのパス

### 配置順序

成約情報セクションは、物件基本情報の直後に配置します：

```
1. 物件画像ギャラリー
2. 物件基本情報（価格、住所、詳細）
3. 【新規】成約情報（物件番号、成約日） ← ここに追加
4. Athome情報
5. おすすめコメント
```

## まとめ

この設計では、最小限の変更で要件を満たすことができます。既存のGoogleSheetsClientを活用し、エラーハンドリングを適切に行うことで、ページ全体の表示に影響を与えずに決済日を表示できます。
