# Design Document

## Overview

公開物件サイトの概算書PDF生成機能において、スプレッドシートの計算完了を確実に待機してからPDFを生成するように改善します。現在は固定の2秒待機ですが、これをD11セル（金額セル）の値を監視するポーリング方式に変更し、計算が完了してから確実にPDFを生成します。

## Architecture

### 現在の処理フロー

```
1. C2セルに物件番号を書き込み
2. 2秒待機（固定）
3. PDFをエクスポート
```

**問題点**: 2秒では計算が完了しない場合がある

### 改善後の処理フロー

```
1. C2セルに物件番号を書き込み
2. D11セル（金額）の値をポーリング
   - 500msごとにD11セルを読み取り
   - 有効な数値が入っていれば計算完了と判断
   - 最大10秒まで待機
3. 計算完了後、PDFをエクスポート
```

**改善点**: 計算完了を確実に検証してからPDF生成

## Components and Interfaces

### 1. PropertyService.generateEstimatePdf() の改善

**現在の実装:**
```typescript
async generateEstimatePdf(propertyNumber: string): Promise<string> {
  // C2セルに物件番号を書き込み
  await sheets.spreadsheets.values.update({...});
  
  // 固定2秒待機
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // PDF生成
  return this.exportSheetAsPdf(...);
}
```

**改善後の実装:**
```typescript
async generateEstimatePdf(propertyNumber: string): Promise<string> {
  // C2セルに物件番号を書き込み
  await sheets.spreadsheets.values.update({...});
  
  // D11セルの計算完了を待機
  await this.waitForCalculationCompletion(sheets, spreadsheetId, sheetName);
  
  // PDF生成
  return this.exportSheetAsPdf(...);
}
```

### 2. 新規メソッド: waitForCalculationCompletion()

**シグネチャ:**
```typescript
private async waitForCalculationCompletion(
  sheets: any,
  spreadsheetId: string,
  sheetName: string
): Promise<void>
```

**パラメータ:**
- `sheets`: Google Sheets APIクライアント
- `spreadsheetId`: スプレッドシートID
- `sheetName`: シート名

**処理内容:**
1. D11セルの値を読み取る
2. 値が有効な数値かチェック
3. 有効でない場合は500ms待機して再試行
4. 最大10秒（20回試行）まで繰り返す
5. タイムアウト時はエラーをスロー

**実装例:**
```typescript
private async waitForCalculationCompletion(
  sheets: any,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const VALIDATION_CELL = 'D11';  // 金額セル
  const MAX_ATTEMPTS = 20;        // 最大試行回数
  const RETRY_INTERVAL = 500;     // リトライ間隔（ms）
  
  console.log(`[waitForCalculationCompletion] Starting validation for cell ${VALIDATION_CELL}`);
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // D11セルの値を読み取り
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!${VALIDATION_CELL}`,
      });
      
      const cellValue = response.data.values?.[0]?.[0];
      console.log(`[waitForCalculationCompletion] Attempt ${attempt}/${MAX_ATTEMPTS}: Cell value = ${cellValue}`);
      
      // 値が有効な数値かチェック
      if (this.isValidCalculatedValue(cellValue)) {
        console.log(`[waitForCalculationCompletion] Calculation completed. Value: ${cellValue}`);
        return;
      }
      
      // 最後の試行でない場合は待機
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      }
    } catch (error) {
      console.error(`[waitForCalculationCompletion] Error reading cell on attempt ${attempt}:`, error);
      // エラーが発生しても続行（次の試行へ）
    }
  }
  
  // タイムアウト
  throw new Error(`計算がタイムアウトしました（${MAX_ATTEMPTS * RETRY_INTERVAL / 1000}秒）。D11セルに値が入力されませんでした。`);
}
```

### 3. 新規メソッド: isValidCalculatedValue()

**シグネチャ:**
```typescript
private isValidCalculatedValue(value: any): boolean
```

**検証ロジック:**
```typescript
private isValidCalculatedValue(value: any): boolean {
  // 値が存在しない場合
  if (value === undefined || value === null || value === '') {
    return false;
  }
  
  // 数値に変換
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  
  // 数値でない、または0以下の場合は無効
  if (isNaN(numValue) || numValue <= 0) {
    return false;
  }
  
  return true;
}
```

## Data Models

### 環境変数（オプション）

将来的な拡張のため、環境変数で設定可能にすることも検討：

```typescript
// .env
ESTIMATE_PDF_MAX_WAIT_TIME=10000      // 最大待機時間（ms）
ESTIMATE_PDF_RETRY_INTERVAL=500      // リトライ間隔（ms）
ESTIMATE_PDF_VALIDATION_CELL=D11     // 検証セル
```

**実装例:**
```typescript
const MAX_WAIT_TIME = parseInt(process.env.ESTIMATE_PDF_MAX_WAIT_TIME || '10000');
const RETRY_INTERVAL = parseInt(process.env.ESTIMATE_PDF_RETRY_INTERVAL || '500');
const VALIDATION_CELL = process.env.ESTIMATE_PDF_VALIDATION_CELL || 'D11';
const MAX_ATTEMPTS = Math.floor(MAX_WAIT_TIME / RETRY_INTERVAL);
```

## Correctness Properties

*プロパティとは、システムが満たすべき特性や動作を形式的に記述したものです。これらは全ての有効な実行において真であるべき条件を表します。*

### Property 1: 計算完了の検証

*For any* 物件番号、C2セルに書き込んだ後、D11セルに有効な数値が入るまでPDF生成を開始しない

**Validates: Requirements 1.2, 1.3, 2.1, 2.4**

### Property 2: タイムアウト処理

*For any* 計算待機処理、最大待機時間（10秒）を超えた場合は必ずエラーをスローする

**Validates: Requirements 2.3**

### Property 3: リトライ動作

*For any* D11セルの値が無効な場合、指定された間隔（500ms）で再試行を行う

**Validates: Requirements 2.2, 3.4**

### Property 4: 有効値の判定

*For any* D11セルの値、数値でありかつ0より大きい場合のみ有効と判定する

**Validates: Requirements 2.4**

## Error Handling

### 1. タイムアウトエラー

**発生条件**: 最大待機時間内にD11セルに有効な値が入らない

**処理:**
```typescript
throw new Error('計算がタイムアウトしました（10秒）。D11セルに値が入力されませんでした。');
```

**ユーザーへの表示:**
```typescript
alert('概算書の生成に失敗しました。計算に時間がかかりすぎています。もう一度お試しください。');
```

### 2. セル読み取りエラー

**発生条件**: Google Sheets APIでセルの読み取りに失敗

**処理:**
- エラーをログに記録
- 次の試行を続行（一時的なエラーの可能性があるため）
- 最終的にタイムアウトエラーになる

### 3. 認証エラー

**発生条件**: Google Sheets APIの認証に失敗

**処理:**
```typescript
throw new Error('概算書の生成に失敗しました');
```

**ログ:**
```typescript
console.error('[generateEstimatePdf] Authentication error:', error);
```

## Testing Strategy

### Unit Tests

1. **isValidCalculatedValue() のテスト**
   - 有効な数値（正の数）→ true
   - 0 → false
   - 負の数 → false
   - 空文字列 → false
   - null/undefined → false
   - 文字列の数値（"1234"）→ true

2. **waitForCalculationCompletion() のテスト**
   - D11セルに即座に有効な値がある場合 → すぐに完了
   - D11セルに2回目の試行で値が入る場合 → 2回目で完了
   - D11セルに値が入らない場合 → タイムアウトエラー

### Integration Tests

1. **実際のスプレッドシートでのテスト**
   - 物件番号を書き込み、計算完了を待機、PDF生成
   - 初回クリックで正しい金額が入ったPDFが生成されることを確認

2. **エラーケースのテスト**
   - 存在しない物件番号 → タイムアウトエラー
   - スプレッドシートへのアクセス権限がない → 認証エラー

### Manual Tests

1. **公開物件サイトでの動作確認**
   - 概算書ボタンをクリック
   - 「計算中...」メッセージが表示される
   - 数秒後にPDFがダウンロードされる
   - PDFに正しい金額が表示されている

2. **複数回クリックのテスト**
   - 1回目のクリック → 正しい金額が表示される
   - 2回目のクリック → 同じく正しい金額が表示される

## Implementation Notes

### 1. ログの充実

計算待機中の状態を詳細にログに記録：

```typescript
console.log(`[waitForCalculationCompletion] Starting validation for cell ${VALIDATION_CELL}`);
console.log(`[waitForCalculationCompletion] Attempt ${attempt}/${MAX_ATTEMPTS}: Cell value = ${cellValue}`);
console.log(`[waitForCalculationCompletion] Calculation completed. Value: ${cellValue}`);
console.log(`[waitForCalculationCompletion] Timeout after ${MAX_ATTEMPTS} attempts`);
```

### 2. フロントエンドの状態表示

ユーザーに処理状況を伝えるため、ボタンのテキストを変更：

```typescript
// 現在
{isGeneratingPdf ? '生成中...' : '概算書を見る'}

// 改善案（オプション）
{isGeneratingPdf ? '計算中...' : '概算書を見る'}
```

### 3. パフォーマンス考慮

- ポーリング間隔: 500ms（サーバー負荷とレスポンスのバランス）
- 最大待機時間: 10秒（ユーザー体験を損なわない範囲）
- 通常は2〜3秒で完了することを想定

### 4. 将来の拡張性

環境変数で設定可能にすることで、以下の調整が容易：
- 検証セルの変更（D11 → 別のセル）
- 待機時間の調整（10秒 → 15秒など）
- リトライ間隔の調整（500ms → 1000msなど）

## Deployment Considerations

### 1. 後方互換性

既存のAPIエンドポイント（`/api/public/properties/:propertyNumber/estimate-pdf`）は変更なし。内部実装のみ改善。

### 2. ロールバック

問題が発生した場合、`waitForCalculationCompletion()`の呼び出しを元の固定待機に戻すだけで対応可能：

```typescript
// ロールバック時
// await this.waitForCalculationCompletion(sheets, spreadsheetId, sheetName);
await new Promise(resolve => setTimeout(resolve, 2000));
```

### 3. モニタリング

以下のメトリクスを監視：
- PDF生成の成功率
- 平均計算待機時間
- タイムアウトエラーの発生頻度

## Summary

この設計により、概算書PDF生成機能は以下のように改善されます：

1. **確実性**: D11セルの値を検証することで、計算完了を確実に待機
2. **柔軟性**: ポーリング方式により、計算時間の変動に対応
3. **ユーザー体験**: 初回クリックから正しい金額が表示される
4. **保守性**: 環境変数で設定可能、ログの充実
5. **安全性**: タイムアウト処理により無限待機を防止
