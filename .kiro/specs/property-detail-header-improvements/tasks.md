# 実装計画: 物件詳細ページヘッダー改善

## 概要

物件リスト管理画面の物件詳細ページ（PropertyListingDetailPage.tsx）において、物件番号のワンクリックコピー機能と買主候補リストへのアクセス改善を実装します。

## タスク

- [x] 1. 物件番号コピー機能の実装
  - PropertyListingDetailPage.tsxのヘッダー部分に物件番号コピーボタンを追加
  - ContentCopyIconをインポート
  - handleCopyPropertyNumber関数を実装
  - クリップボードAPIを使用して物件番号をコピー
  - コピー成功時にスナックバー通知を表示
  - コピー失敗時にエラー通知を表示
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 物件番号コピー機能のプロパティテストを作成
  - **プロパティ2: クリップボードへのコピー**
  - **検証: 要件1.2**
  - fast-checkを使用してランダムな物件番号でテスト
  - 最低100回実行

- [x] 2. 買主候補リストボタンの実装
  - [x] 2.1 State管理の追加
    - buyerCandidateCount stateを追加
    - buyerCandidateLoading stateを追加
    - _要件: 2.2_
  
  - [x] 2.2 買主候補件数取得APIの実装
    - fetchBuyerCandidateCount関数を実装
    - /api/property-listings/${propertyNumber}/buyer-candidatesエンドポイントを呼び出し
    - response.data.totalをbuyerCandidateCountに設定
    - エラー時でもボタンは機能するようにする
    - useEffectでページロード時に実行
    - _要件: 2.2, 2.5_
  
  - [x] 2.3 買主候補リストボタンのUI実装
    - ヘッダーエリアにButtonコンポーネントを追加
    - PersonIconを追加
    - 候補件数バッジ（Chip）を追加
    - SECTION_COLORS.propertyを使用したスタイリング
    - _要件: 2.1, 2.2_
  
  - [x] 2.4 ボタンクリックハンドラーの実装
    - handleOpenBuyerCandidates関数を実装
    - window.openで新しいタブを開く
    - URLは/property-listings/${propertyNumber}/buyer-candidates
    - noopener, noreferrerオプションを指定
    - _要件: 2.3, 2.4_

- [ ]* 2.5 買主候補リストボタンのプロパティテストを作成
  - **プロパティ6: 候補件数バッジの表示**
  - **プロパティ7: 新しいタブでの買主候補リストページ表示**
  - **検証: 要件2.2, 2.3, 2.4**
  - fast-checkを使用してランダムな物件番号と候補件数でテスト
  - 最低100回実行

- [x] 3. 既存コンポーネントの削除
  - 右カラム（Grid item xs={12} lg={4}）からBuyerCandidateListコンポーネントを削除
  - CompactBuyerListForPropertyコンポーネントは残す
  - _要件: 3.2_

- [ ]* 3.1 既存機能の維持を確認するユニットテストを作成
  - BuyerCandidateListコンポーネントが削除されていることを確認
  - 保存ボタン、Gmail配信ボタンが正常に動作することを確認
  - _要件: 3.1, 3.2_

- [x] 4. チェックポイント - 動作確認
  - 物件詳細ページを開いて、物件番号コピーボタンが表示されることを確認
  - コピーボタンをクリックして、クリップボードに物件番号がコピーされることを確認
  - スナックバー通知が表示されることを確認
  - 買主候補リストボタンが表示されることを確認
  - 候補件数バッジが表示されることを確認
  - ボタンをクリックして、新しいタブで買主候補リストページが開くことを確認
  - 右カラムのBuyerCandidateListコンポーネントが削除されていることを確認
  - 既存の機能（保存ボタン、Gmail配信ボタン）が正常に動作することを確認
  - 全てのテストがパスすることを確認
  - ユーザーに質問があれば確認する

## 注意事項

- Material-UIのテーマカラー（SECTION_COLORS.property）を使用する
- 既存のヘッダーデザインと統一感を保つ
- Clipboard APIはHTTPS環境でのみ動作する
- window.openにはnoopener, noreferrerオプションを指定する
- APIエラー時でもボタンは機能するようにする
- 既存のURLやAPIエンドポイントは変更しない（後方互換性）
- 物件リスト管理画面のみの変更（システム隔離ルール）
