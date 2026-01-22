# 物件座標データ自動同期ガイド

## 問題の概要

物件の座標データ（latitude/longitude）がNULLになる問題が発生しています。

---

## 根本原因

### 1. スプレッドシートに座標データがない

**物件リストスプレッドシート**には以下のカラムがあります：
- `所在地`（住所）
- `Google Map URL`

しかし、**座標データ（緯度・経度）のカラムはありません**。

### 2. 同期サービスが座標を処理していない

`PropertyListingSyncService`は以下のフィールドを同期しますが：
- `address` ← `所在地`
- `google_map_url` ← `Google Map URL`

**座標データ（latitude/longitude）は同期していません**。

### 3. 自動取得機能が実装されていない

現在のシステムには、以下の機能がありません：
- Google Map URLから座標を抽出
- 住所からジオコーディング（Geocoding API）
- 座標データの自動保存

---

## 解決策

### ✅ 解決策1: 同期時に座標を自動取得する

**実装場所**: `PropertyListingSyncService.ts`

**処理フロー**:
1. スプレッドシートから物件データを取得
2. `google_map_url`または`address`から座標を取得
3. 座標データをデータベースに保存

**実装例**:
```typescript
// PropertyListingSyncService.ts

private async getCoordinates(
  googleMapUrl: string | null,
  address: string | null
): Promise<{ lat: number; lng: number } | null> {
  // 1. Google Map URLから座標を抽出
  if (googleMapUrl) {
    const coords = await this.extractCoordinatesFromUrl(googleMapUrl);
    if (coords) return coords;
  }
  
  // 2. 住所からジオコーディング
  if (address) {
    const coords = await this.geocodeAddress(address);
    if (coords) return coords;
  }
  
  return null;
}

private async extractCoordinatesFromUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  // Google Map URLから座標を抽出
  const coordMatch = url.match(/[@\/](-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2])
    };
  }
  
  // 短縮URLの場合は展開
  if (url.includes('share.google') || url.includes('goo.gl')) {
    // URLを展開して座標を抽出
    // ...
  }
  
  return null;
}

private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await axios.get(geocodeUrl);
    
    if (response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  
  return null;
}
```

**mapSellerToPropertyListingメソッドを修正**:
```typescript
private async mapSellerToPropertyListing(seller: any): Promise<any> {
  // 座標を取得
  const coordinates = await this.getCoordinates(
    seller.google_map_url,
    seller.address
  );
  
  return {
    property_number: seller.property_number,
    // ... 他のフィールド
    google_map_url: seller.google_map_url,
    latitude: coordinates?.lat || null,
    longitude: coordinates?.lng || null,
    // ...
  };
}
```

---

### ✅ 解決策2: 既存物件の座標を一括更新する

**実装場所**: `backend/backfill-all-property-coordinates.ts`（既存）

**使用方法**:
```bash
cd backend
npx ts-node backfill-all-property-coordinates.ts
```

このスクリプトは：
1. 座標がNULLの物件を検索
2. Google Map URLまたは住所から座標を取得
3. データベースを更新

---

### ✅ 解決策3: Google Maps APIキーの設定を確認する

**エラー**: 「このページでは Google マップが正しく読み込まれませんでした」

**原因**: Google Maps APIキーの問題

**確認項目**:

#### 1. APIキーが設定されているか

**フロントエンド**: `frontend/.env`
```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**バックエンド**: `backend/.env`
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

#### 2. APIが有効になっているか

Google Cloud Consoleで以下のAPIを有効にする：
- **Maps JavaScript API** （フロントエンドの地図表示用）
- **Geocoding API** （住所から座標を取得用）

#### 3. 請求アカウントが設定されているか

Google Maps APIは無料枠がありますが、**請求アカウントの設定が必須**です。

#### 4. APIキーの制限を確認

**リファラー制限**:
- フロントエンドのAPIキーは、本番環境のドメインを許可する必要があります
- 例: `https://property-site-frontend-kappa.vercel.app/*`

**API制限**:
- Maps JavaScript API
- Geocoding API

---

## 今後の対応

### 必須対応

1. **PropertyListingSyncServiceに座標取得機能を追加**
   - `getCoordinates()`メソッドを実装
   - `mapSellerToPropertyListing()`で座標を設定

2. **既存物件の座標を一括更新**
   - `backfill-all-property-coordinates.ts`を実行

3. **Google Maps APIキーを確認**
   - フロントエンドとバックエンドの両方
   - APIが有効になっているか確認
   - 請求アカウントが設定されているか確認

### 推奨対応

1. **座標データのバリデーション**
   - 座標がNULLの場合は警告を表示
   - 定期的に座標データをチェック

2. **エラーハンドリング**
   - Geocoding APIのエラーをログに記録
   - リトライ機能を実装

3. **パフォーマンス最適化**
   - Geocoding APIのレート制限を考慮
   - キャッシュ機能を実装

---

## まとめ

### 問題の本質

- **スプレッドシートに座標データがない**
- **同期サービスが座標を処理していない**
- **自動取得機能が実装されていない**

### 解決方法

1. **同期時に座標を自動取得する機能を実装**
2. **既存物件の座標を一括更新**
3. **Google Maps APIキーを正しく設定**

### 重要なポイント

- **座標データは必須** → 地図表示に必要
- **自動取得が必要** → 手動更新は非効率
- **APIキーの設定が重要** → エラーの原因になる

---

**このガイドに従うことで、座標データの問題を恒久的に解決できます。**
