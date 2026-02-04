# 通話モードページ地図表示機能 - 設計書

## 1. アーキテクチャ概要

### 1.1 システム構成
```
CallModePage.tsx
  ├─ PropertyMapSection (新規コンポーネント)
  │   └─ GoogleMap (既存ライブラリ)
  └─ GoogleMapsContext (既存)
```

### 1.2 技術スタック
- **地図ライブラリ**: `@react-google-maps/api`（既存）
- **地図プロバイダー**: Google Maps JavaScript API
- **コンテキスト**: `GoogleMapsContext`（既存）
- **UIフレームワーク**: Material-UI

## 2. コンポーネント設計

### 2.1 PropertyMapSection（新規コンポーネント）

**責務:**
- 物件住所から座標を取得
- Google Mapを表示
- エラーハンドリング

**Props:**
```typescript
interface PropertyMapSectionProps {
  propertyAddress: string | undefined;
}
```

**状態管理:**
```typescript
const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(null);
const [isLoadingCoordinates, setIsLoadingCoordinates] = useState(false);
```

**実装方針:**
- 公開物件サイトの地図実装を参考にする
- `useGoogleMaps`フックを使用してGoogle Maps APIの読み込み状態を管理
- ジオコーディングは既存のAPIエンドポイントを使用（または新規作成）

### 2.2 地図表示ロジック

**表示条件:**
```typescript
// 以下の条件を全て満たす場合のみ地図を表示
1. propertyAddress が存在する
2. Google Maps APIが読み込まれている (isMapLoaded === true)
3. 座標が取得できている (mapCoordinates !== null)
```

**非表示条件:**
```typescript
// 以下のいずれかの場合は地図を表示しない
1. propertyAddress が空またはnull
2. Google Maps APIの読み込みに失敗
3. ジオコーディングに失敗
```

## 3. データフロー

### 3.1 座標取得フロー

```
1. CallModePage読み込み
   ↓
2. seller.propertyAddress を取得
   ↓
3. PropertyMapSection に propertyAddress を渡す
   ↓
4. useEffect で propertyAddress が変更されたら座標を取得
   ↓
5. ジオコーディングAPI呼び出し
   ↓
6. 座標を state に保存
   ↓
7. GoogleMap コンポーネントに座標を渡す
```

### 3.2 エラーハンドリングフロー

```
ジオコーディング失敗
   ↓
座標を null に設定
   ↓
地図を表示しない（エラーメッセージも表示しない）
```

## 4. API設計

### 4.1 ジオコーディングAPI

**既存のAPIを使用する場合:**
- 公開物件サイトで使用されているジオコーディングAPIを確認
- 同じエンドポイントを使用

**新規APIを作成する場合:**

**エンドポイント:** `GET /api/geocoding`

**リクエスト:**
```typescript
{
  address: string; // 物件住所
}
```

**レスポンス（成功）:**
```typescript
{
  lat: number;
  lng: number;
}
```

**レスポンス（失敗）:**
```typescript
{
  error: string;
}
```

**実装:**
- Google Geocoding APIを使用
- バックエンドでAPIキーを管理
- レート制限を考慮

## 5. UI設計

### 5.1 レイアウト

```
┌─────────────────────────────────────┐
│ 📍 物件情報                          │
│ [物件番号] [種別] [反響日時]         │
│ ─────────────────────────────────── │
│ 物件住所: 大分市中央町1-1-1          │
│ 土地面積: 100㎡                      │
│ ...                                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🗺️ 物件位置                         │ ← 新規追加
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │      [Google Map]               │ │
│ │         📍                      │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 👤 売主情報                          │
│ 名前: 山田太郎                       │
│ ...                                  │
└─────────────────────────────────────┘
```

### 5.2 スタイル定義

```typescript
// 地図コンテナのスタイル
const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
};

// 地図オプション
const mapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

// デフォルトズームレベル
const DEFAULT_ZOOM = 15;
```

### 5.3 Material-UI コンポーネント構成

```tsx
<Paper sx={{ p: 2, mb: 3 }}>
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
    <Typography variant="h6">
      🗺️ 物件位置
    </Typography>
  </Box>
  
  {isLoadingCoordinates && (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  )}
  
  {!isLoadingCoordinates && mapCoordinates && (
    <Box sx={{ borderRadius: '8px', overflow: 'hidden' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCoordinates}
        zoom={DEFAULT_ZOOM}
        options={mapOptions}
      >
        <Marker position={mapCoordinates} />
      </GoogleMap>
    </Box>
  )}
</Paper>
```

## 6. 実装手順

### Phase 1: 準備（既存コードの確認）
1. 公開物件サイトの地図実装を確認
2. `GoogleMapsContext`の使用方法を確認
3. ジオコーディングAPIの有無を確認

### Phase 2: コンポーネント作成
1. `PropertyMapSection.tsx`を作成
2. 基本的な地図表示ロジックを実装
3. ジオコーディング処理を実装

### Phase 3: CallModePageへの統合
1. `CallModePage.tsx`に`PropertyMapSection`をインポート
2. 物件情報セクションと売主情報セクションの間に配置
3. `propertyAddress`をpropsとして渡す

### Phase 4: テストと調整
1. 物件住所が設定されている売主でテスト
2. 物件住所が未設定の売主でテスト
3. ジオコーディング失敗時の動作を確認
4. レスポンシブデザインを確認

## 7. ファイル構成

### 新規作成ファイル
```
frontend/src/components/PropertyMapSection.tsx  # 地図表示コンポーネント
```

### 修正ファイル
```
frontend/src/pages/CallModePage.tsx  # 地図セクションを追加
```

### 参考ファイル（変更なし）
```
frontend/src/pages/PublicPropertyDetailPage.tsx  # 地図実装の参考
frontend/src/contexts/GoogleMapsContext.tsx      # Google Maps API管理
```

## 8. コード例

### 8.1 PropertyMapSection.tsx（骨格）

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';

interface PropertyMapSectionProps {
  propertyAddress: string | undefined;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const DEFAULT_ZOOM = 15;

const PropertyMapSection: React.FC<PropertyMapSectionProps> = ({ propertyAddress }) => {
  const { isLoaded: isMapLoaded } = useGoogleMaps();
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingCoordinates, setIsLoadingCoordinates] = useState(false);

  useEffect(() => {
    if (!propertyAddress) {
      setMapCoordinates(null);
      return;
    }

    const fetchCoordinates = async () => {
      setIsLoadingCoordinates(true);
      try {
        // ジオコーディングAPIを呼び出す
        const response = await fetch(`/api/geocoding?address=${encodeURIComponent(propertyAddress)}`);
        if (response.ok) {
          const data = await response.json();
          setMapCoordinates({ lat: data.lat, lng: data.lng });
        } else {
          setMapCoordinates(null);
        }
      } catch (error) {
        console.error('Failed to fetch coordinates:', error);
        setMapCoordinates(null);
      } finally {
        setIsLoadingCoordinates(false);
      }
    };

    fetchCoordinates();
  }, [propertyAddress]);

  // 地図を表示しない条件
  if (!propertyAddress || !isMapLoaded || (!isLoadingCoordinates && !mapCoordinates)) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          🗺️ 物件位置
        </Typography>
      </Box>
      
      {isLoadingCoordinates && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!isLoadingCoordinates && mapCoordinates && (
        <Box sx={{ borderRadius: '8px', overflow: 'hidden' }}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCoordinates}
            zoom={DEFAULT_ZOOM}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            <Marker position={mapCoordinates} />
          </GoogleMap>
        </Box>
      )}
    </Paper>
  );
};

export default PropertyMapSection;
```

### 8.2 CallModePage.tsx への統合（抜粋）

```tsx
import PropertyMapSection from '../components/PropertyMapSection';

// ... 既存のコード ...

return (
  <Container maxWidth="lg" sx={{ mt: 4 }}>
    {/* 物件情報セクション */}
    <Paper sx={{ p: 2, mb: 3 }}>
      {/* 物件情報の表示 */}
    </Paper>

    {/* 地図セクション（新規追加） */}
    <PropertyMapSection propertyAddress={seller?.propertyAddress} />

    {/* 売主情報セクション */}
    <Paper sx={{ p: 2, mb: 3 }}>
      {/* 売主情報の表示 */}
    </Paper>
  </Container>
);
```

## 9. テストケース

### 9.1 正常系テスト

| テストケース | 入力 | 期待結果 |
|------------|------|---------|
| TC-1 | 物件住所が設定されている | 地図が表示され、ピンが正しい位置に表示される |
| TC-2 | 地図のズーム操作 | ズームイン/ズームアウトが正常に動作する |
| TC-3 | 地図のドラッグ操作 | 地図を移動できる |

### 9.2 異常系テスト

| テストケース | 入力 | 期待結果 |
|------------|------|---------|
| TC-4 | 物件住所が未設定 | 地図が表示されない（エラーメッセージも表示されない） |
| TC-5 | ジオコーディング失敗 | 地図が表示されない（エラーメッセージも表示されない） |
| TC-6 | Google Maps API読み込み失敗 | 地図が表示されない |

### 9.3 パフォーマンステスト

| テストケース | 期待結果 |
|------------|---------|
| TC-7 | 地図の読み込みが3秒以内に完了する |
| TC-8 | 地図の読み込み中も他のセクションは正常に表示される |

## 10. 非機能要件の実現方法

### 10.1 パフォーマンス
- 地図の読み込みは非同期で行う（`useEffect`を使用）
- ジオコーディングAPIのレスポンスをキャッシュ（オプション）
- タイムアウト処理を実装（3秒）

### 10.2 エラーハンドリング
- ジオコーディング失敗時は地図を表示しない
- エラーメッセージは表示しない（ユーザー体験を損なわないため）
- コンソールにエラーログを出力（デバッグ用）

### 10.3 保守性
- 地図表示ロジックを独立したコンポーネントに分離
- 公開物件サイトの地図実装と同じパターンを使用
- コードの重複を避ける

## 11. セキュリティ考慮事項

### 11.1 APIキー管理
- Google Maps APIキーは環境変数で管理
- フロントエンドでAPIキーを直接使用しない（バックエンド経由）

### 11.2 入力検証
- 物件住所のサニタイズ処理
- ジオコーディングAPIのレスポンス検証

## 12. 今後の拡張可能性

### 12.1 短期的な拡張
- 地図のスタイルカスタマイズ
- カスタムマーカーアイコン
- 物件周辺の施設情報表示

### 12.2 長期的な拡張
- ストリートビュー表示
- ルート検索機能
- 複数物件の同時表示
- 地図の印刷機能

---

**作成日:** 2026年2月4日  
**作成者:** Kiro AI Assistant  
**ステータス:** レビュー待ち
