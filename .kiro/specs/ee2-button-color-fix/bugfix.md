# Bugfix Requirements Document

## Introduction

公開物件サイト（`frontend/`）の地図表示（`PropertyMapView`）において、地図上のマーカーをクリックすると表示されるInfoWindow内の「詳細を見る」ボタン（以下「EE2ボタン」）の色が、物件のステータスに関わらず常に青色（`#2196F3`）で表示されるバグが存在する。

成約済み物件（`atbb_status` が「非公開」を含み「配信メール」を含まない場合）の場合、EE2ボタンはグレー（`#9e9e9e`）で表示されるべきであるが、現在は青色のままになっている。

影響範囲：`frontend/src/components/PropertyMapView.tsx`

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 地図表示モードで成約済み物件（`atbb_status` が成約済み判定）のマーカーをクリックしてInfoWindowを開く THEN EE2ボタン（「詳細を見る」）が青色（`#2196F3`）で表示される

1.2 WHEN 地図表示モードで成約済み物件のInfoWindowが表示されている THEN EE2ボタンの色が販売中物件のボタンと同じ青色になっており、成約済みであることが視覚的に区別できない

### Expected Behavior (Correct)

2.1 WHEN 地図表示モードで成約済み物件（`atbb_status` が成約済み判定）のマーカーをクリックしてInfoWindowを開く THEN EE2ボタン（「詳細を見る」）がグレー（`#9e9e9e`）で表示される

2.2 WHEN 地図表示モードで成約済み物件のInfoWindowが表示されている THEN EE2ボタンの色がグレーになっており、成約済みであることが視覚的に識別できる

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 地図表示モードで販売中物件（`atbb_status` が「公開中」を含む）のマーカーをクリックしてInfoWindowを開く THEN EE2ボタン（「詳細を見る」）が引き続き青色（`#2196F3`）で表示される

3.2 WHEN 地図表示モードで公開前物件（`atbb_status` が「公開前」を含む）のマーカーをクリックしてInfoWindowを開く THEN EE2ボタンがオレンジ色（`#ff9800`）で表示される（または適切な色で表示される）

3.3 WHEN 地図上のマーカーの色 THEN 成約済み物件のマーカーが引き続きグレー（`#9e9e9e`）で表示される（マーカー色の変更なし）

3.4 WHEN InfoWindowの「詳細を見る」ボタンをクリックする THEN 物件詳細ページへのナビゲーション動作が引き続き正常に機能する

3.5 WHEN 地図表示モードで非公開物件（配信メールのみ）のマーカーをクリックしてInfoWindowを開く THEN EE2ボタンが赤色（`#f44336`）で表示される（または適切な色で表示される）
