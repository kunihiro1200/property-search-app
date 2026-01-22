# 公開物件サイト ヘッダー実装ガイド

## 概要

公開物件サイトのヘッダーに以下の機能を実装しました：
- ロゴクリックで会社サイトへのリンク
- スマホ版のレスポンシブ対応
- スマホ版のお問合せ・TELボタン

## 実装内容

### 1. ロゴのリンク機能（PC・スマホ共通）

**ファイル**: `frontend/src/components/PublicPropertyLogo.tsx`

**機能**:
- ヘッダー右側のいふうロゴをクリックすると`https://ifoo-oita.com/`に遷移
- 新しいタブで開く（`window.open`使用）
- PC版とスマホ版の両方で動作

**実装**:
```typescript
const handleClick = () => {
  window.open('https://ifoo-oita.com/', '_blank', 'noopener,noreferrer');
};
```

### 2. スマホ版のレスポンシブ対応

**ファイル**: `frontend/src/components/PublicPropertyLogo.tsx`

**機能**:
- スマホ版（画面幅600px以下）では会社名「株式会社いふう」を非表示
- PC版ではロゴと会社名の両方を表示

**実装**:
```typescript
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

// JSX
{!isMobile && <span className="company-name">株式会社いふう</span>}
```

### 3. スマホ版の戻るボタンテキスト変更

**ファイル**: `frontend/src/components/PublicPropertyHeader.tsx`

**機能**:
- スマホ版：「←一覧」
- PC版：「←物件一覧」

**実装**:
```typescript
{isMobile ? '一覧' : '物件一覧'}
```

### 4. スマホ版のお問合せボタン

**ファイル**: 
- `frontend/src/components/PublicPropertyHeader.tsx`
- `frontend/src/components/PublicInquiryForm.tsx`

**機能**:
- スマホ版の詳細画面のみ表示
- クリックするとお問合せフォームまでスムーズにスクロール
- 成約済み物件では非表示

**実装**:
```typescript
const handleInquiryClick = () => {
  const inquiryForm = document.querySelector('.public-inquiry-form');
  if (inquiryForm) {
    inquiryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
```

**PublicInquiryFormの変更**:
```typescript
<Paper elevation={2} sx={{ p: 3 }} className="public-inquiry-form">
```

### 5. スマホ版のTELボタン

**ファイル**: `frontend/src/components/PublicPropertyHeader.tsx`

**機能**:
- スマホ版の詳細画面のみ表示
- クリックすると`097-533-2022`に電話をかける
- 成約済み物件では非表示

**実装**:
```typescript
const handlePhoneClick = () => {
  window.location.href = 'tel:0975332022';
};
```

## ボタンの配置とデザイン

### スマホ版（詳細画面）
```
ヘッダー左側: [←一覧] [お問合せ] [TEL]
ヘッダー右側: [ロゴのみ]
```

### PC版（詳細画面）
```
ヘッダー左側: [←物件一覧]
ヘッダー右側: [ロゴ] [株式会社いふう]
```

### ボタンの色
- **一覧**: 黄色（#FFC107）
- **お問合せ**: 緑色（#4CAF50）
- **TEL**: 青色（#2196F3）

## 重要な実装ポイント

### 1. レスポンシブ判定
```typescript
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // 600px未満
```

### 2. ボタンの横書き対応
```typescript
sx={{ 
  minWidth: 'auto',
  whiteSpace: 'nowrap',
  '& .MuiButton-startIcon': {
    marginRight: '4px',
  },
}}
```

### 3. 成約済み物件での非表示
```typescript
showInquiryButton={!isSold}
```

## ファイル構成

```
frontend/src/
├── components/
│   ├── PublicPropertyHeader.tsx      # ヘッダーコンポーネント
│   ├── PublicPropertyHeader.css      # ヘッダーのスタイル
│   ├── PublicPropertyLogo.tsx        # ロゴコンポーネント
│   ├── PublicPropertyLogo.css        # ロゴのスタイル
│   └── PublicInquiryForm.tsx         # お問合せフォーム
└── pages/
    └── PublicPropertyDetailPage.tsx  # 詳細画面
```

## デプロイ手順

```bash
# フロントエンドをビルド
cd frontend
npm run build

# Vercelにデプロイ
cd ..
vercel --prod
```

## 本番環境URL

https://property-site-frontend-kappa.vercel.app

## 注意事項

1. **ブラウザキャッシュ**: デプロイ後は必ずハードリフレッシュ（Ctrl+Shift+R）
2. **電話番号**: TELボタンの電話番号は`097-533-2022`（ハイフンなしで実装）
3. **成約済み物件**: お問合せボタンとTELボタンは表示されない
4. **PC版**: お問合せボタンとTELボタンは表示されない（右側にフォームが常に表示されているため）

## トラブルシューティング

### 変更が反映されない
- ブラウザのキャッシュをクリア（Ctrl+Shift+R）
- Vercelのデプロイが完了しているか確認

### ボタンが縦書きになる
- `minWidth: 'auto'`と`whiteSpace: 'nowrap'`が設定されているか確認
- `'& .MuiButton-startIcon': { marginRight: '4px' }`が設定されているか確認

### TELボタンが動作しない
- スマホで確認（PCでは電話アプリが起動しない）
- `tel:0975332022`の形式が正しいか確認

## 今後の拡張

- 電話番号を環境変数で管理
- ボタンの色をテーマで管理
- アクセシビリティの改善（aria-label等）
