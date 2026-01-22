# スプレッドシート設定 - 設計書

## アーキテクチャ概要

```
┌─────────────────┐
│   .env ファイル  │
│  PROPERTY_      │
│  LISTING_       │
│  SPREADSHEET_ID │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ SpreadsheetConfigService│
│  - validateConfig()     │
│  - getSpreadsheetId()   │
│  - testConnection()     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ GoogleSheetsClient      │
│  - connect()            │
│  - fetchData()          │
└─────────────────────────┘
```

## コンポーネント設計

### 1. 環境変数管理

#### 設定ファイル: `backend/.env`

```env
# Google Sheets設定
PROPERTY_LISTING_SPREADSHEET_ID=

# その他の既存設定
DATABASE_URL=...
SUPABASE_URL=...
```

### 2. 設定検証サービス

#### ファイル: `backend/src/services/SpreadsheetConfigValidator.ts`

```typescript
export class SpreadsheetConfigValidator {
  /**
   * スプレッドシートID設定を検証
   */
  static validateConfig(): ValidationResult {
    const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      return {
        valid: false,
        error: 'PROPERTY_LISTING_SPREADSHEET_ID が設定されていません'
      };
    }
    
    if (!this.isValidSpreadsheetId(spreadsheetId)) {
      return {
        valid: false,
        error: 'スプレッドシートIDの形式が不正です'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * スプレッドシートIDの形式を検証
   */
  private static isValidSpreadsheetId(id: string): boolean {
    // Google スプレッドシートIDは通常44文字の英数字とハイフン、アンダースコア
    return /^[a-zA-Z0-9_-]{20,}$/.test(id);
  }
  
  /**
   * スプレッドシートへの接続をテスト
   */
  static async testConnection(): Promise<ConnectionTestResult> {
    try {
      const client = new GoogleSheetsClient();
      await client.getSpreadsheetMetadata();
      
      return {
        success: true,
        message: 'スプレッドシートへの接続に成功しました'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### 3. 設定検証スクリプト

#### ファイル: `backend/verify-spreadsheet-config.ts`

```typescript
import { SpreadsheetConfigValidator } from './src/services/SpreadsheetConfigValidator';

async function main() {
  console.log('スプレッドシート設定を検証中...\n');
  
  // 1. 環境変数の検証
  const configResult = SpreadsheetConfigValidator.validateConfig();
  
  if (!configResult.valid) {
    console.error('❌ 設定エラー:', configResult.error);
    console.log('\n設定方法:');
    console.log('1. backend/.env ファイルを開く');
    console.log('2. 以下の行を追加:');
    console.log('   PROPERTY_LISTING_SPREADSHEET_ID=your_spreadsheet_id_here');
    console.log('3. スプレッドシートのURLから ID を取得して設定');
    process.exit(1);
  }
  
  console.log('✅ 環境変数の設定: OK');
  
  // 2. 接続テスト
  console.log('\nスプレッドシートへの接続をテスト中...');
  const connectionResult = await SpreadsheetConfigValidator.testConnection();
  
  if (!connectionResult.success) {
    console.error('❌ 接続エラー:', connectionResult.error);
    console.log('\n確認事項:');
    console.log('- スプレッドシートIDが正しいか');
    console.log('- Google Service Account の権限設定');
    console.log('- スプレッドシートの共有設定');
    process.exit(1);
  }
  
  console.log('✅ スプレッドシート接続: OK');
  console.log('\n✨ すべての設定が正常です！');
}

main();
```

## データフロー

### 設定読み込みフロー

```
1. アプリケーション起動
   ↓
2. .env ファイル読み込み
   ↓
3. PROPERTY_LISTING_SPREADSHEET_ID 取得
   ↓
4. 設定検証
   ↓
5. GoogleSheetsClient 初期化
   ↓
6. スプレッドシート接続
```

### エラーハンドリング

```typescript
// 設定未設定の場合
if (!process.env.PROPERTY_LISTING_SPREADSHEET_ID) {
  throw new ConfigurationError(
    'PROPERTY_LISTING_SPREADSHEET_ID が設定されていません。' +
    '.env ファイルを確認してください。'
  );
}

// 接続失敗の場合
try {
  await client.connect();
} catch (error) {
  if (error.code === 403) {
    throw new PermissionError(
      'スプレッドシートへのアクセス権限がありません。' +
      '共有設定を確認してください。'
    );
  }
  throw error;
}
```

## セキュリティ考慮事項

### 1. 環境変数の保護

- `.env` ファイルは `.gitignore` に含める
- 本番環境では環境変数として設定
- スプレッドシートIDは公開情報ではないが、アクセス制御が重要

### 2. アクセス制御

- Google Service Account の権限を最小限に
- スプレッドシートの共有設定を適切に管理
- 読み取り専用アクセスで十分な場合は書き込み権限を付与しない

## パフォーマンス考慮事項

### キャッシング戦略

```typescript
class SpreadsheetConfigCache {
  private static spreadsheetId: string | null = null;
  
  static getSpreadsheetId(): string {
    if (!this.spreadsheetId) {
      this.spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID;
      
      if (!this.spreadsheetId) {
        throw new ConfigurationError('スプレッドシートIDが設定されていません');
      }
    }
    
    return this.spreadsheetId;
  }
}
```

## テスト戦略

### 単体テスト

```typescript
describe('SpreadsheetConfigValidator', () => {
  it('有効なスプレッドシートIDを検証できる', () => {
    process.env.PROPERTY_LISTING_SPREADSHEET_ID = '1abc123def456ghi789jkl';
    const result = SpreadsheetConfigValidator.validateConfig();
    expect(result.valid).toBe(true);
  });
  
  it('未設定の場合はエラーを返す', () => {
    delete process.env.PROPERTY_LISTING_SPREADSHEET_ID;
    const result = SpreadsheetConfigValidator.validateConfig();
    expect(result.valid).toBe(false);
  });
});
```

## デプロイメント

### 開発環境

1. `backend/.env` ファイルに設定
2. `npm run verify-spreadsheet-config` で検証

### 本番環境

1. 環境変数として `PROPERTY_LISTING_SPREADSHEET_ID` を設定
2. デプロイ前に設定を検証
3. ヘルスチェックで接続を確認

## モニタリング

### ログ出力

```typescript
logger.info('スプレッドシート設定を読み込みました', {
  spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID?.substring(0, 10) + '...',
  configured: !!process.env.PROPERTY_LISTING_SPREADSHEET_ID
});
```

### アラート

- スプレッドシート接続失敗時にアラート
- 設定未設定の場合は起動時にエラー
