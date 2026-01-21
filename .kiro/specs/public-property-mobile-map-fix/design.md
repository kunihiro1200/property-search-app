# 公開物件サイト - スマホ地図検索機能修正 設計書

## 設計概要

スマホでの「地図で検索」ボタンのレイアウト問題とGoogle Maps APIエラーを修正します。

## アーキテクチャ

### 修正対象ファイル

1. **frontend/src/pages/PublicPropertiesPage.tsx**
   - 「地図で検索」ボタンのレスポンシブ対応

2. **frontend/src/components/PropertyMapView.tsx**（確認のみ）
   - Google Maps APIの使用状況を確認

3. **frontend/.env.production**（確認のみ）
   - Google Maps APIキーの設定を確認

## 詳細設計

### 1. レスポンシブデザインの修正

#### 現在の実装
```typescript
<Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
  <Box sx={{ flex: 1 }}>
    <UnifiedSearchBar />
  </Box>
  <Button
    sx={{
      height: '56px',
      minWidth: '140px',
    }}
  >
    地図で検索
  </Button>
</Box>
```

#### 修正後の実装
```typescript
<Box 
  sx={{ 
    mt: 2, 
    display: 'flex', 
    flexDirection: { xs: 'column', sm: 'row' }, // スマホは縦並び、タブレット以上は横並び
    gap: 2, 
    alignItems: { xs: 'stretch', sm: 'flex-start' } // スマホは幅いっぱい、タブレット以上は左寄せ
  }}
>
  <Box sx={{ flex: { xs: 'none', sm: 1 } }}> {/* スマホはflex無効 */}
    <UnifiedSearchBar />
  </Box>
  <Button
    variant="outlined"
    startIcon={<LocationOnIcon />}
    sx={{
      height: '56px',
      minWidth: { xs: 'auto', sm: '140px' }, // スマホは自動、タブレット以上は140px
      width: { xs: '100%', sm: 'auto' }, // スマホは幅いっぱい
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

#### ブレークポイント
- `xs`: 0px〜600px（スマホ）
- `sm`: 600px〜900px（タブレット）
- `md`: 900px以上（デスクトップ）

### 2. Google Maps API設定の確認

#### 確認項目チェックリスト

1. **APIキーの有効性**
   - Google Cloud Consoleで確認
   - APIキー: `AIzaSyD2igeXY-E_MWtJwMYpiv6CYpEiLJuDeYE`

2. **有効化されているAPI**
   - Maps JavaScript API ✓
   - Geocoding API ✓（住所から座標を取得する場合）

3. **請求アカウント**
   - 請求アカウントが設定されているか確認
   - 無料枠: 月間$200分（約28,000マップロード）

4. **APIキーの制限**
   - **アプリケーションの制限**: HTTPリファラー
   - **許可するリファラー**:
     - `https://property-site-frontend-kappa.vercel.app/*`
     - `http://localhost:*`（開発環境用）
   - **API制限**: Maps JavaScript API

#### エラーの原因と対処法

| エラーメッセージ | 原因 | 対処法 |
|----------------|------|--------|
| "このページではGoogle Mapが正しく読み込まれませんでした" | APIキーが無効 | Google Cloud Consoleで確認 |
| "RefererNotAllowedMapError" | リファラー制限に引っかかっている | 許可するリファラーに本番環境のURLを追加 |
| "ApiNotActivatedMapError" | Maps JavaScript APIが有効になっていない | Google Cloud ConsoleでAPIを有効化 |
| "BillingNotEnabledMapError" | 請求アカウントが設定されていない | 請求アカウントを設定 |

### 3. PropertyMapViewコンポーネントの確認

#### Google Maps APIの読み込み方法

**確認ポイント**:
1. `@react-google-maps/api`ライブラリを使用しているか
2. APIキーが正しく渡されているか
3. エラーハンドリングが実装されているか

**期待される実装**:
```typescript
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const PropertyMapView: React.FC<Props> = ({ properties }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return <div>Google Maps APIキーが設定されていません</div>;
  }
  
  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      onError={(error) => {
        console.error('Google Maps API読み込みエラー:', error);
      }}
    >
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '600px' }}
        center={defaultCenter}
        zoom={12}
      >
        {properties.map((property) => (
          <Marker
            key={property.id}
            position={{ lat: property.latitude, lng: property.longitude }}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
};
```

## 正確性プロパティ（Correctness Properties）

### Property 1: レスポンシブレイアウトの正確性
**検証**: スマホ画面で「地図で検索」ボタンが画面内に収まっている

**テスト方法**:
```typescript
describe('PublicPropertiesPage - Responsive Layout', () => {
  it('スマホ画面（375px）で地図検索ボタンが画面内に収まる', () => {
    cy.viewport(375, 667); // iPhone SE
    cy.visit('/properties');
    cy.get('button').contains('地図で検索').should('be.visible');
    cy.get('button').contains('地図で検索').then(($btn) => {
      const rect = $btn[0].getBoundingClientRect();
      expect(rect.right).to.be.lessThan(375); // 画面幅内
    });
  });
  
  it('タブレット画面（768px）で横並びレイアウトになる', () => {
    cy.viewport(768, 1024); // iPad
    cy.visit('/properties');
    cy.get('button').contains('地図で検索').should('be.visible');
    // 検索バーとボタンが横並びになっているか確認
  });
});
```

### Property 2: Google Maps APIの正常動作
**検証**: 「地図で検索」ボタンを押すとGoogle Mapsが正しく読み込まれる

**テスト方法**:
```typescript
describe('PropertyMapView - Google Maps API', () => {
  it('地図が正しく読み込まれる', () => {
    cy.visit('/properties');
    cy.get('button').contains('地図で検索').click();
    
    // 地図が表示されるまで待つ
    cy.get('.gm-style', { timeout: 10000 }).should('be.visible');
    
    // エラーメッセージが表示されないことを確認
    cy.contains('このページではGoogle Mapが正しく読み込まれませんでした').should('not.exist');
  });
  
  it('物件マーカーが表示される', () => {
    cy.visit('/properties?view=map');
    
    // マーカーが表示されるまで待つ
    cy.get('img[src*="maps.gstatic.com"]', { timeout: 10000 }).should('have.length.greaterThan', 0);
  });
});
```

### Property 3: APIキー設定の正確性
**検証**: 環境変数が正しく設定されている

**テスト方法**:
```typescript
describe('Environment Variables', () => {
  it('VITE_GOOGLE_MAPS_API_KEYが設定されている', () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    expect(apiKey).to.exist;
    expect(apiKey).to.have.length.greaterThan(0);
  });
});
```

## テスト戦略

### 1. ユニットテスト
- レスポンシブスタイルの適用確認
- APIキーの存在確認

### 2. 統合テスト
- Google Maps APIの読み込み確認
- マーカーの表示確認

### 3. E2Eテスト（Cypress）
- スマホ画面でのボタン表示確認
- 地図検索機能の動作確認

### 4. 手動テスト
- 実機（iPhone、Android）での動作確認
- 本番環境でのGoogle Maps表示確認

## デプロイ手順

### 1. コード修正
```bash
# フロントエンドのコード修正
cd frontend
# PublicPropertiesPage.tsxを修正
```

### 2. ローカルテスト
```bash
# 開発サーバー起動
npm run dev

# ブラウザの開発者ツールでスマホ画面をエミュレート
# Chrome DevTools: Cmd+Shift+M (Mac) / Ctrl+Shift+M (Windows)
```

### 3. Google Maps API設定確認
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」
4. APIキーを選択
5. 以下を確認:
   - Maps JavaScript APIが有効
   - リファラー制限に本番環境のURLが含まれている
   - 請求アカウントが設定されている

### 4. 本番環境デプロイ
```bash
# Vercelにデプロイ
npm run build
vercel --prod
```

### 5. 本番環境テスト
- スマホ実機でアクセス
- 「地図で検索」ボタンをタップ
- 地図が正しく表示されることを確認

## ロールバック計画

### 問題が発生した場合
1. Vercelのダッシュボードから前のデプロイメントにロールバック
2. または、Gitで前のコミットに戻す

```bash
git revert HEAD
git push origin main
```

## パフォーマンス考慮事項

### 地図の遅延読み込み
- 地図ビューに切り替えたときのみGoogle Maps APIを読み込む
- 現在の実装では`viewMode === 'map'`のときのみ`PropertyMapView`をレンダリング

### マーカーの最適化
- 大量の物件がある場合、マーカークラスタリングを検討
- 現在は`skipImages: 'true'`で画像取得をスキップして高速化

## セキュリティ考慮事項

### APIキーの保護
- APIキーはリファラー制限で保護
- 環境変数として管理（`.env.production`）
- Gitにコミットしない（`.gitignore`に含める）

### 使用量の監視
- Google Cloud Consoleで使用量を定期的に確認
- 予算アラートを設定（月間$50など）

## 監視とアラート

### エラー監視
- ブラウザのコンソールエラーを監視
- Sentryなどのエラートラッキングツールの導入を検討

### パフォーマンス監視
- Google Analyticsで地図検索の使用状況を追跡
- Core Web Vitalsを監視

## 今後の改善案

1. **マーカークラスタリング**: 大量の物件がある場合の表示最適化
2. **地図の初期位置**: ユーザーの現在地を中心に表示
3. **フィルター連動**: 地図上でフィルター条件を変更できるようにする
4. **オフライン対応**: 地図が読み込めない場合の代替表示

## 参考資料

- [Material-UI Breakpoints](https://mui.com/material-ui/customization/breakpoints/)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)
