# バックエンドルート修正 - 完了報告

## 修正日時
2026-01-11

## 問題の概要

**問題**: `/public/properties/AA9313`にアクセスすると500エラー（Internal Server Error）が発生

**原因**: 
- バックエンドのルート`/properties/:id`がUUIDのみを期待していた
- フロントエンドは物件番号（AA9313）を使用してURLを生成していた
- 物件番号で検索するメソッドが存在しなかった

## 修正内容

### 1. publicProperties.tsのルート修正

**修正前**:
```typescript
router.get('/properties/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const property = await propertyListingService.getPublicPropertyById(id);
  // ...
});
```

**修正後**:
```typescript
router.get('/properties/:identifier', async (req: Request, res: Response): Promise<void> => {
  const { identifier } = req.params;

  // UUIDの形式かどうかをチェック
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = uuidRegex.test(identifier);

  let property;
  
  if (isUUID) {
    // UUIDの場合は既存のメソッドを使用
    property = await propertyListingService.getPublicPropertyById(identifier);
  } else {
    // 物件番号の場合は物件番号で検索
    property = await propertyListingService.getPublicPropertyByNumber(identifier);
  }
  // ...
});
```

**変更点**:
- パラメータ名を`:id`から`:identifier`に変更
- UUIDか物件番号かを判定するロジックを追加
- 物件番号の場合は新しいメソッド`getPublicPropertyByNumber`を呼び出す

### 2. PropertyListingService.tsに新しいメソッドを追加

```typescript
// 公開物件詳細取得（物件番号で検索）
async getPublicPropertyByNumber(propertyNumber: string) {
  try {
    const { data, error } = await this.supabase
      .from('property_listings')
      .select('id, property_number, property_type, address, price, land_area, building_area, construction_year_month, floor_plan, image_url, google_map_url, distribution_areas, atbb_status, special_notes, storage_location, created_at, updated_at')
      .eq('property_number', propertyNumber)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Supabase query error: ${error.message}`);
    }
    
    // クリック可能な物件のみ詳細ページを表示
    if (!this.isPropertyClickable(data.atbb_status)) {
      console.log(`[PropertyListingService] Property ${propertyNumber} is not clickable (atbb_status: ${data.atbb_status})`);
      return null;
    }
    
    // 物件タイプを英語に変換してフロントエンドに返す
    return {
      ...data,
      property_type: this.convertPropertyTypeToEnglish(data.property_type)
    };
  } catch (error: any) {
    console.error('Error in getPublicPropertyByNumber:', error);
    throw new Error(`Failed to fetch public property: ${error.message}`);
  }
}
```

**機能**:
- 物件番号で`property_listings`テーブルを検索
- クリック可能な物件のみ返す（`isPropertyClickable`チェック）
- 物件タイプを英語に変換

## 後方互換性

この修正により、以下の両方のURLが動作します：

1. **UUID形式**（既存）: `/public/properties/593c43f9-8e10-4eea-8209-6484911f3364`
2. **物件番号形式**（新規）: `/public/properties/AA9313`

既存のUUID形式のURLも引き続き動作するため、後方互換性が保たれています。

## 動作確認

### 確認手順

1. **バックエンドを再起動**:
```bash
cd backend
npm run dev
```

2. **ブラウザで確認**:
- http://localhost:5173/public/properties/AA9313
- 物件詳細ページが正常に表示されることを確認

3. **APIエンドポイントを直接テスト**:
```bash
curl http://localhost:3000/api/public/properties/AA9313
```

### 期待される動作

- ✅ 物件番号でアクセスできる
- ✅ UUIDでもアクセスできる（後方互換性）
- ✅ 存在しない物件番号の場合は404エラー
- ✅ クリック不可能な物件の場合は404エラー

## 影響範囲

### 変更されたファイル

1. `backend/src/routes/publicProperties.ts` - ルート定義の修正
2. `backend/src/services/PropertyListingService.ts` - 新しいメソッドの追加

### 影響を受けるエンドポイント

- ✅ `GET /api/public/properties/:identifier` - 物件番号とUUIDの両方に対応

### 影響を受けないエンドポイント

- `GET /api/public/properties` - 物件一覧（変更なし）
- `GET /api/public/properties/:id/images` - 画像一覧（変更なし）
- その他のエンドポイント（変更なし）

## 次のステップ

1. **バックエンドを再起動**
2. **動作確認**
3. **必要に応じてテストを追加**

## まとめ

✅ **修正完了**: 物件番号とUUIDの両方で公開物件詳細にアクセスできるようになりました

**主な変更**:
- ルートパラメータを柔軟に処理
- 物件番号で検索する新しいメソッドを追加
- 後方互換性を維持

**次のステップ**:
- バックエンドを再起動して動作確認
