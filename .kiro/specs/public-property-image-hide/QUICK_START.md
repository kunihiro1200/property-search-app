# Quick Start: Image Hide/Unhide Testing

## ✅ Prerequisites Completed
- [x] Migration 077 executed successfully
- [x] `hidden_images` column added to `property_listings` table
- [x] Error handling added to `getHiddenImages()` method
- [x] Hide/unhide API endpoints implemented
- [x] Test script prepared
- [x] Duplicate method definitions fixed

## 🚀 Ready to Test

### Step 1: Verify Backend is Running
```bash
cd backend
npm run dev
```

The server should be running on `http://localhost:3000`

### Step 2: Run the Test Script
```bash
cd backend
npx ts-node test-hide-unhide-images.ts
```

### Expected Test Output
```
🧪 画像非表示/復元機能テスト開始

1️⃣ 初期状態を確認中...
✅ 初期非表示画像数: 0枚

2️⃣ 画像を非表示にする (fileId: 17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA)...
✅ Image 17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA has been hidden

3️⃣ 非表示後の状態を確認中...
✅ 非表示画像数: 1枚
   非表示画像: 17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA
✅ テスト画像が非表示リストに含まれています

4️⃣ 画像一覧を取得中...
✅ 表示可能画像数: 29枚
✅ 非表示画像が画像一覧から除外されています

5️⃣ 画像を復元する (fileId: 17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA)...
✅ Image 17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA has been unhidden

6️⃣ 復元後の状態を確認中...
✅ 非表示画像数: 0枚
✅ テスト画像が非表示リストから削除されています

7️⃣ 画像一覧を再取得中...
✅ 表示可能画像数: 30枚
✅ 復元された画像が画像一覧に含まれています
   画像名: 1205　間取　AA13129.jpg

8️⃣ 重複防止のテスト...
   同じ画像を2回非表示にします...
✅ 重複防止が正常に動作しています（出現回数: 1）

9️⃣ クリーンアップ中...
✅ テスト画像を復元しました

🎉 すべてのテストが成功しました！

📝 確認事項:
   ✅ 画像を非表示にできる
   ✅ 非表示画像が画像一覧から除外される
   ✅ 画像を復元できる
   ✅ 復元された画像が画像一覧に表示される
   ✅ 重複防止が正常に動作する
```

## 🔍 Manual Testing via API

### 1. Get Hidden Images List
```bash
curl http://localhost:3000/api/property-listings/593c43f9-8e10-4eea-8209-6484911f3364/hidden-images
```

Expected response:
```json
{
  "hiddenImages": [],
  "count": 0
}
```

### 2. Hide an Image
```bash
curl -X POST http://localhost:3000/api/property-listings/593c43f9-8e10-4eea-8209-6484911f3364/hide-image \
  -H "Content-Type: application/json" \
  -d '{"fileId": "17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Image 17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA has been hidden"
}
```

### 3. Verify Image is Hidden
```bash
curl http://localhost:3000/api/property-listings/593c43f9-8e10-4eea-8209-6484911f3364/hidden-images
```

Expected response:
```json
{
  "hiddenImages": ["17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA"],
  "count": 1
}
```

### 4. Unhide the Image
```bash
curl -X POST http://localhost:3000/api/property-listings/593c43f9-8e10-4eea-8209-6484911f3364/unhide-image \
  -H "Content-Type: application/json" \
  -d '{"fileId": "17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Image 17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA has been unhidden"
}
```

## 🐛 Troubleshooting

### Error: "Could not find the 'hidden_images' column"
**Solution:** The schema cache needs to be reloaded.

```bash
cd backend
npx ts-node reload-schema-cache.ts
```

Wait a few seconds, then try again.

### Error: "ECONNREFUSED"
**Solution:** Backend server is not running.

```bash
cd backend
npm run dev
```

### Error: "Property not found"
**Solution:** The property ID in the test script doesn't exist. Update the `PROPERTY_ID` constant in `test-hide-unhide-images.ts` with a valid property ID.

## 📋 Test Data

**Property:** AA13129  
**Property ID:** `593c43f9-8e10-4eea-8209-6484911f3364`  
**Test Image:** `1205　間取　AA13129.jpg`  
**File ID:** `17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA`

## ✅ Success Criteria

All tests should pass with:
- ✅ Images can be hidden
- ✅ Hidden images are excluded from image list
- ✅ Images can be unhidden
- ✅ Unhidden images appear in image list
- ✅ Duplicate prevention works correctly

## 🎯 Next Steps After Testing

1. **Frontend Implementation**
   - Add hide/unhide buttons to `PropertyImageGallery.tsx`
   - Add API methods to `frontend/src/services/api.ts`
   - Add visual indicators for hidden images

2. **Public Site Integration**
   - Ensure public property site respects hidden images
   - Test image display on public property detail page

3. **User Documentation**
   - Create user guide for hiding/unhiding images
   - Add tooltips and help text in UI
