# Bugfix Requirements Document

## Introduction

公開物件一覧ページ（`/public/properties`）で物件カードの画像がグレーのまま表示されない。

コミット `67d0a04` で `via.placeholder.com` への依存を削除した際、`folder-thumbnail` エンドポイントのフォールバック処理も同時に削除された。さらに、`skipImages=true` でAPIを呼び出す設計に変更されたにもかかわらず、`PublicPropertyCard` コンポーネントに `folder-thumbnail` エンドポイントを使った遅延ロードのロジックが実装されていない。

その結果、APIは `images: []`（空配列）を返し、カードは常に「画像なし」状態になっている。

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 一覧ページが `skipImages=true` でAPIを呼び出す THEN APIは `images: []`（空配列）を返す

1.2 WHEN `PublicPropertyCard` が `property.images` が空の物件を受け取る THEN コンポーネントは `thumbnailUrl = null` と判定し、グレーの「画像なし」ボックスを表示する

1.3 WHEN `folder-thumbnail` エンドポイントが画像を見つけられない THEN エンドポイントは 404 JSON を返す（以前はプレースホルダー画像にリダイレクトしていた）

1.4 WHEN `folder-thumbnail` エンドポイントでエラーが発生する THEN エンドポイントは 500 JSON を返す（以前はプレースホルダー画像にリダイレクトしていた）

### Expected Behavior (Correct)

2.1 WHEN 一覧ページが `skipImages=true` でAPIを呼び出す THEN APIは `images: []` に加えて `storage_location`（Google DriveフォルダURL）を含む物件データを返す

2.2 WHEN `PublicPropertyCard` が `storage_location` を持つ物件を受け取る THEN コンポーネントは `storage_location` からフォルダIDを抽出し、`/api/public/folder-thumbnail/:folderId` エンドポイントを `src` に設定した `<img>` タグを表示する

2.3 WHEN `folder-thumbnail` エンドポイントが画像を見つけられない THEN エンドポイントは SVG などのインライン画像（プレースホルダー）を返し、ブラウザコンソールに 404 エラーを出さない

2.4 WHEN `folder-thumbnail` エンドポイントでエラーが発生する THEN エンドポイントはプレースホルダー画像を返し、ブラウザコンソールにエラーを出さない

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `skipImages=false`（デフォルト）でAPIを呼び出す THEN システムは SHALL CONTINUE TO 通常の画像取得処理（Google Drive API経由）を実行し、`images` 配列に画像データを返す

3.2 WHEN 物件詳細ページが画像を取得する THEN システムは SHALL CONTINUE TO 既存の画像取得エンドポイント（`/api/public/properties/:id/images`）を使用して画像を表示する

3.3 WHEN `storage_location` が null または空の物件カードを表示する THEN システムは SHALL CONTINUE TO 「画像なし」状態を適切に表示する（クラッシュしない）

3.4 WHEN 地図ビューで物件を表示する THEN システムは SHALL CONTINUE TO `map-properties` エンドポイントを使用し、画像なしで座標データのみを取得する

---

## Bug Condition (Pseudocode)

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type PublicPropertyCardProps
  OUTPUT: boolean

  // skipImages=true でAPIを呼び出した結果、images が空配列で
  // かつ storage_location が存在する物件カードが表示される場合にバグが発生
  RETURN X.property.images.length = 0
    AND X.property.storage_location IS NOT NULL
    AND X.property.storage_location != ''
END FUNCTION
```

### Property: Fix Checking

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  rendered ← render(PublicPropertyCard(X))
  ASSERT rendered contains <img> tag with src = "/api/public/folder-thumbnail/{folderId}"
  ASSERT rendered does NOT show "画像なし" box
END FOR
```

### Property: Preservation Checking

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT render(PublicPropertyCard(X)) = render(PublicPropertyCard'(X))
END FOR
```
