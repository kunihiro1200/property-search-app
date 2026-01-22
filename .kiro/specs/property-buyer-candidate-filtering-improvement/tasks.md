# Tasks Document

## Task 1: 除外条件メソッドの実装

**Status**: pending

**Description**: 買主を除外するための条件を評価するメソッドを実装する

**Implementation Details**:
1. `shouldExcludeBuyer()` メソッドを実装
   - 業者問合せフラグのチェック
   - 完全除外条件（希望エリアと希望種別が両方空欄）のチェック
   - 配信種別のチェック
2. `isBusinessInquiry()` メソッドを実装
   - `broker_inquiry` フィールドをチェック
3. `hasMinimumCriteria()` メソッドを実装
   - 希望エリアまたは希望種別のいずれかが入力されているかチェック
4. `hasDistributionRequired()` メソッドを実装
   - 配信種別が「要」であるかチェック

**Acceptance Criteria**:
- 業者問合せフラグがtrueの買主が除外される
- 希望エリアと希望種別が両方空欄の買主が除外される
- 配信種別が「要」でない買主が除外される
- 単体テストが通過する

**Dependencies**: None

**Estimated Effort**: 2 hours

---

## Task 2: 最新状況マッチングメソッドの実装

**Status**: complete

**Description**: 最新状況と問い合わせ時確度に基づいて買主をフィルタリングするメソッドを実装する

**Implementation Details**:
1. `matchesStatus()` メソッドを実装
   - 最新状況が「A」または「B」を含むかチェック
   - 最新状況が空欄の場合、問い合わせ時確度が「A」または「B」かチェック
2. 既存の `matchesStatusCriteria()` メソッドを `matchesStatus()` に置き換え

**Acceptance Criteria**:
- 最新状況が「A」を含む買主がマッチする
- 最新状況が「B」を含む買主がマッチする
- 最新状況が空欄で問い合わせ時確度が「A」の買主がマッチする
- 最新状況が空欄で問い合わせ時確度が「B」の買主がマッチする
- 上記以外の買主がマッチしない
- 単体テストが通過する

**Dependencies**: None

**Estimated Effort**: 1 hour

---

## Task 3: 希望種別マッチングメソッドの改善

**Status**: complete

**Description**: 希望種別に基づいて買主をフィルタリングするメソッドを改善する

**Implementation Details**:
1. `matchesPropertyType()` メソッドを更新
   - 希望種別が「指定なし」の場合、マッチとする
   - 希望種別が空欄の場合、除外する（現在の実装では含めている）
   - 希望種別が物件種別と一致する場合、マッチとする
2. 既存の `matchesPropertyTypeCriteria()` メソッドを更新

**Acceptance Criteria**:
- 希望種別が「指定なし」の買主がマッチする
- 希望種別が物件種別と一致する買主がマッチする
- 希望種別が空欄の買主が除外される
- 希望種別が物件種別と一致しない買主が除外される
- 単体テストが通過する

**Dependencies**: None

**Estimated Effort**: 1.5 hours

---

## Task 4: 価格帯マッチングメソッドの改善

**Status**: pending

**Description**: 価格帯に基づいて買主をフィルタリングするメソッドを改善する

**Implementation Details**:
1. `matchesPriceRange()` メソッドを更新
   - 希望価格帯が「指定なし」の場合、マッチとする
   - 希望価格帯が空欄の場合、マッチとする
   - 希望価格帯が「～1900万円」の場合、物件価格が1900万円以下ならマッチ
   - 希望価格帯が「1000万～2999万円」の場合、物件価格が範囲内ならマッチ
   - 希望価格帯が「2000万円以上」の場合、物件価格が2000万円以上ならマッチ
2. 既存の `matchesPriceCriteria()` メソッドを更新

**Acceptance Criteria**:
- 希望価格帯が「指定なし」の買主がマッチする
- 希望価格帯が空欄の買主がマッチする
- 希望価格帯が「～1900万円」で物件価格が1900万円以下の買主がマッチする
- 希望価格帯が「1000万～2999万円」で物件価格が範囲内の買主がマッチする
- 希望価格帯が「2000万円以上」で物件価格が2000万円以上の買主がマッチする
- 物件価格が範囲外の買主が除外される
- 単体テストが通過する

**Dependencies**: None

**Estimated Effort**: 2 hours

---

## Task 5: エリアマッチングメソッドの改善

**Status**: pending

**Description**: エリアに基づいて買主をフィルタリングするメソッドを改善し、問い合わせ履歴も考慮する

**Implementation Details**:
1. `matchesArea()` メソッドを更新
   - 希望エリアが空欄の場合、除外する（現在の実装では含めている）
   - 希望エリアが物件のエリアと一致する場合、マッチとする
   - 希望エリアが一致しない場合、問い合わせ履歴をチェック
2. `hasInquiryHistory()` メソッドを実装
   - 買主IDと物件種別、エリアを受け取る
   - `inquiry_histories` テーブルから過去の問い合わせを検索
   - 同じエリア・種別の物件を問い合わせた履歴があればtrueを返す
3. 既存の `matchesAreaCriteria()` メソッドを更新

**Acceptance Criteria**:
- 希望エリアが物件のエリアと一致する買主がマッチする
- 希望エリアが空欄の買主が除外される
- 希望エリアが一致しないが過去に同じエリア・種別の物件を問い合わせた買主がマッチする
- 希望エリアが一致せず問い合わせ履歴もない買主が除外される
- 単体テストが通過する

**Dependencies**: None

**Estimated Effort**: 3 hours

---

## Task 6: フィルタリングロジックの統合

**Status**: pending

**Description**: 各条件メソッドを統合し、評価順序を最適化する

**Implementation Details**:
1. `filterCandidates()` メソッドを更新
   - 除外条件を先に評価（早期リターン）
   - マッチング条件を順次評価
   - 評価順序: 業者問合せ → 完全除外条件 → 配信種別 → 最新状況 → 希望種別 → 価格帯 → エリア
2. 既存のフィルタリングロジックを新しいメソッドに置き換え

**Acceptance Criteria**:
- 除外条件が先に評価される
- 除外された買主に対してマッチング条件が評価されない
- すべての条件を満たす買主のみが候補リストに含まれる
- 統合テストが通過する

**Dependencies**: Task 1, Task 2, Task 3, Task 4, Task 5

**Estimated Effort**: 2 hours

---

## Task 7: 単体テストの作成

**Status**: pending

**Description**: 各メソッドの単体テストを作成する

**Implementation Details**:
1. `shouldExcludeBuyer()` のテスト
   - 業者問合せフラグがtrueの場合
   - 希望エリアと希望種別が両方空欄の場合
   - 配信種別が「要」でない場合
2. `matchesStatus()` のテスト
   - 最新状況が「A」「B」を含む場合
   - 最新状況が空欄で問い合わせ時確度が「A」「B」の場合
3. `matchesPropertyType()` のテスト
   - 希望種別が「指定なし」の場合
   - 希望種別が物件種別と一致する場合
   - 希望種別が空欄の場合
4. `matchesPriceRange()` のテスト
   - 希望価格帯が「指定なし」の場合
   - 希望価格帯が範囲内の場合
   - 希望価格帯が範囲外の場合
5. `matchesArea()` のテスト
   - 希望エリアが一致する場合
   - 希望エリアが空欄の場合
   - 問い合わせ履歴がある場合

**Acceptance Criteria**:
- すべての単体テストが通過する
- テストカバレッジが80%以上
- エッジケースがカバーされている

**Dependencies**: Task 1, Task 2, Task 3, Task 4, Task 5

**Estimated Effort**: 4 hours

---

## Task 8: 統合テストの作成

**Status**: pending

**Description**: エンドツーエンドの統合テストを作成する

**Implementation Details**:
1. テストデータの準備
   - 正常系: すべての条件を満たす買主
   - 異常系: 各除外条件に該当する買主
   - 境界値: 価格帯の境界値、エリアの境界値
2. `getCandidatesForProperty()` のテスト
   - 実際の物件番号を使用
   - 候補リストが正しく取得されることを確認
   - 複数の絞り込み条件が組み合わさった場合の動作を確認
3. パフォーマンステスト
   - 大量の買主データに対する処理時間を測定
   - 最大50件の制限が正しく機能することを確認

**Acceptance Criteria**:
- すべての統合テストが通過する
- エンドツーエンドのシナリオがカバーされている
- パフォーマンスが許容範囲内

**Dependencies**: Task 6, Task 7

**Estimated Effort**: 3 hours

---

## Task 9: ドキュメントの更新

**Status**: pending

**Description**: API仕様書とユーザーガイドを更新する

**Implementation Details**:
1. API仕様書の更新
   - エンドポイントの説明を更新
   - レスポンス形式を更新
   - エラーハンドリングを記載
2. ユーザーガイドの作成
   - 絞り込み条件の説明
   - 使用例の記載
   - トラブルシューティング

**Acceptance Criteria**:
- API仕様書が最新の実装を反映している
- ユーザーガイドが分かりやすく記載されている
- 例が正確で実用的

**Dependencies**: Task 6

**Estimated Effort**: 2 hours

---

## Task 10: コードレビューとデプロイ

**Status**: pending

**Description**: コードレビューを実施し、本番環境にデプロイする

**Implementation Details**:
1. コードレビューの実施
   - コードの品質を確認
   - テストカバレッジを確認
   - パフォーマンスを確認
2. ステージング環境でのテスト
   - 実際のデータを使用してテスト
   - 既存機能への影響を確認
3. 本番環境へのデプロイ
   - デプロイ手順の実行
   - デプロイ後の動作確認

**Acceptance Criteria**:
- コードレビューが完了している
- ステージング環境でのテストが通過している
- 本番環境で正常に動作している

**Dependencies**: Task 8, Task 9

**Estimated Effort**: 2 hours

---

## Summary

**Total Tasks**: 10
**Total Estimated Effort**: 22.5 hours
**Critical Path**: Task 1-6 → Task 7 → Task 8 → Task 9 → Task 10
