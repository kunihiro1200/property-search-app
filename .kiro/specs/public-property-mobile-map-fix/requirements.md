# 公開物件サイト - スマホ地図検索機能修正

## 概要

公開物件サイトのスマホ表示において、「地図で検索」ボタンのレイアウト問題とGoogle Maps APIエラーを修正します。

## 問題の詳細

### 問題1: 「地図で検索」ボタンがスマホ画面からはみ出している
- **現象**: スマホでアクセスすると、「地図で検索」ボタンが画面の右側にはみ出して表示される
- **影響**: ユーザーがボタンを押しにくい、見た目が悪い
- **原因**: レスポンシブデザインが適切に実装されていない

### 問題2: 「地図で検索」を押すとGoogle Mapsエラーが表示される
- **現象**: 「地図で検索」ボタンを押すと「このページではGoogle Mapが正しく読み込まれませんでした」というエラーが表示される
- **影響**: 地図検索機能が使用できない
- **原因**: Google Maps APIキーの設定またはAPI制限の問題

## ユーザーストーリー

### US-1: スマホで地図検索ボタンを快適に使用できる
**As a** スマホユーザー  
**I want to** 「地図で検索」ボタンが画面内に収まって表示される  
**So that** ボタンを簡単にタップできる

**受け入れ基準**:
1. スマホ画面（幅375px〜428px）で「地図で検索」ボタンが画面内に収まっている
2. ボタンのテキストが省略されずに表示される
3. ボタンと検索バーが適切に配置されている（縦並びまたは横並び）
4. タブレット画面（幅768px〜1024px）でも適切に表示される

### US-2: 地図検索機能が正常に動作する
**As a** ユーザー  
**I want to** 「地図で検索」ボタンを押すと地図が正しく表示される  
**So that** 地図上で物件を検索できる

**受け入れ基準**:
1. 「地図で検索」ボタンを押すとGoogle Mapsが正しく読み込まれる
2. 地図上に物件のマーカーが表示される
3. マーカーをクリックすると物件情報が表示される
4. エラーメッセージが表示されない

## 技術的な詳細

### 現在の実装（PublicPropertiesPage.tsx）

```typescript
<Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
  <Box sx={{ flex: 1 }}>
    <UnifiedSearchBar
      value={searchQuery}
      onChange={setSearchQuery}
      onSearch={handleSearch}
      placeholder="所在地で検索"
    />
  </Box>
  <Button
    variant="outlined"
    startIcon={<LocationOnIcon />}
    sx={{
      height: '56px',
      minWidth: '140px',
      borderColor: '#4CAF50',
      color: '#4CAF50',
      fontWeight: 'bold',
      '&:hover': {
        borderColor: '#45A049',
        backgroundColor: '#F1F8F4',
      },
    }}
    onClick={() => {
      setViewMode('map');
      setShouldScrollToMap(true);
    }}
  >
    地図で検索
  </Button>
</Box>
```

**問題点**:
- `display: 'flex'`で横並びになっているが、スマホ画面では幅が足りない
- `minWidth: '140px'`が設定されているため、ボタンが縮小されない
- レスポンシブ対応のブレークポイントが設定されていない

### Google Maps API設定

**環境変数（frontend/.env.production）**:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyD2igeXY-E_MWtJwMYpiv6CYpEiLJuDeYE
```

**確認が必要な項目**:
1. APIキーが有効か
2. Maps JavaScript APIが有効になっているか
3. 請求アカウントが設定されているか
4. APIキーのリファラー制限が正しく設定されているか
   - 本番環境のドメイン: `https://property-site-frontend-kappa.vercel.app/*`
   - ローカル環境: `http://localhost:*`

## 制約条件

1. **既存の機能を壊さない**: デスクトップ表示は現状のまま維持する
2. **パフォーマンス**: 地図の読み込み速度を維持する
3. **アクセシビリティ**: ボタンのタップ領域を十分に確保する（最低44px × 44px）
4. **ブラウザ互換性**: iOS Safari、Android Chromeで動作する

## 非機能要件

1. **レスポンシブデザイン**: 
   - スマホ（375px〜428px）
   - タブレット（768px〜1024px）
   - デスクトップ（1024px以上）

2. **パフォーマンス**:
   - 地図の初期表示: 3秒以内
   - マーカーの表示: 1秒以内

3. **ユーザビリティ**:
   - ボタンのタップ領域: 最低44px × 44px
   - ボタンのテキストが読みやすい

## 参考資料

- [Google Maps JavaScript API ドキュメント](https://developers.google.com/maps/documentation/javascript)
- [Material-UI レスポンシブデザイン](https://mui.com/material-ui/customization/breakpoints/)
- [モバイルファーストデザイン原則](https://web.dev/mobile-first/)

## 優先度

**高**: スマホユーザーが地図検索機能を使用できない状態は、ビジネスに大きな影響を与える

## 関連する既存のspec

- `public-property-site`: 公開物件サイトの基本機能
- `public-property-search-filters`: 検索フィルター機能

## 備考

- Google Maps APIキーの確認は、Google Cloud Consoleで行う必要がある
- APIキーの制限設定を変更する場合は、セキュリティリスクを考慮する
- 本番環境でのテストが必要
