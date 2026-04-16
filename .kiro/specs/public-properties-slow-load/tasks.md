# 実装計画

- [x] 1. バグ条件の探索テストを作成する
  - **Property 1: Bug Condition** - N+1クエリ & viewMode 強制設定欠落
  - **重要**: このテストは修正前のコードで実行し、**失敗することを確認する**（バグの存在を証明）
  - **目的**: バグが存在することを示すカウンターエグザンプルを記録する
  - **スコープ付きPBTアプローチ**: 決定論的なバグのため、具体的な失敗ケースにスコープを絞る
  - **バックエンドバグ（N+1クエリ）の探索**:
    - `price=null` の物件が1件以上存在する状態で `GET /api/public/properties` を呼び出す
    - `isBugCondition_backend(properties)`: `COUNT(p WHERE p.price IS NULL) > 0` かつ `supabaseQueryCount = 1 + nullPriceCount`
    - 期待される動作（修正後）: `supabaseQueryCount = 1`（個別クエリなし）
    - 修正前のコードで実行 → **失敗を期待**（N+1クエリが実行されることを確認）
    - カウンターエグザンプルを記録（例: 「20件中15件が price=null → 16クエリ実行」）
  - **フロントエンドバグ（viewMode 強制設定欠落）の探索**:
    - 地図ビュー（`viewMode='map'`）で物件詳細ページに遷移し、戻るボタンで一覧に戻る
    - `isBugCondition_frontend(navigationState)`: `navigationState.viewMode IS NULL` かつ `previousViewMode WAS 'map'`
    - 期待される動作（修正後）: `viewMode = 'list'` かつ `fetchAllProperties()` が呼ばれない
    - 修正前のコードで実行 → **失敗を期待**（`viewMode='map'` のまま残り `fetchAllProperties()` が実行される）
    - カウンターエグザンプルを記録（例: 「地図ビューから戻ると fetchAllProperties() が実行され20秒以上かかる」）
  - テストを実行し、失敗を確認したらタスク完了とする
  - _Requirements: 1.2, 1.3_

- [x] 2. 保全プロパティテストを作成する（修正前に実施）
  - **Property 2: Preservation** - 既存フィルター・ページネーション・状態復元の動作保全
  - **重要**: 観察優先メソドロジーに従う
  - **観察フェーズ（修正前のコードで実施）**:
    - `isBugCondition_backend` が false（全物件の price が設定済み）の場合の動作を観察
    - `isBugCondition_frontend` が false（リストビューから詳細ページに遷移して戻る）の場合の動作を観察
    - フィルター（物件タイプ・価格・築年数）を適用した状態でのレスポンスを記録
    - ページネーション（page=1, page=2 など）のレスポンスを記録
    - リストビューから詳細ページに遷移して戻る際のスクロール位置・ページ番号・フィルター状態を記録
  - **プロパティベーステストの作成**:
    - 任意のフィルター条件（物件タイプ・価格・築年数）に対して、修正前後のレスポンスが一致することを検証
    - 任意のページ番号に対して、修正前後のレスポンスが一致することを検証
    - `price` が設定済みの物件は修正前後で同じ値が返されることを検証
    - リストビューから詳細ページに遷移して戻る場合、`fetchAllProperties()` が呼ばれないことを検証
  - 修正前のコードでテストを実行し、**全て通過することを確認**（ベースライン動作の確認）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. パフォーマンス問題の修正

  - [x] 3.1 バックエンド: N+1クエリを排除する（`backend/api/index.ts`）
    - `/api/public/properties` エンドポイントの `Promise.all` による個別クエリループを削除する
    - `PropertyListingService.getPublicProperties()` が返す各物件に対して `sales_price || listing_price || 0` でインライン計算する
    - 修正前のコード（削除対象）:
      ```typescript
      const propertiesWithPrice = await Promise.all(
        (result.properties || []).map(async (property) => {
          if (property.price !== null && property.price !== undefined) {
            return property;
          }
          const { data: dbProperty, error } = await supabase
            .from('property_listings')
            .select('sales_price, listing_price')
            .eq('id', property.id)
            .single();
          // ...
        })
      );
      ```
    - 修正後のコード（同期処理に置き換え）:
      ```typescript
      const propertiesWithPrice = (result.properties || []).map((property) => {
        if (property.price !== null && property.price !== undefined) {
          return property;
        }
        const calculatedPrice = property.sales_price || property.listing_price || 0;
        return { ...property, price: calculatedPrice };
      });
      ```
    - 注意: `backend/api/` のみ編集すること（`backend/src/` は売主管理システム用）
    - _Bug_Condition: isBugCondition_backend(properties) where COUNT(p.price IS NULL) > 0_
    - _Expected_Behavior: supabaseQueryCount = 1、全物件に price フィールドが設定される_
    - _Preservation: price が設定済みの物件はそのまま返す、sales_price と listing_price の両方が null の場合は price=0_
    - _Requirements: 2.3, 3.1, 3.2_

  - [x] 3.2 フロントエンド: viewMode 強制設定を復元する（`frontend/src/pages/PublicPropertiesPage.tsx`）
    - 詳細ページから戻ってきた際の状態復元処理で、`viewMode` が保存されていない場合に `'list'` へのフォールバックが機能するよう修正する
    - 現在のコードを確認し、`NavigationState` に `viewMode` が保存されていない場合のフォールバック処理を追加する
    - 修正方針: 詳細ページへの遷移時に `viewMode` を `NavigationState` に含める処理を追加する、または `sessionStorage` に `viewMode` を保存して復元する
    - 修正後の動作: 地図ビューで詳細ページに遷移後、戻るボタンで一覧に戻ると `viewMode` が強制的に `'list'` に設定され、`fetchAllProperties()` が実行されない
    - 注意: `frontend/` ディレクトリを編集すること
    - _Bug_Condition: isBugCondition_frontend(navigationState) where navigationState.viewMode IS NULL AND previousViewMode WAS 'map'_
    - _Expected_Behavior: viewMode = 'list'、fetchAllProperties() が呼ばれない_
    - _Preservation: フィルター・ページ番号・スクロール位置の復元は引き続き動作すること_
    - _Requirements: 2.2, 3.4_

  - [x] 3.3 バグ条件の探索テストが通過することを確認する
    - **Property 1: Expected Behavior** - N+1クエリ排除 & viewMode 強制設定
    - **重要**: タスク1で作成した**同じテスト**を再実行する（新しいテストを書かない）
    - タスク1のテストは期待される動作をエンコードしている
    - このテストが通過することで、バグが修正されたことを確認する
    - バックエンド: `supabaseQueryCount = 1` かつ全物件に `price` が設定されていることを確認
    - フロントエンド: `viewMode = 'list'` かつ `fetchAllProperties()` が呼ばれないことを確認
    - **期待される結果**: テストが通過する（バグ修正の確認）
    - _Requirements: 2.2, 2.3_

  - [x] 3.4 保全テストが引き続き通過することを確認する
    - **Property 2: Preservation** - 既存フィルター・ページネーション・状態復元の動作保全
    - **重要**: タスク2で作成した**同じテスト**を再実行する（新しいテストを書かない）
    - 修正後のコードでテストを実行し、全て通過することを確認する
    - フィルター・ページネーション・状態復元の動作が修正前と同じであることを確認する
    - **期待される結果**: 全テストが通過する（リグレッションなし）

- [x] 4. チェックポイント - 全テストの通過確認
  - 全てのテストが通過していることを確認する
  - ページ表示時間が5秒以内であることを確認する（修正前: 約20秒）
  - 地図ビューで詳細ページに遷移後、戻るボタンで一覧に戻る際に `viewMode='list'` になることを確認する
  - フィルター・ページネーション・スクロール位置の復元が正常に動作することを確認する
  - デプロイ: `git push`（main ブランチへのプッシュで Vercel が自動デプロイ）
  - 疑問点があればユーザーに確認する
