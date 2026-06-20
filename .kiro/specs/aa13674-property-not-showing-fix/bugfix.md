# Bugfix Requirements Document

## Introduction

公開物件サイト（`https://property-site-frontend-kappa.vercel.app/public/properties`）において、複数の絞り込み条件（エリア: 大分市品域南、物件タイプ: 土地、公開中のみ表示: ON）を同時に指定すると、AA13674が検索結果に表示されない。コンソールには `400 ()` エラーが発生しており、APIリクエスト自体が失敗している。

バグの根本原因は `backend/api/src/services/PropertyListingService.ts` の `getPublicProperties` メソッドにおける Supabase クエリの構築方法にある。複数の `.or()` 条件を連鎖させると Supabase の PostgREST API が予期しない動作をし、特定の条件の組み合わせで 400 エラーが発生する。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN エリア（location）・物件タイプ（types）・公開中のみ表示（showPublicOnly=true）の3条件を同時に指定して絞り込みを実行する THEN システムは 400 エラーを返し、物件一覧が表示されない

1.2 WHEN 上記の条件で絞り込みが失敗する THEN システムは「地図に表示できる物件がありません（座標情報が必要です）」と表示し、AA13674を含む全ての物件が表示されない

1.3 WHEN `showPublicOnly=true` かつ他のフィルター条件が存在する THEN システムは Supabase クエリで複数の `.or()` 条件が競合し、400 Bad Request エラーを返す

### Expected Behavior (Correct)

2.1 WHEN エリア（location）・物件タイプ（types）・公開中のみ表示（showPublicOnly=true）の3条件を同時に指定して絞り込みを実行する THEN システムは SHALL 全条件を正しく AND 結合したクエリを実行し、条件に合致する物件（AA13674を含む）を返す

2.2 WHEN 上記の条件で絞り込みが成功する THEN システムは SHALL AA13674を検索結果の一覧に表示する

2.3 WHEN `showPublicOnly=true` かつ他のフィルター条件が存在する THEN システムは SHALL 全フィルター条件を正しく組み合わせた有効な Supabase クエリを構築し、400 エラーなしに結果を返す

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 絞り込み条件を何も指定しない THEN システムは SHALL CONTINUE TO 全物件を正常に一覧表示する

3.2 WHEN 物件タイプのみを指定して絞り込む THEN システムは SHALL CONTINUE TO 指定した物件タイプの物件のみを正常に表示する

3.3 WHEN エリア（location）のみを指定して絞り込む THEN システムは SHALL CONTINUE TO 指定したエリアに合致する物件のみを正常に表示する

3.4 WHEN 公開中のみ表示（showPublicOnly=true）のみを指定して絞り込む THEN システムは SHALL CONTINUE TO atbb_statusに「公開中」を含む物件のみを正常に表示する

3.5 WHEN 価格帯フィルターを指定して絞り込む THEN システムは SHALL CONTINUE TO 指定した価格帯に合致する物件のみを正常に表示する

3.6 WHEN 地図ビューで絞り込み条件を指定する THEN システムは SHALL CONTINUE TO 座標情報がある物件を地図上に正常に表示する

---

## Bug Condition (Pseudocode)

**Bug Condition Function**:
```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type FilterParams
  OUTPUT: boolean

  // 複数のフィルター条件が同時に指定されており、
  // showPublicOnly=true が含まれる場合にバグが発生する
  RETURN X.showPublicOnly = true
    AND (X.location IS NOT NULL OR X.propertyType IS NOT NULL OR X.priceRange IS NOT NULL)
END FUNCTION
```

**Property: Fix Checking**:
```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← getPublicProperties'(X)
  ASSERT result.status = 200
  ASSERT result.properties IS NOT NULL
  ASSERT no_400_error(result)
END FOR
```

**Property: Preservation Checking**:
```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT getPublicProperties(X) = getPublicProperties'(X)
END FOR
```
