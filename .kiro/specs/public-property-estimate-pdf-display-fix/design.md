# Design Document

## Overview

公開物件サイトの概算書PDF生成機能が本番環境（Vercel）で動作しない問題を解決します。原因は、Vercel用のエントリーポイント（`backend/api/index.ts`）に概算書PDF生成エンドポイントが実装されていないことです。ローカル環境では`backend/src/routes/publicProperties.ts`に実装されていますが、本番環境では別のエントリーポイントが使用されるため、404エラーが発生しています。

## Architecture

### 現在の構成

```
ローカル環境:
  backend/src/index.ts
    └─ backend/src/routes/publicProperties.ts
         └─ POST /api/public/properties/:propertyNumber/estimate-pdf ✅

本番環境（Vercel）:
  backend/api/index.ts
    └─ POST /api/public/properties/:propertyNumber/estimate-pdf ❌ (未実装)
```

### 改善後の構成

```
本番環境（Vercel）:
  backend/api/index.ts
    └─ POST /api/public/properties/:propertyNumber/estimate-pdf ✅ (追加)
```

## Components and Interfaces

### 1. backend/api/index.ts への概算書エンドポイント追加

**追加するエンドポイント:**
```typescript
// 概算書PDF生成（物件番号で生成）
app.post('/api/public/properties/:propertyNumber/estimate-pdf', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    
    console.log(`[Estimate PDF] Starting for property: ${propertyNumber}`);
    
    // PropertyServiceをインポート
    const { PropertyService } = await import('../src/services/PropertyService');
    const propertyService = new PropertyService();
    
    // 概算書PDFを生成
    const pdfUrl = await propertyService.generateEstimatePdf(propertyNumber);
    
    console.log(`[Estimate PDF] Generated PDF URL: ${pdfUrl}`);

    res.json({ 
      success: true,
      pdfUrl 
    });
  } catch (error: any) {
    console.error('[Estimate PDF] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message || '概算書の生成に失敗しました'
    });
  }
});
```

### 2. PropertyService の動的インポート

**理由:**
- Vercelのサーバーレス環境では、必要な時にのみモジュールをインポートすることで、コールドスタート時間を短縮できる
- `PropertyService`は概算書生成時のみ必要なため、動的インポートが適切

**実装パターン:**
```typescript
const { PropertyService } = await import('../src/services/PropertyService');
const propertyService = new PropertyService();
```

### 3. Google Service Account の環境変数設定

**必要な環境変数:**
```
GOOGLE_SERVICE_ACCOUNT_JSON=<サービスアカウントキーのJSON文字列>
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=google-service-account.json
```

**PropertyService での使用:**
```typescript
// サービスアカウント認証
const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json');
const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
```

**Vercel環境での対応:**
- 環境変数`GOOGLE_SERVICE_ACCOUNT_JSON`にサービスアカウントキーのJSON文字列を設定
- `PropertyService`は既に実装済みで、ファイルパスからキーを読み込む仕組みになっている
- Vercel環境では、環境変数からキーを読み込むように修正する必要がある可能性がある

### 4. エラーハンドリング

**エラーの種類と対応:**

1. **認証エラー**
   - Google Sheets APIの認証に失敗
   - 環境変数が設定されていない
   - サービスアカウントキーが無効
   ```typescript
   catch (error) {
     console.error('[Estimate PDF] Authentication error:', error);
     res.status(500).json({ 
       success: false,
       message: '認証に失敗しました。管理者に連絡してください。'
     });
   }
   ```

2. **スプレッドシートアクセスエラー**
   - スプレッドシートが見つからない
   - アクセス権限がない
   ```typescript
   catch (error) {
     console.error('[Estimate PDF] Spreadsheet access error:', error);
     res.status(500).json({ 
       success: false,
       message: 'スプレッドシートへのアクセスに失敗しました。'
     });
   }
   ```

3. **計算タイムアウトエラー**
   - D11セルの計算が完了しない
   ```typescript
   catch (error) {
     console.error('[Estimate PDF] Calculation timeout:', error);
     res.status(500).json({ 
       success: false,
       message: '計算がタイムアウトしました。もう一度お試しください。'
     });
   }
   ```

## Data Models

### リクエスト

```typescript
POST /api/public/properties/:propertyNumber/estimate-pdf

// パラメータ
{
  propertyNumber: string  // 例: "AA12914"
}

// ボディ: なし
```

### レスポンス（成功）

```typescript
{
  success: true,
  pdfUrl: string  // 例: "https://docs.google.com/spreadsheets/d/.../export?format=pdf&..."
}
```

### レスポンス（エラー）

```typescript
{
  success: false,
  error: string,      // エラーコード
  message: string     // ユーザー向けエラーメッセージ
}
```

## Correctness Properties

*プロパティとは、システムが満たすべき特性や動作を形式的に記述したものです。これらは全ての有効な実行において真であるべき条件を表します。*

### Property 1: エンドポイントの存在

*For any* 本番環境、`POST /api/public/properties/:propertyNumber/estimate-pdf` エンドポイントが存在し、404エラーを返さない

**Validates: Requirements 2.1, 2.2**

### Property 2: PDF URL の生成

*For any* 有効な物件番号、エンドポイントを呼び出すと有効なPDF URLが返される

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 3: エラーハンドリング

*For any* エラー発生時、適切なHTTPステータスコードとエラーメッセージが返される

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: ログ記録

*For any* リクエスト、処理の各ステップがログに記録される

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Error Handling

### 1. 404エラーの解消

**現在の問題:**
```
POST /api/public/properties/AA12914/estimate-pdf
→ 404 Not Found
```

**解決策:**
- `backend/api/index.ts`にエンドポイントを追加
- Vercelの`routes`設定は既に正しく設定されている（全てのリクエストが`/api/index.ts`にルーティングされる）

### 2. 環境変数の確認

**必要な環境変数:**
```bash
# Vercel環境変数
GOOGLE_SERVICE_ACCOUNT_JSON=<JSON文字列>
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=google-service-account.json
SUPABASE_URL=<SupabaseのURL>
SUPABASE_SERVICE_KEY=<Supabaseのサービスキー>
```

**確認方法:**
```typescript
console.log('Environment variables check:', {
  GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'Set' : 'Missing',
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'Not set',
});
```

### 3. PropertyService の環境変数対応

**現在の実装:**
```typescript
const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json');
const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
```

**Vercel環境での問題:**
- ファイルシステムへのアクセスが制限されている
- 環境変数から直接JSONを読み込む必要がある

**改善案:**
```typescript
// 環境変数から直接読み込む（Vercel環境）
let keyFile;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} else {
  // ローカル環境ではファイルから読み込む
  const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json');
  keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}
```

## Testing Strategy

### Unit Tests

1. **エンドポイントの存在確認**
   - `POST /api/public/properties/:propertyNumber/estimate-pdf` が404を返さない
   - 正しいレスポンス形式を返す

2. **PropertyService の動的インポート**
   - `PropertyService`が正しくインポートされる
   - `generateEstimatePdf()`メソッドが呼び出せる

### Integration Tests

1. **本番環境でのテスト**
   - Vercelにデプロイ後、実際の物件番号でテスト
   - PDFが正しく生成されることを確認

2. **エラーケースのテスト**
   - 存在しない物件番号 → エラーメッセージ
   - 環境変数が設定されていない → 認証エラー

### Manual Tests

1. **公開物件サイトでの動作確認**
   - 概算書ボタンをクリック
   - PDFが新しいタブで開く
   - 正しい金額が表示されている

2. **エラー表示の確認**
   - エラー時に適切なメッセージが表示される
   - ブラウザコンソールにエラーログが出力される

## Implementation Notes

### 1. コードの配置

**追加するファイル:**
- `backend/api/index.ts` - 概算書エンドポイントを追加

**変更するファイル:**
- `backend/src/services/PropertyService.ts` - 環境変数対応（オプション）

### 2. デプロイ手順

1. `backend/api/index.ts`にエンドポイントを追加
2. Vercel環境変数を設定
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
   - `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`
3. Vercelにデプロイ
4. 動作確認

### 3. ログの充実

**追加するログ:**
```typescript
console.log(`[Estimate PDF] Starting for property: ${propertyNumber}`);
console.log(`[Estimate PDF] Generated PDF URL: ${pdfUrl}`);
console.error('[Estimate PDF] Error:', error);
```

### 4. パフォーマンス考慮

- 動的インポートを使用してコールドスタート時間を短縮
- PDF生成は既存の`PropertyService`を使用（計算完了待機機能付き）
- キャッシュは不要（毎回最新の計算結果を取得）

## Deployment Considerations

### 1. Vercel環境変数の設定

**設定方法:**
1. Vercelダッシュボードにアクセス
2. プロジェクト設定 → Environment Variables
3. 以下の環境変数を追加:
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: サービスアカウントキーのJSON文字列
   - `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`: `google-service-account.json`

### 2. 後方互換性

- ローカル環境の動作に影響しない
- 既存のエンドポイント（`backend/src/routes/publicProperties.ts`）はそのまま維持

### 3. ロールバック

問題が発生した場合:
1. Vercelで前のデプロイメントにロールバック
2. または、追加したエンドポイントをコメントアウト

### 4. モニタリング

以下のメトリクスを監視:
- PDF生成の成功率
- エラー発生頻度
- レスポンス時間

## Summary

この設計により、概算書PDF生成機能は以下のように改善されます:

1. **本番環境対応**: Vercel用エントリーポイントにエンドポイントを追加
2. **エラーハンドリング**: 適切なエラーメッセージとログ
3. **環境変数対応**: Vercel環境でのGoogle Sheets API認証
4. **パフォーマンス**: 動的インポートでコールドスタート時間を短縮
5. **保守性**: ローカル環境との互換性を維持

