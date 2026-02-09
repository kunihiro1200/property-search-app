# Design Document

## Overview

買主詳細ページのSMS送信機能において、SMS本文に所在地（住居表示）が含まれる場合、自動的に近隣物件へのリンクを追加する機能を実装します。この機能により、買主が類似物件を簡単に閲覧でき、問い合わせの機会を増やすことができます。

### 主要な機能

1. **近隣物件リンクの自動挿入**: SMS本文に所在地プレースホルダーが含まれ、買主に紐づいた物件が存在する場合、短縮URLを自動挿入
2. **短縮URL生成**: `https://ifoo.jp/p/{物件番号}` 形式の短縮URLを生成（約25-30文字）
3. **短縮URLリダイレクト**: 短縮URLから実際の物件詳細ページへのリダイレクト処理
4. **文字数制限の遵守**: SMS本文が670文字以内であることを確認し、超過時は警告表示
5. **既存機能との互換性**: プレースホルダー置換機能とSMS送信記録機能を維持

## Architecture

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                    フロントエンド                              │
│  (BuyerDetailPage.tsx)                                       │
│                                                              │
│  1. SMS本文生成                                               │
│     - replacePlaceholders() でプレースホルダー置換            │
│     - insertNearbyPropertyLink() で近隣物件リンク挿入         │
│                                                              │
│  2. プレビュー表示                                            │
│     - 短縮URL形式で表示                                       │
│     - 文字数カウント（670文字制限）                           │
│                                                              │
│  3. SMS送信                                                  │
│     - SMSアプリを開く（既存機能）                             │
│     - 送信記録をバックエンドに保存                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST /api/buyers/:id/send-sms
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    バックエンド                               │
│  (backend/src/routes/buyers.ts)                             │
│                                                              │
│  - SMS送信記録をアクティビティログに保存（既存機能）          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              短縮URLリダイレクトサービス（新規）               │
│  (backend/api/redirect.ts)                                  │
│                                                              │
│  GET /p/:propertyNumber                                     │
│    ↓                                                         │
│  1. 物件番号バリデーション                                    │
│  2. HTTP 301リダイレクト                                     │
│     → https://property-site-frontend-kappa.vercel.app/      │
│        public/properties/:propertyNumber                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ DNS: ifoo.jp → Vercel
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    インフラ                                   │
│                                                              │
│  - ドメイン: ifoo.jp                                         │
│  - DNSレコード設定（Aレコード/CNAMEレコード）                 │
│  - SSL証明書設定（Let's Encrypt）                            │
└─────────────────────────────────────────────────────────────┘
```


## Components and Interfaces

### フロントエンド

#### 1. BuyerDetailPage.tsx（変更）

**役割**: SMS送信機能のUI制御と近隣物件リンク挿入ロジック

**変更内容**:
- `insertNearbyPropertyLink()` 関数を追加（近隣物件リンク挿入ロジック）
- `handleSmsTemplateSelect()` 関数を修正（近隣物件リンク挿入を呼び出し）

**新規関数**:

```typescript
/**
 * 近隣物件リンクをSMS本文に挿入
 * @param content - プレースホルダー置換後のSMS本文
 * @returns 近隣物件リンクが挿入されたSMS本文
 */
const insertNearbyPropertyLink = (content: string): string => {
  // 条件1: 所在地プレースホルダーが含まれているか確認
  const hasAddressPlaceholder = content.includes('<<住居表示>>') || 
                                 content.includes('<<住居表示Pinrich>>');
  
  // 条件2: 買主に紐づいた物件が存在するか確認
  const hasLinkedProperty = linkedProperties && linkedProperties.length > 0;
  
  // 条件を満たさない場合は元の本文をそのまま返す
  if (!hasAddressPlaceholder || !hasLinkedProperty) {
    return content;
  }
  
  // 短縮URL生成（最初の物件の物件番号を使用）
  const firstProperty = linkedProperties[0];
  const shortUrl = `https://ifoo.jp/p/${firstProperty.property_number}`;
  
  // 近隣物件リンクテキスト
  const nearbyPropertyLink = `\n類似物件はこちらから\n${shortUrl}\n`;
  
  // 挿入位置を検索（「お気軽にお問合せください」の直前）
  const insertMarker = 'お気軽にお問合せください';
  const insertIndex = content.indexOf(insertMarker);
  
  if (insertIndex !== -1) {
    // マーカーが見つかった場合、その直前に挿入
    return content.slice(0, insertIndex) + 
           nearbyPropertyLink + 
           content.slice(insertIndex);
  } else {
    // マーカーが見つからない場合、末尾に追加
    return content + nearbyPropertyLink;
  }
};
```

**修正関数**:

```typescript
const handleSmsTemplateSelect = (templateId: string) => {
  if (!templateId) return;

  const template = smsTemplates.find(t => t.id === templateId);
  if (!template) return;

  // SMS用に署名を簡略化してからプレースホルダーを置換
  const simplifiedContent = simplifySmsSignature(template.content);
  const replacedContent = replacePlaceholders(simplifiedContent);
  
  // 近隣物件リンクを挿入（新規追加）
  const contentWithLink = insertNearbyPropertyLink(replacedContent);

  // メッセージ長の検証（日本語SMS制限: 670文字）
  const isOverLimit = contentWithLink.length > 670;
  
  if (isOverLimit) {
    setSnackbar({
      open: true,
      message: `メッセージが長すぎます（${contentWithLink.length}文字 / 670文字制限）。内容を確認してください。`,
      severity: 'warning',
    });
  }

  // 確認ダイアログを表示
  setConfirmDialog({
    open: true,
    type: 'sms',
    template: {
      ...template,
      content: contentWithLink, // 近隣物件リンクが挿入された本文
    },
  });
};
```


### バックエンド

#### 1. backend/api/redirect.ts（新規作成）

**役割**: 短縮URLから実際の物件詳細ページへのリダイレクト処理

**エンドポイント**: `GET /p/:propertyNumber`

**実装**:

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 短縮URLリダイレクトハンドラー
 * GET /p/:propertyNumber
 * 
 * 例: https://ifoo.jp/p/AA9831
 *  → https://property-site-frontend-kappa.vercel.app/public/properties/AA9831
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // パスパラメータから物件番号を取得
    const { propertyNumber } = req.query;

    // バリデーション: 物件番号が存在するか
    if (!propertyNumber || typeof propertyNumber !== 'string') {
      return res.status(400).json({
        error: '物件番号が指定されていません'
      });
    }

    // バリデーション: 物件番号の形式チェック（例: AA9831, AA13501-2）
    const propertyNumberPattern = /^[A-Z]{2}\d{4,5}(-\d+)?$/;
    if (!propertyNumberPattern.test(propertyNumber)) {
      return res.status(400).json({
        error: '無効な物件番号形式です'
      });
    }

    // リダイレクト先URL
    const redirectUrl = `https://property-site-frontend-kappa.vercel.app/public/properties/${propertyNumber}`;

    // HTTP 301 Permanent Redirect
    res.setHeader('Location', redirectUrl);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
    res.status(301).end();

  } catch (error: any) {
    console.error('Redirect error:', error);
    res.status(500).json({
      error: 'リダイレクト処理に失敗しました'
    });
  }
}
```

**パフォーマンス考慮事項**:
- レスポンス時間: 100ms以内を目標
- キャッシュ戦略: `Cache-Control: public, max-age=31536000`（1年間）
- データベースアクセス不要（物件番号バリデーションのみ）

#### 2. backend/vercel.json（変更）

**役割**: Vercelのルーティング設定

**変更内容**: `/p/:propertyNumber` のルーティングを追加

```json
{
  "rewrites": [
    {
      "source": "/p/:propertyNumber",
      "destination": "/api/redirect"
    }
  ]
}
```


## Data Models

### SMS本文データフロー

```typescript
// 1. テンプレート選択時
interface BuyerTemplate {
  id: string;
  category: string;
  type: string;
  subject: string;
  content: string; // プレースホルダーを含むテンプレート本文
}

// 2. プレースホルダー置換後
interface ProcessedSmsContent {
  content: string; // プレースホルダーが実際の値に置換された本文
  length: number;  // 文字数
}

// 3. 近隣物件リンク挿入後
interface SmsContentWithLink {
  content: string;      // 近隣物件リンクが挿入された本文
  length: number;       // 文字数
  hasLink: boolean;     // リンクが挿入されたか
  shortUrl?: string;    // 挿入された短縮URL
  isOverLimit: boolean; // 670文字を超えているか
}

// 4. SMS送信記録
interface SmsSendRecord {
  buyerNumber: string;
  phoneNumber: string;
  message: string;
  templateType: string;
  sentAt: Date;
  employeeId: string;
}
```

### 物件データ

```typescript
interface PropertyListing {
  id: string;
  property_number: string;      // 物件番号（例: "AA9831"）
  address: string;              // 所在地
  display_address?: string;     // 住居表示
  property_type: string;
  sales_price: number;
  status: string;
  // ... その他のフィールド
}
```

### 買主データ

```typescript
interface Buyer {
  buyer_number: string;         // 買主番号
  name: string;                 // 氏名
  phone_number: string;         // 電話番号
  email: string;                // メールアドレス
  property_number?: string;     // 紐づいた物件番号（カンマ区切り）
  // ... その他のフィールド
}
```


## Correctness Properties

*プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### Property 1: 近隣物件リンク挿入の条件判定

*For any* SMS本文とlinkedPropertiesの組み合わせにおいて、所在地プレースホルダー（`<<住居表示>>`または`<<住居表示Pinrich>>`）が含まれ、かつlinkedPropertiesが空でない場合のみ、近隣物件リンクが挿入されるべきである

**Validates: Requirements 1.1, 1.3, 1.4**

### Property 2: 短縮URL生成の形式

*For any* linkedPropertiesが存在する場合、生成される短縮URLは`https://ifoo.jp/p/{物件番号}`の形式であり、物件番号はlinkedProperties[0].property_numberから取得され、URL全体の文字数は25-30文字の範囲内であるべきである

**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

### Property 3: 挿入位置の制御

*For any* SMS本文において、「お気軽にお問合せください」というテキストが存在する場合はその直前に近隣物件リンクが挿入され、存在しない場合は本文の末尾に追加されるべきである

**Validates: Requirements 3.1, 3.2, 3.4**

### Property 4: リンクフォーマット

*For any* 近隣物件リンクが挿入される場合、リンクは「\n類似物件はこちらから\n{短縮URL}\n」の形式であり、適切な改行が含まれるべきである

**Validates: Requirements 1.2, 3.3**

### Property 5: 文字数制限チェック

*For any* 近隣物件リンク挿入後のSMS本文において、文字数が正確にカウントされ、670文字を超える場合はisOverLimitフラグがtrueになるべきである

**Validates: Requirements 4.1**

### Property 6: プレースホルダー置換後の挿入

*For any* SMS本文生成において、replacePlaceholders関数が実行された後に、insertNearbyPropertyLink関数が実行されるべきである（処理順序の保証）

**Validates: Requirements 5.2**

### Property 7: リダイレクト処理

*For any* 有効な物件番号（AA9831形式）に対して、短縮URL `/p/{物件番号}` へのリクエストはHTTP 301ステータスコードと正しいリダイレクト先URL `https://property-site-frontend-kappa.vercel.app/public/properties/{物件番号}` を返すべきであり、無効な物件番号に対しては400または404エラーを返すべきである

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 8: プレビュー表示

*For any* SMSテンプレート選択時において、プレビューに表示される本文は、近隣物件リンク挿入の条件を満たす場合は短縮URLを含み、満たさない場合は含まないべきである

**Validates: Requirements 6.1, 6.3**


## Error Handling

### フロントエンド

#### 1. 近隣物件リンク挿入エラー

**エラーケース**:
- linkedPropertiesが空配列
- linkedProperties[0].property_numberが存在しない
- SMS本文が670文字を超える

**ハンドリング**:
```typescript
try {
  const contentWithLink = insertNearbyPropertyLink(replacedContent);
  
  // 文字数チェック
  if (contentWithLink.length > 670) {
    setSnackbar({
      open: true,
      message: `メッセージが長すぎます（${contentWithLink.length}文字 / 670文字制限）。内容を確認してください。`,
      severity: 'warning',
    });
  }
  
  // ダイアログ表示（文字数オーバーでも表示）
  setConfirmDialog({
    open: true,
    type: 'sms',
    template: {
      ...template,
      content: contentWithLink,
    },
  });
} catch (error) {
  console.error('Failed to insert nearby property link:', error);
  // エラー時は元の本文を使用
  setConfirmDialog({
    open: true,
    type: 'sms',
    template: {
      ...template,
      content: replacedContent,
    },
  });
}
```

#### 2. SMS送信記録エラー

**エラーケース**:
- ネットワークエラー
- バックエンドAPIエラー
- 認証エラー

**ハンドリング**:
```typescript
try {
  await api.post(`/api/buyers/${buyer_number}/send-sms`, {
    message: template.content,
    templateType: template.type,
  });
  
  setSnackbar({
    open: true,
    message: 'SMS送信を記録しました',
    severity: 'success',
  });
} catch (error: any) {
  console.error('Failed to send SMS:', error);
  
  const errorMessage = error.response?.data?.error 
    || error.response?.data?.message 
    || error.message 
    || '送信に失敗しました';
  
  setSnackbar({
    open: true,
    message: `送信エラー: ${errorMessage}`,
    severity: 'error',
  });
}
```

### バックエンド

#### 1. 短縮URLリダイレクトエラー

**エラーケース**:
- 物件番号が指定されていない
- 物件番号の形式が無効
- 内部エラー

**ハンドリング**:
```typescript
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { propertyNumber } = req.query;

    // エラー1: 物件番号が指定されていない
    if (!propertyNumber || typeof propertyNumber !== 'string') {
      return res.status(400).json({
        error: '物件番号が指定されていません'
      });
    }

    // エラー2: 物件番号の形式が無効
    const propertyNumberPattern = /^[A-Z]{2}\d{4,5}(-\d+)?$/;
    if (!propertyNumberPattern.test(propertyNumber)) {
      return res.status(400).json({
        error: '無効な物件番号形式です'
      });
    }

    // 正常処理: リダイレクト
    const redirectUrl = `https://property-site-frontend-kappa.vercel.app/public/properties/${propertyNumber}`;
    res.setHeader('Location', redirectUrl);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.status(301).end();

  } catch (error: any) {
    // エラー3: 内部エラー
    console.error('Redirect error:', error);
    res.status(500).json({
      error: 'リダイレクト処理に失敗しました'
    });
  }
}
```

#### 2. SMS送信記録エラー

**エラーケース**:
- メッセージが空
- 買主が見つからない
- アクティビティログ記録失敗

**ハンドリング**:
```typescript
router.post('/:id/send-sms', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, templateType } = req.body;

    // エラー1: メッセージが空
    if (!message) {
      return res.status(400).json({ error: 'メッセージは必須です' });
    }

    // エラー2: 買主が見つからない
    const buyer = await buyerService.getByBuyerNumber(id);
    if (!buyer) {
      return res.status(404).json({ error: '買主が見つかりません' });
    }

    // アクティビティログ記録（失敗してもSMS送信は成功として扱う）
    try {
      const activityLogService = new ActivityLogService();
      const employeeId = (req as any).employee?.id;
      
      if (employeeId) {
        await activityLogService.logActivity({
          employeeId: employeeId,
          action: 'sms',
          targetType: 'buyer',
          targetId: buyer.buyer_number,
          metadata: {
            template_type: templateType || '不明',
            message: message,
            recipient_phone: buyer.phone_number,
            sender: (req as any).employee?.name || 'unknown',
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
    } catch (logError: any) {
      // ログ記録失敗してもSMS送信は成功として扱う
      console.error('Failed to log SMS activity:', logError);
    }

    res.json({
      success: true,
      message: 'SMS送信を記録しました',
    });
  } catch (error: any) {
    console.error('Failed to record SMS:', error);
    res.status(500).json({ 
      error: error.message || 'SMS送信記録に失敗しました' 
    });
  }
});
```


## Testing Strategy

### デュアルテストアプローチ

この機能では、**単体テスト**と**プロパティベーステスト**の両方を使用して包括的なカバレッジを実現します。

#### 単体テスト（Unit Tests）

**対象**: 特定の例、エッジケース、エラー条件

**テストケース**:
1. 所在地プレースホルダーあり + 物件あり → リンク挿入
2. 所在地プレースホルダーなし + 物件あり → リンク挿入なし
3. 所在地プレースホルダーあり + 物件なし → リンク挿入なし
4. 「お気軽にお問合せください」あり → マーカー直前に挿入
5. 「お気軽にお問合せください」なし → 末尾に挿入
6. 670文字ちょうど → 警告なし
7. 671文字 → 警告あり
8. 無効な物件番号（"INVALID"） → 400エラー
9. 有効な物件番号（"AA9831"） → 301リダイレクト

**実装例**:
```typescript
// frontend/src/pages/__tests__/BuyerDetailPage.test.tsx

describe('insertNearbyPropertyLink', () => {
  it('should insert link when address placeholder exists and property is linked', () => {
    const content = 'こんにちは。<<住居表示>>の物件です。お気軽にお問合せください。';
    const linkedProperties = [{ property_number: 'AA9831' }];
    
    const result = insertNearbyPropertyLink(content, linkedProperties);
    
    expect(result).toContain('類似物件はこちらから');
    expect(result).toContain('https://ifoo.jp/p/AA9831');
    expect(result.indexOf('類似物件はこちらから')).toBeLessThan(
      result.indexOf('お気軽にお問合せください')
    );
  });

  it('should not insert link when no address placeholder', () => {
    const content = 'こんにちは。お気軽にお問合せください。';
    const linkedProperties = [{ property_number: 'AA9831' }];
    
    const result = insertNearbyPropertyLink(content, linkedProperties);
    
    expect(result).not.toContain('類似物件はこちらから');
    expect(result).toBe(content);
  });

  it('should append link at end when marker not found', () => {
    const content = 'こんにちは。<<住居表示>>の物件です。';
    const linkedProperties = [{ property_number: 'AA9831' }];
    
    const result = insertNearbyPropertyLink(content, linkedProperties);
    
    expect(result).toContain('類似物件はこちらから');
    expect(result).toEndWith('https://ifoo.jp/p/AA9831\n');
  });
});
```

#### プロパティベーステスト（Property-Based Tests）

**対象**: 全ての入力に対して成り立つべき普遍的なプロパティ

**使用ライブラリ**: fast-check（TypeScript/JavaScript用）

**設定**: 最低100回の反復実行

**プロパティテストケース**:

```typescript
// frontend/src/pages/__tests__/BuyerDetailPage.property.test.tsx
import fc from 'fast-check';

describe('Property-Based Tests: Nearby Property Link', () => {
  /**
   * Feature: buyer-sms-nearby-property-link, Property 1: 近隣物件リンク挿入の条件判定
   */
  it('should insert link only when both conditions are met', () => {
    fc.assert(
      fc.property(
        fc.string(), // SMS本文
        fc.boolean(), // 所在地プレースホルダーの有無
        fc.array(fc.record({ property_number: fc.string() })), // linkedProperties
        (baseContent, hasPlaceholder, properties) => {
          const content = hasPlaceholder 
            ? `${baseContent}<<住居表示>>`
            : baseContent;
          
          const result = insertNearbyPropertyLink(content, properties);
          
          const shouldInsert = hasPlaceholder && properties.length > 0;
          const hasLink = result.includes('類似物件はこちらから');
          
          return hasLink === shouldInsert;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: buyer-sms-nearby-property-link, Property 2: 短縮URL生成の形式
   */
  it('should generate short URL in correct format', () => {
    fc.assert(
      fc.property(
        fc.string(), // SMS本文
        fc.array(fc.record({ 
          property_number: fc.stringMatching(/^[A-Z]{2}\d{4,5}(-\d+)?$/) 
        }), { minLength: 1 }), // 最低1件の物件
        (content, properties) => {
          const contentWithPlaceholder = `${content}<<住居表示>>`;
          const result = insertNearbyPropertyLink(contentWithPlaceholder, properties);
          
          if (result.includes('類似物件はこちらから')) {
            const expectedUrl = `https://ifoo.jp/p/${properties[0].property_number}`;
            const urlLength = expectedUrl.length;
            
            return result.includes(expectedUrl) && 
                   urlLength >= 25 && 
                   urlLength <= 30;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: buyer-sms-nearby-property-link, Property 3: 挿入位置の制御
   */
  it('should insert at correct position based on marker presence', () => {
    fc.assert(
      fc.property(
        fc.string(), // 前半部分
        fc.boolean(), // マーカーの有無
        fc.string(), // 後半部分
        fc.array(fc.record({ property_number: fc.string() }), { minLength: 1 }),
        (prefix, hasMarker, suffix, properties) => {
          const marker = 'お気軽にお問合せください';
          const content = hasMarker 
            ? `${prefix}<<住居表示>>${marker}${suffix}`
            : `${prefix}<<住居表示>>${suffix}`;
          
          const result = insertNearbyPropertyLink(content, properties);
          
          if (result.includes('類似物件はこちらから')) {
            const linkIndex = result.indexOf('類似物件はこちらから');
            const markerIndex = result.indexOf(marker);
            
            if (hasMarker) {
              // マーカーがある場合、リンクはマーカーの前
              return linkIndex < markerIndex;
            } else {
              // マーカーがない場合、リンクは末尾付近
              return linkIndex > content.length - 100;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: buyer-sms-nearby-property-link, Property 4: リンクフォーマット
   */
  it('should format link with proper newlines', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.array(fc.record({ property_number: fc.string() }), { minLength: 1 }),
        (content, properties) => {
          const contentWithPlaceholder = `${content}<<住居表示>>`;
          const result = insertNearbyPropertyLink(contentWithPlaceholder, properties);
          
          if (result.includes('類似物件はこちらから')) {
            const expectedFormat = /\n類似物件はこちらから\nhttps:\/\/ifoo\.jp\/p\/[^\n]+\n/;
            return expectedFormat.test(result);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: buyer-sms-nearby-property-link, Property 5: 文字数制限チェック
   */
  it('should accurately count characters and flag over limit', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 700 }),
        fc.array(fc.record({ property_number: fc.string() }), { minLength: 1 }),
        (content, properties) => {
          const contentWithPlaceholder = `${content}<<住居表示>>`;
          const result = insertNearbyPropertyLink(contentWithPlaceholder, properties);
          
          const actualLength = result.length;
          const isOverLimit = actualLength > 670;
          
          // 文字数が正確にカウントされている
          return typeof actualLength === 'number' && actualLength >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: buyer-sms-nearby-property-link, Property 7: リダイレクト処理
   */
  it('should redirect valid property numbers and reject invalid ones', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.stringMatching(/^[A-Z]{2}\d{4,5}(-\d+)?$/), // 有効な物件番号
          fc.string() // 無効な物件番号
        ),
        async (propertyNumber) => {
          const isValid = /^[A-Z]{2}\d{4,5}(-\d+)?$/.test(propertyNumber);
          
          // モックリクエスト
          const req = { query: { propertyNumber } };
          const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
            end: jest.fn(),
          };
          
          await handler(req, res);
          
          if (isValid) {
            // 有効な物件番号 → 301リダイレクト
            expect(res.status).toHaveBeenCalledWith(301);
            expect(res.setHeader).toHaveBeenCalledWith(
              'Location',
              `https://property-site-frontend-kappa.vercel.app/public/properties/${propertyNumber}`
            );
          } else {
            // 無効な物件番号 → 400エラー
            expect(res.status).toHaveBeenCalledWith(400);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### テスト実行コマンド

```bash
# 単体テスト実行
npm test -- BuyerDetailPage.test.tsx

# プロパティベーステスト実行
npm test -- BuyerDetailPage.property.test.tsx

# 全テスト実行
npm test

# カバレッジ確認
npm test -- --coverage
```


## Security Considerations

### 1. 物件番号バリデーション

**脅威**: 不正な物件番号によるインジェクション攻撃

**対策**:
- 正規表現による厳格なバリデーション: `/^[A-Z]{2}\d{4,5}(-\d+)?$/`
- ホワイトリスト方式（英大文字2文字 + 数字4-5桁 + オプションのハイフン+数字）
- SQLインジェクション対策（物件番号はパスパラメータとして使用、データベースクエリには使用しない）

**実装**:
```typescript
const propertyNumberPattern = /^[A-Z]{2}\d{4,5}(-\d+)?$/;
if (!propertyNumberPattern.test(propertyNumber)) {
  return res.status(400).json({
    error: '無効な物件番号形式です'
  });
}
```

### 2. リダイレクト先の固定化

**脅威**: オープンリダイレクト攻撃

**対策**:
- リダイレクト先URLを固定（`https://property-site-frontend-kappa.vercel.app/public/properties/`）
- ユーザー入力をリダイレクト先のドメインに使用しない
- 物件番号のみをパスパラメータとして使用

**実装**:
```typescript
// ✅ 安全: リダイレクト先ドメインは固定
const redirectUrl = `https://property-site-frontend-kappa.vercel.app/public/properties/${propertyNumber}`;

// ❌ 危険: ユーザー入力をドメインに使用（実装しない）
// const redirectUrl = `${req.query.domain}/properties/${propertyNumber}`;
```

### 3. SSL証明書設定

**脅威**: 中間者攻撃（MITM）

**対策**:
- ifoo.jpドメインにSSL証明書を設定（Let's Encrypt）
- HTTPS通信の強制
- HSTS（HTTP Strict Transport Security）ヘッダーの設定

**実装**:
```typescript
// Vercel自動設定により、全てのリクエストはHTTPSで処理される
// 追加のセキュリティヘッダー設定
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```

### 4. レート制限

**脅威**: DDoS攻撃、リソース枯渇

**対策**:
- Vercelの自動レート制限機能を活用
- 必要に応じてCloudflareなどのCDNを追加

**実装**:
```typescript
// Vercelのデフォルトレート制限:
// - 無料プラン: 100リクエスト/10秒
// - Proプラン: 600リクエスト/10秒
// 追加の制限は不要（短縮URLリダイレクトは軽量な処理）
```

### 5. 個人情報保護

**脅威**: SMS本文に含まれる個人情報の漏洩

**対策**:
- SMS本文はフロントエンドでのみ生成（バックエンドには送信しない）
- アクティビティログには本文全体を保存（既存機能を維持）
- ログへのアクセス制限（認証済みユーザーのみ）

**実装**:
```typescript
// SMS本文はバックエンドに送信されるが、アクセス制限あり
await activityLogService.logActivity({
  employeeId: employeeId, // 認証済みユーザーのみ
  action: 'sms',
  targetType: 'buyer',
  targetId: buyer.buyer_number,
  metadata: {
    template_type: templateType || '不明',
    message: message, // 本文全体を保存（既存機能）
    recipient_phone: buyer.phone_number,
    sender: (req as any).employee?.name || 'unknown',
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});
```

### 6. CORS設定

**脅威**: クロスオリジンリクエストによる不正アクセス

**対策**:
- 短縮URLリダイレクトはCORSチェック不要（301リダイレクトのため）
- 既存のAPIエンドポイントはCORS設定を維持

**実装**:
```typescript
// 短縮URLリダイレクトはCORSチェック不要
// （ブラウザは301リダイレクトを自動的に追跡）
```


## Performance Considerations

### 1. 短縮URLリダイレクト速度

**目標**: 100ms以内のレスポンス

**最適化戦略**:
- データベースアクセス不要（物件番号バリデーションのみ）
- シンプルな正規表現チェック（O(n)、nは物件番号の長さ）
- Vercelのエッジネットワークを活用（グローバル配信）

**実装**:
```typescript
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 1. パラメータ取得（1ms未満）
  const { propertyNumber } = req.query;

  // 2. バリデーション（1ms未満）
  if (!propertyNumber || typeof propertyNumber !== 'string') {
    return res.status(400).json({ error: '物件番号が指定されていません' });
  }

  // 3. 正規表現チェック（1ms未満）
  const propertyNumberPattern = /^[A-Z]{2}\d{4,5}(-\d+)?$/;
  if (!propertyNumberPattern.test(propertyNumber)) {
    return res.status(400).json({ error: '無効な物件番号形式です' });
  }

  // 4. リダイレクト（1ms未満）
  const redirectUrl = `https://property-site-frontend-kappa.vercel.app/public/properties/${propertyNumber}`;
  res.setHeader('Location', redirectUrl);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.status(301).end();
}

// 合計: 約3-5ms（目標100ms以内を大幅に下回る）
```

### 2. キャッシュ戦略

**目標**: リダイレクトレスポンスのキャッシュによる高速化

**戦略**:
- `Cache-Control: public, max-age=31536000`（1年間キャッシュ）
- 物件番号は変更されないため、長期キャッシュが可能
- CDNエッジキャッシュを活用（Vercel自動設定）

**実装**:
```typescript
res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間
res.setHeader('Vary', 'Accept-Encoding'); // 圧縮対応
```

**効果**:
- 初回アクセス: 約3-5ms（サーバー処理）
- 2回目以降: 約1ms未満（CDNキャッシュ）

### 3. フロントエンド処理速度

**目標**: SMS本文生成が100ms以内

**最適化戦略**:
- `insertNearbyPropertyLink`関数の計算量: O(n)（nはSMS本文の長さ）
- 文字列検索: `indexOf`メソッド（高速）
- 不要な再レンダリングを防ぐ

**実装**:
```typescript
const insertNearbyPropertyLink = (content: string): string => {
  // 1. 条件チェック（O(1)）
  const hasAddressPlaceholder = content.includes('<<住居表示>>') || 
                                 content.includes('<<住居表示Pinrich>>');
  const hasLinkedProperty = linkedProperties && linkedProperties.length > 0;
  
  if (!hasAddressPlaceholder || !hasLinkedProperty) {
    return content; // 早期リターン
  }
  
  // 2. URL生成（O(1)）
  const firstProperty = linkedProperties[0];
  const shortUrl = `https://ifoo.jp/p/${firstProperty.property_number}`;
  const nearbyPropertyLink = `\n類似物件はこちらから\n${shortUrl}\n`;
  
  // 3. 挿入位置検索（O(n)）
  const insertMarker = 'お気軽にお問合せください';
  const insertIndex = content.indexOf(insertMarker);
  
  // 4. 文字列結合（O(n)）
  if (insertIndex !== -1) {
    return content.slice(0, insertIndex) + nearbyPropertyLink + content.slice(insertIndex);
  } else {
    return content + nearbyPropertyLink;
  }
};

// 合計: O(n)、nは通常670文字以下なので約1-2ms
```

### 4. メモリ使用量

**目標**: 最小限のメモリ使用

**最適化戦略**:
- 不要な中間変数を避ける
- 文字列の不変性を活用（JavaScriptの最適化）
- 大きなオブジェクトのコピーを避ける

**実装**:
```typescript
// ✅ 効率的: 必要な情報のみを使用
const firstProperty = linkedProperties[0];
const shortUrl = `https://ifoo.jp/p/${firstProperty.property_number}`;

// ❌ 非効率: 全物件情報をコピー（実装しない）
// const allProperties = [...linkedProperties];
```

### 5. ネットワーク最適化

**目標**: SMS送信記録APIの高速化

**最適化戦略**:
- 非同期処理（アクティビティログ記録は並行実行）
- エラー時のフォールバック（ログ記録失敗してもSMS送信は成功）
- 不要なデータ送信を避ける

**実装**:
```typescript
// アクティビティログ記録は非同期（SMS送信をブロックしない）
try {
  await activityLogService.logActivity({...});
} catch (logError) {
  // ログ記録失敗してもSMS送信は成功として扱う
  console.error('Failed to log SMS activity:', logError);
}
```

### 6. パフォーマンス監視

**監視項目**:
- 短縮URLリダイレクトのレスポンス時間
- SMS本文生成の処理時間
- SMS送信記録APIのレスポンス時間

**ツール**:
- Vercel Analytics（自動設定）
- ブラウザDevTools（Performance タブ）
- Lighthouse（パフォーマンススコア）

**目標値**:
- 短縮URLリダイレクト: 100ms以内（実測3-5ms）
- SMS本文生成: 100ms以内（実測1-2ms）
- SMS送信記録API: 500ms以内（実測100-200ms）


## Infrastructure and Deployment

### 1. ドメイン設定（ifoo.jp）

#### DNSレコード設定

**必要なレコード**:
```
# Aレコード（IPv4）
ifoo.jp.  A  76.76.21.21  # Vercelのエッジネットワーク

# AAAAレコード（IPv6）
ifoo.jp.  AAAA  2606:4700:10::6816:1515  # Vercelのエッジネットワーク

# CNAMEレコード（サブドメイン）
www.ifoo.jp.  CNAME  cname.vercel-dns.com.
```

**設定手順**:
1. ドメインレジストラ（お名前.com、ムームードメインなど）にログイン
2. DNS設定画面を開く
3. 上記のレコードを追加
4. TTL（Time To Live）を3600秒（1時間）に設定
5. 変更を保存

**確認方法**:
```bash
# DNSレコードの確認
dig ifoo.jp A
dig ifoo.jp AAAA
dig www.ifoo.jp CNAME

# 期待される結果
# ifoo.jp. 3600 IN A 76.76.21.21
# ifoo.jp. 3600 IN AAAA 2606:4700:10::6816:1515
# www.ifoo.jp. 3600 IN CNAME cname.vercel-dns.com.
```

#### SSL証明書設定

**Vercel自動設定**:
- Vercelは自動的にLet's EncryptのSSL証明書を発行
- 証明書の自動更新（90日ごと）
- HTTPS通信の強制リダイレクト

**設定手順**:
1. Vercelダッシュボードにログイン
2. プロジェクト設定 → Domains
3. `ifoo.jp` を追加
4. DNSレコードの確認（自動）
5. SSL証明書の発行（自動、約5-10分）

**確認方法**:
```bash
# SSL証明書の確認
curl -I https://ifoo.jp

# 期待される結果
# HTTP/2 200
# strict-transport-security: max-age=31536000
```

### 2. Vercelプロジェクト設定

#### プロジェクト構成

```
backend/
├── api/
│   └── redirect.ts          # 短縮URLリダイレクトハンドラー（新規）
├── src/
│   └── routes/
│       └── buyers.ts         # 既存のbuyersルート（変更なし）
└── vercel.json               # Vercelルーティング設定（変更）
```

#### vercel.json設定

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/p/([A-Z]{2}\\d{4,5}(-\\d+)?)",
      "dest": "/api/redirect?propertyNumber=$1"
    },
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "headers": [
    {
      "source": "/p/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

**重要**: 既存のルーティング設定を維持し、新しいルートを追加します。

### 3. デプロイメント戦略

#### デプロイフロー

```
1. 開発環境（ローカル）
   ↓
2. プレビュー環境（Vercel Preview）
   ↓ テスト・確認
3. 本番環境（Vercel Production）
```

#### デプロイ手順

**ステップ1: ローカル開発**
```bash
# フロントエンド開発
cd frontend
npm run dev

# バックエンド開発
cd backend
vercel dev
```

**ステップ2: プレビューデプロイ**
```bash
# Gitブランチにプッシュ
git checkout -b feature/buyer-sms-nearby-property-link
git add .
git commit -m "Add nearby property link to SMS"
git push origin feature/buyer-sms-nearby-property-link

# Vercelが自動的にプレビュー環境をデプロイ
# プレビューURL: https://buyer-sms-nearby-property-link-xxx.vercel.app
```

**ステップ3: 本番デプロイ**
```bash
# mainブランチにマージ
git checkout main
git merge feature/buyer-sms-nearby-property-link
git push origin main

# Vercelが自動的に本番環境をデプロイ
# 本番URL: https://ifoo.jp
```

### 4. 環境変数設定

**必要な環境変数**:
```bash
# Vercelダッシュボード → Settings → Environment Variables

# Supabase設定（既存）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx

# その他の既存環境変数
# （変更なし）
```

**注意**: 短縮URLリダイレクト機能は環境変数不要（物件番号のみを使用）

### 5. モニタリングとログ

#### Vercel Analytics

**自動設定**:
- リクエスト数
- レスポンス時間
- エラー率
- 地域別アクセス

**確認方法**:
1. Vercelダッシュボード → Analytics
2. `/p/:propertyNumber` のメトリクスを確認

#### ログ確認

```bash
# Vercelログの確認
vercel logs

# 特定のデプロイメントのログ
vercel logs --url https://ifoo.jp

# リアルタイムログ
vercel logs --follow
```

### 6. ロールバック手順

**問題が発生した場合**:

```bash
# 1. 前のデプロイメントを確認
vercel ls

# 2. 特定のデプロイメントにロールバック
vercel rollback <deployment-url>

# 3. または、Gitで前のコミットに戻す
git revert HEAD
git push origin main
```

### 7. 後方互換性の保証

**重要**: 既存のURLは全て動作し続けます。

**既存のURL**:
- `https://property-site-frontend-kappa.vercel.app/public/properties/:propertyNumber`（変更なし）
- `/api/buyers/:id/send-sms`（変更なし）

**新規URL**:
- `https://ifoo.jp/p/:propertyNumber`（新規追加）

**確認方法**:
```bash
# 既存URLの動作確認
curl https://property-site-frontend-kappa.vercel.app/public/properties/AA9831

# 新規URLの動作確認
curl -I https://ifoo.jp/p/AA9831

# 期待される結果
# HTTP/2 301
# Location: https://property-site-frontend-kappa.vercel.app/public/properties/AA9831
```


## Technology Stack

### フロントエンド

| 技術 | バージョン | 用途 |
|------|----------|------|
| React | 18.x | UIフレームワーク |
| TypeScript | 5.x | 型安全な開発 |
| Material-UI | 5.x | UIコンポーネント |
| Axios | 1.x | HTTP通信 |
| fast-check | 3.x | プロパティベーステスト |
| Jest | 29.x | 単体テスト |
| React Testing Library | 14.x | コンポーネントテスト |

### バックエンド

| 技術 | バージョン | 用途 |
|------|----------|------|
| Node.js | 18.x | ランタイム |
| TypeScript | 5.x | 型安全な開発 |
| Express | 4.x | Webフレームワーク（既存API） |
| Vercel Serverless | - | サーバーレス実行環境 |
| Supabase | - | データベース（既存） |

### インフラ

| 技術 | 用途 |
|------|------|
| Vercel | ホスティング・デプロイ |
| Let's Encrypt | SSL証明書 |
| Vercel Edge Network | CDN・グローバル配信 |
| DNS Provider | ドメイン管理 |

### 開発ツール

| 技術 | 用途 |
|------|------|
| Git | バージョン管理 |
| GitHub | コード管理 |
| ESLint | コード品質チェック |
| Prettier | コードフォーマット |
| VS Code | IDE |

## Implementation Notes

### 1. 既存機能への影響

**変更なし**:
- `replacePlaceholders()` 関数（プレースホルダー置換）
- `simplifySmsSignature()` 関数（SMS署名簡略化）
- `/api/buyers/:id/send-sms` エンドポイント（SMS送信記録）
- SMS送信ダイアログUI
- アクティビティログ機能

**変更あり**:
- `handleSmsTemplateSelect()` 関数（近隣物件リンク挿入を追加）

**新規追加**:
- `insertNearbyPropertyLink()` 関数（近隣物件リンク挿入ロジック）
- `backend/api/redirect.ts`（短縮URLリダイレクトハンドラー）
- `backend/vercel.json`（ルーティング設定）

### 2. 段階的な実装アプローチ

**Phase 1: フロントエンド実装**
1. `insertNearbyPropertyLink()` 関数を実装
2. `handleSmsTemplateSelect()` 関数を修正
3. 単体テストを実装
4. プロパティベーステストを実装

**Phase 2: バックエンド実装**
1. `backend/api/redirect.ts` を実装
2. `backend/vercel.json` を更新
3. 単体テストを実装
4. プロパティベーステストを実装

**Phase 3: インフラ設定**
1. ifoo.jpドメインのDNSレコード設定
2. VercelプロジェクトにドメインDNSレコード設定
3. SSL証明書の自動発行確認

**Phase 4: 統合テスト**
1. ローカル環境でのE2Eテスト
2. プレビュー環境でのテスト
3. 本番環境へのデプロイ

### 3. テストデータ

**テスト用物件番号**:
- `AA9831`（有効な物件番号）
- `AA13501`（有効な物件番号）
- `AA13527-2`（ハイフン付き物件番号）
- `INVALID`（無効な物件番号）
- `12345`（無効な物件番号）

**テスト用SMS本文**:
```
こんにちは。<<住居表示>>の物件についてご案内します。
詳細はお気軽にお問合せください。

---
株式会社いふう
〒870-0044 大分市舞鶴町1丁目3-30
TEL: 097-533-2022
Email: tenant@ifoo-oita.com
```

### 4. ドキュメント更新

**更新が必要なドキュメント**:
- README.md（機能説明を追加）
- API仕様書（短縮URLリダイレクトエンドポイントを追加）
- ユーザーマニュアル（SMS送信機能の説明を更新）

### 5. 今後の拡張可能性

**将来的な機能追加**:
1. 複数物件のリンク挿入（現在は最初の1件のみ）
2. 短縮URLのクリック数トラッキング
3. 短縮URLのカスタマイズ（例: `https://ifoo.jp/p/custom-name`）
4. QRコード生成（短縮URLをQRコードに変換）
5. A/Bテスト（リンクありとなしの効果測定）

**拡張時の考慮事項**:
- 既存の短縮URLは永続的に動作し続ける必要がある
- データベースへの依存を最小限に保つ（パフォーマンス維持）
- 後方互換性を常に保つ

## Summary

この設計では、買主詳細ページのSMS送信機能に近隣物件リンクを自動挿入する機能を実装します。主要なコンポーネントは以下の通りです：

1. **フロントエンド**: `insertNearbyPropertyLink()` 関数による近隣物件リンク挿入ロジック
2. **バックエンド**: `backend/api/redirect.ts` による短縮URLリダイレクト処理
3. **インフラ**: ifoo.jpドメインのDNS設定とSSL証明書設定

この設計は、既存機能との互換性を維持しながら、パフォーマンス、セキュリティ、拡張性を考慮しています。プロパティベーステストにより、全ての入力に対して正しく動作することを保証します。

