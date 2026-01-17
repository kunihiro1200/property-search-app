# デザイン文書

## 概要

本ドキュメントは、物件公開サイトの詳細画面（PublicPropertyDetailPage）のヘッダー中央に、物件のステータスを示すバッジを表示する機能の設計を定義します。この機能により、訪問者は物件の現在のステータス（成約済み、配信限定、公開前）を一目で把握できるようになります。

## アーキテクチャ

### システム構成

```
PublicPropertyDetailPage (詳細画面)
  └── PublicPropertyHeader (ヘッダーコンポーネント)
        ├── 戻るボタン (左側)
        ├── ステータスバッジ (中央) ← 新規追加
        └── ロゴ (右側)
```

### コンポーネント階層

1. **PublicPropertyDetailPage**: 詳細画面のメインコンポーネント
   - 物件データを取得し、PublicPropertyHeaderにatbb_statusを渡す

2. **PublicPropertyHeader**: ヘッダーコンポーネント（修正）
   - atbb_statusプロパティを受け取る
   - ステータスバッジを中央に表示する

3. **共通関数**: ステータス判定ロジック
   - `getBadgeType()`: atbb_statusからバッジタイプを判定
   - 既存のPublicPropertyCardと同じロジックを再利用

## コンポーネントとインターフェース

### 1. PublicPropertyHeader コンポーネント（修正）

#### インターフェース

```typescript
interface PublicPropertyHeaderProps {
  showBackButton?: boolean;
  atbbStatus?: string | null;  // 新規追加
}
```

#### 実装詳細


- atbbStatusプロパティを受け取る
- getBadgeType()関数を使用してバッジタイプを判定
- バッジタイプに応じて適切なバッジを表示
- バッジはヘッダーの中央に配置

#### レイアウト構造

```
┌─────────────────────────────────────────────────────────┐
│  [戻るボタン]      [ステータスバッジ]         [ロゴ]    │
│   (左側)              (中央)                  (右側)    │
└─────────────────────────────────────────────────────────┘
```

### 2. ステータス判定関数（共通化）

#### 関数: getBadgeType

```typescript
function getBadgeType(atbbStatus: string | null | undefined): string {
  if (!atbbStatus) return 'sold';
  if (atbbStatus.includes('公開中')) return 'none';
  if (atbbStatus.includes('公開前')) return 'pre_release';
  if (atbbStatus.includes('非公開（配信メールのみ）')) return 'email_only';
  return 'sold';  // "非公開案件" and all other cases
}
```

**戻り値:**
- `'none'`: バッジを表示しない（公開中の物件）
- `'sold'`: 「成約済み」バッジを表示
- `'pre_release'`: 「公開前」バッジを表示
- `'email_only'`: 「配信限定」バッジを表示

**注意:** この関数は既存のPublicPropertyCardコンポーネントで使用されているものと同じロジックです。

### 3. バッジコンポーネント

#### バッジ設定

```typescript
const badgeConfig: Record<string, { text: string; color: string }> = {
  'sold': { text: '成約済み', color: '#d32f2f' },
  'pre_release': { text: '公開前', color: '#1976d2' },
  'email_only': { text: '配信限定', color: '#f57c00' },
};
```

#### スタイル仕様

- **背景色:**
  - 成約済み: `#d32f2f` (赤色)
  - 公開前: `#1976d2` (青色)
  - 配信限定: `#f57c00` (オレンジ色)

- **テキスト色:** `#ffffff` (白色)

- **パディング:** `8px 16px`

- **フォントサイズ:** `14px`

- **フォントウェイト:** `600` (Semi-bold)

- **ボーダー半径:** `4px`

- **配置:** ヘッダーの水平方向中央

## データモデル

### PublicProperty型（既存）

```typescript
interface PublicProperty {
  id: string;
  property_number: string;
  address: string;
  display_address?: string;
  price: number;
  property_type: string;
  atbb_status?: string | null;  // ステータス判定に使用
  images?: string[];
  land_area?: number;
  building_area?: number;
  building_age?: number;
  floor_plan?: string;
  // ... その他のフィールド
}
```

### ステータスマッピング

| atbb_status の値 | バッジタイプ | 表示テキスト | 背景色 |
|------------------|-------------|-------------|--------|
| "専任・公開中" | none | (表示なし) | - |
| "一般・公開中" | none | (表示なし) | - |
| "公開前" | pre_release | 公開前 | 青色 |
| "非公開（配信メールのみ）" | email_only | 配信限定 | オレンジ色 |
| "非公開案件" | sold | 成約済み | 赤色 |
| null / undefined | sold | 成約済み | 赤色 |
| その他 | sold | 成約済み | 赤色 |


## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性または動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ1: ステータス判定の一貫性

*すべての* atbb_status値に対して、getBadgeType()関数は一貫した結果を返す必要があります。同じatbb_status値に対して、常に同じバッジタイプが返されるべきです。

**検証要件:** 要件1.2, 1.3, 1.4, 1.5, 1.6

### プロパティ2: バッジ表示の正確性

*すべての* 物件に対して、atbb_statusに「公開中」が含まれる場合、バッジは表示されないべきです。それ以外の場合、適切なバッジが表示されるべきです。

**検証要件:** 要件1.2, 1.3, 1.4, 1.5, 1.6

### プロパティ3: バッジ配置の中央揃え

*すべての* 画面サイズに対して、バッジはヘッダーの水平方向の中央に配置されるべきです。

**検証要件:** 要件1.7, 要件3.5

### プロパティ4: 色コントラストの十分性

*すべての* バッジに対して、背景色とテキスト色のコントラスト比は4.5:1以上であるべきです（WCAG AA基準）。

**検証要件:** 要件2.9, 要件4.3

### プロパティ5: エラー時の安全性

*すべての* エラー状態（atbb_statusがnull、undefined、空文字列）に対して、システムはクラッシュせず、適切にハンドリングされるべきです。

**検証要件:** 要件7.1, 7.2, 7.3, 7.4

## エラーハンドリング

### 1. atbb_statusが未定義の場合

**シナリオ:** 物件データのatbb_statusがnull、undefined、または空文字列の場合

**処理:**
- getBadgeType()は'sold'を返す
- 「成約済み」バッジを表示する
- エラーをスローしない

**理由:** デフォルトで安全側（成約済み）に倒すことで、誤って非公開物件を公開してしまうリスクを回避

### 2. 予期しないatbb_status値の場合

**シナリオ:** atbb_statusが既知のパターンに一致しない場合

**処理:**
- getBadgeType()は'sold'を返す
- 「成約済み」バッジを表示する
- コンソールに警告を出力（開発環境のみ）

**理由:** 新しいステータスが追加された場合でも、システムが正常に動作し続ける

### 3. 物件データの取得失敗

**シナリオ:** APIから物件データの取得に失敗した場合

**処理:**
- PublicPropertyDetailPageでエラーを表示
- ヘッダーは表示されるが、バッジは表示されない
- ユーザーに適切なエラーメッセージを表示

**理由:** 既存のエラーハンドリングを維持し、部分的な障害でもページが表示される

## テスト戦略

### 単体テスト

#### 1. getBadgeType関数のテスト

**テストケース:**
- 「専任・公開中」→ 'none'
- 「一般・公開中」→ 'none'
- 「公開前」→ 'pre_release'
- 「非公開（配信メールのみ）」→ 'email_only'
- 「非公開案件」→ 'sold'
- null → 'sold'
- undefined → 'sold'
- 空文字列 → 'sold'
- 未知の値 → 'sold'

#### 2. PublicPropertyHeaderコンポーネントのテスト

**テストケース:**
- atbbStatusが'none'の場合、バッジが表示されない
- atbbStatusが'sold'の場合、「成約済み」バッジが表示される
- atbbStatusが'pre_release'の場合、「公開前」バッジが表示される
- atbbStatusが'email_only'の場合、「配信限定」バッジが表示される
- バッジが中央に配置される

### プロパティベーステスト

#### プロパティテスト1: ステータス判定の一貫性

**テスト:** *すべての* atbb_status値に対して、getBadgeType()を2回呼び出した結果が同じであることを検証

**実装:**
```typescript
// 疑似コード
for all atbbStatus in randomStrings:
  result1 = getBadgeType(atbbStatus)
  result2 = getBadgeType(atbbStatus)
  assert result1 === result2
```

**検証要件:** 要件1.2, 1.3, 1.4, 1.5, 1.6

**タグ:** Feature: public-property-detail-status-badge, Property 1: ステータス判定の一貫性

#### プロパティテスト2: バッジ表示の正確性

**テスト:** *すべての* atbb_status値に対して、「公開中」を含む場合はバッジが表示されず、それ以外の場合はバッジが表示されることを検証

**実装:**
```typescript
// 疑似コード
for all atbbStatus in randomStrings:
  badgeType = getBadgeType(atbbStatus)
  if atbbStatus.includes('公開中'):
    assert badgeType === 'none'
  else:
    assert badgeType !== 'none'
```

**検証要件:** 要件1.2, 1.3, 1.4, 1.5, 1.6

**タグ:** Feature: public-property-detail-status-badge, Property 2: バッジ表示の正確性


#### プロパティテスト3: 色コントラストの十分性

**テスト:** *すべての* バッジ設定に対して、背景色とテキスト色のコントラスト比が4.5:1以上であることを検証

**実装:**
```typescript
// 疑似コード
for all badgeType in ['sold', 'pre_release', 'email_only']:
  config = badgeConfig[badgeType]
  contrastRatio = calculateContrastRatio(config.color, '#ffffff')
  assert contrastRatio >= 4.5
```

**検証要件:** 要件2.9, 要件4.3

**タグ:** Feature: public-property-detail-status-badge, Property 4: 色コントラストの十分性

#### プロパティテスト4: エラー時の安全性

**テスト:** *すべての* エラー状態（null、undefined、空文字列）に対して、getBadgeType()がエラーをスローせず、'sold'を返すことを検証

**実装:**
```typescript
// 疑似コード
for all errorValue in [null, undefined, '', ' ', '\n']:
  result = getBadgeType(errorValue)
  assert result === 'sold'
  assert noErrorThrown
```

**検証要件:** 要件7.1, 7.2, 7.3, 7.4

**タグ:** Feature: public-property-detail-status-badge, Property 5: エラー時の安全性

### 統合テスト

#### 1. 詳細画面でのバッジ表示

**テストケース:**
- 各ステータスの物件詳細画面にアクセス
- ヘッダーに適切なバッジが表示されることを確認
- バッジの色とテキストが正しいことを確認

#### 2. レスポンシブデザイン

**テストケース:**
- デスクトップ（1920x1080）
- タブレット（768x1024）
- モバイル（375x667）
- すべての画面サイズでバッジが中央に表示されることを確認

#### 3. アクセシビリティ

**テストケース:**
- スクリーンリーダーでバッジを読み上げ
- 色コントラスト比を測定
- ARIAラベルが適切に設定されていることを確認

### テスト実行設定

**プロパティベーステストの設定:**
- 最小実行回数: 100回
- テストライブラリ: fast-check（TypeScript/JavaScript用）
- 各プロパティテストは設計文書のプロパティを参照するタグを持つ

**単体テストの設定:**
- テストフレームワーク: Jest + React Testing Library
- カバレッジ目標: 90%以上

## 実装の詳細

### 1. PublicPropertyHeaderの修正

**ファイル:** `frontend/src/components/PublicPropertyHeader.tsx`

**変更点:**
1. `atbbStatus`プロパティを追加
2. `getBadgeType()`関数をインポート（または定義）
3. バッジレンダリングロジックを追加
4. CSSでバッジを中央に配置

**実装例:**

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PublicPropertyLogo from './PublicPropertyLogo';
import { getBadgeType } from '../utils/propertyStatusUtils';
import './PublicPropertyHeader.css';

interface PublicPropertyHeaderProps {
  showBackButton?: boolean;
  atbbStatus?: string | null;
}

const PublicPropertyHeader: React.FC<PublicPropertyHeaderProps> = ({ 
  showBackButton = false,
  atbbStatus 
}) => {
  const navigate = useNavigate();
  const badgeType = getBadgeType(atbbStatus);

  const handleBackClick = () => {
    navigate('/public/properties');
  };

  const renderBadge = () => {
    if (badgeType === 'none') return null;
    
    const badgeConfig: Record<string, { text: string; color: string }> = {
      'sold': { text: '成約済み', color: '#d32f2f' },
      'pre_release': { text: '公開前', color: '#1976d2' },
      'email_only': { text: '配信限定', color: '#f57c00' },
    };
    
    const config = badgeConfig[badgeType];
    if (!config) return null;
    
    return (
      <Box
        className="status-badge"
        sx={{
          backgroundColor: config.color,
          color: '#ffffff',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 600,
          borderRadius: '4px',
        }}
        role="status"
        aria-label={`物件ステータス: ${config.text}`}
      >
        {config.text}
      </Box>
    );
  };

  return (
    <header className="public-property-header">
      <div className="header-container">
        <div className="header-left">
          {showBackButton && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackClick}
              sx={{ 
                backgroundColor: '#FFC107',
                color: '#000',
                border: '1px solid #000',
                '&:hover': {
                  backgroundColor: '#FFB300',
                  borderColor: '#000',
                },
              }}
            >
              物件一覧
            </Button>
          )}
        </div>
        <div className="header-center">
          {renderBadge()}
        </div>
        <div className="header-right">
          <PublicPropertyLogo />
        </div>
      </div>
    </header>
  );
};

export default PublicPropertyHeader;
```

### 2. CSSの修正

**ファイル:** `frontend/src/components/PublicPropertyHeader.css`

**変更点:**
1. `.header-center`クラスを追加
2. Flexboxレイアウトを調整して3カラム構造にする

**実装例:**

```css
.header-container {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 80px;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-lg);
  flex: 1;
}

.status-badge {
  white-space: nowrap;
}

/* Responsive Design */
@media (max-width: 960px) {
  .header-container {
    padding: 14px 24px;
    min-height: 64px;
  }
  
  .status-badge {
    font-size: 12px;
    padding: 6px 12px;
  }
}

@media (max-width: 600px) {
  .header-container {
    padding: 16px 16px;
    min-height: 64px;
  }
  
  .status-badge {
    font-size: 11px;
    padding: 5px 10px;
  }
}
```

### 3. ユーティリティ関数の作成

**ファイル:** `frontend/src/utils/propertyStatusUtils.ts`（新規作成）

**内容:**

```typescript
/**
 * atbb_statusからバッジタイプを判定する
 * @param atbbStatus - 物件のatbb_status値
 * @returns バッジタイプ ('none' | 'sold' | 'pre_release' | 'email_only')
 */
export function getBadgeType(atbbStatus: string | null | undefined): string {
  if (!atbbStatus) return 'sold';
  if (atbbStatus.includes('公開中')) return 'none';
  if (atbbStatus.includes('公開前')) return 'pre_release';
  if (atbbStatus.includes('非公開（配信メールのみ）')) return 'email_only';
  return 'sold';
}
```

### 4. PublicPropertyDetailPageの修正

**ファイル:** `frontend/src/pages/PublicPropertyDetailPage.tsx`

**変更点:**
1. `PublicPropertyHeader`に`atbbStatus`プロパティを渡す

**実装例:**

```typescript
// 既存のコード
return (
  <>
    <PublicPropertyHeader 
      showBackButton={true} 
      atbbStatus={property?.atbb_status}  // 追加
    />
    {/* 残りのコード */}
  </>
);
```

### 5. PublicPropertyCardの修正（オプション）

**ファイル:** `frontend/src/components/PublicPropertyCard.tsx`

**変更点:**
1. ローカルの`getBadgeType()`関数を削除
2. 共通の`getBadgeType()`関数をインポート

**実装例:**

```typescript
import { getBadgeType } from '../utils/propertyStatusUtils';

// ローカルのgetBadgeType関数を削除
// function getBadgeType(atbbStatus: string | null | undefined): string { ... }
```

## パフォーマンス考慮事項

### 1. レンダリングパフォーマンス

- バッジはCSSのみでスタイリング（画像不使用）
- 追加のAPIリクエストなし
- 既存の物件データを使用
- 影響: 最小限（< 50ms）

### 2. メモリ使用量

- 新しいコンポーネントは軽量
- 追加のメモリ使用量: 無視できるレベル

### 3. バンドルサイズ

- 新しいユーティリティ関数: 約200バイト
- CSS追加: 約500バイト
- 影響: 無視できるレベル

## アクセシビリティ

### 1. スクリーンリーダー対応

- `role="status"`属性を使用
- `aria-label`で詳細な説明を提供
- 例: `aria-label="物件ステータス: 成約済み"`

### 2. 色コントラスト

- すべてのバッジで4.5:1以上のコントラスト比を確保
- 成約済み: #d32f2f / #ffffff = 5.5:1
- 公開前: #1976d2 / #ffffff = 4.6:1
- 配信限定: #f57c00 / #ffffff = 4.5:1

### 3. キーボードナビゲーション

- バッジは情報表示のみ（インタラクティブではない）
- キーボードフォーカスは不要

## セキュリティ考慮事項

### 1. XSS対策

- atbb_statusはデータベースから取得
- Reactの自動エスケープにより保護
- 追加のサニタイゼーション不要

### 2. データ検証

- getBadgeType()関数で安全にハンドリング
- 予期しない値でもエラーをスローしない

## 保守性

### 1. コードの再利用

- getBadgeType()関数を共通化
- PublicPropertyCardとPublicPropertyHeaderで同じロジックを使用
- 将来の変更が容易

### 2. テスト可能性

- 純粋関数（getBadgeType）は単体テスト容易
- コンポーネントはReact Testing Libraryでテスト可能

### 3. 拡張性

- 新しいステータスタイプの追加が容易
- badgeConfigオブジェクトに追加するだけ

## デプロイメント

### 1. デプロイ手順

1. コードレビュー
2. 単体テスト実行
3. プロパティベーステスト実行
4. 統合テスト実行
5. ステージング環境にデプロイ
6. 手動テスト
7. 本番環境にデプロイ

### 2. ロールバック計画

- 問題が発生した場合、前のバージョンに戻す
- データベース変更なし（ロールバック容易）

### 3. モニタリング

- エラーログの監視
- ページ読み込み時間の監視
- ユーザーフィードバックの収集

---

**作成日:** 2026-01-13  
**ステータス:** レビュー待ち  
**バージョン:** 1.0
