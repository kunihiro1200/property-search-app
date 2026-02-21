# 買主リスト - 近隣物件一覧画面のテーブル表示項目変更 - タスクリスト

## タスク

- [x] 1. データベース確認と準備
  - [x] 1.1 `property_listings`テーブルに`pet_allowed`カラムが存在するか確認
    - Supabase SQL Editorで確認
    - 存在しない場合は次のタスクへ
    - _要件: Phase 1_
  
  - [x] 1.2 `pet_allowed`カラムを追加（存在しない場合のみ）
    - マイグレーションファイルを作成
    - `ALTER TABLE property_listings ADD COLUMN pet_allowed TEXT;`
    - Supabaseで実行
    - _要件: Phase 1_
  
  - [x] 1.3 `property_about`カラムが存在するか確認
    - Supabase SQL Editorで確認
    - 既に存在するはず（BQ列から同期済み）
    - _要件: Phase 1_

- [x] 2. スプレッドシート同期サービスの修正（必要な場合）
  - [x] 2.1 `pet_allowed`カラムの同期を追加
    - `backend/src/services/PropertyListingSyncService.ts`を確認
    - BB列（インデックス53）から`pet_allowed`を取得
    - 既に同期されている場合はスキップ
    - _要件: Phase 2_

- [x] 3. バックエンドAPIの修正
  - [x] 3.1 `GET /api/buyers/:id/nearby-properties`エンドポイントを修正
    - `backend/src/routes/buyers.ts`を編集
    - レスポンスに`pet_allowed`と`property_about`を明示的に追加
    - _要件: Phase 2, 要件 3.2_
  
  - [x] 3.2 APIレスポンスのテスト
    - ローカル環境でAPIを起動
    - `curl http://localhost:3001/api/buyers/<buyer_number>/nearby-properties?propertyNumber=<property_number>`
    - レスポンスに`pet_allowed`と`property_about`が含まれることを確認
    - _要件: Phase 2_

- [x] 4. フロントエンドの修正
  - [x] 4.1 `PropertyListing`インターフェースを修正
    - `frontend/src/pages/BuyerNearbyPropertiesPage.tsx`を編集
    - `pet_allowed?: string;`を追加
    - `property_about?: string;`を追加
    - `listing_price`、`land_area`、`building_area`を削除
    - _要件: Phase 3, 要件 3.1_
  
  - [x] 4.2 `formatPropertyAbout`関数を実装
    - 50文字を超える場合は省略表示
    - `undefined`の場合は`'-'`を返す
    - _要件: Phase 3, 要件 5.2_
  
  - [x] 4.3 `hasApartment`判定ロジックを実装
    - `nearbyProperties.some(p => p.property_type === 'マンション')`
    - マンションが含まれる場合のみ「ペット」列を表示
    - _要件: Phase 3, 要件 5.1_
  
  - [x] 4.4 テーブルヘッダーを変更
    - 「売出価格」を削除
    - 「土地面積」「建物面積」を削除
    - 「ペット」を追加（`hasApartment`が`true`の場合のみ）
    - 「内覧前伝達事項」を追加
    - _要件: Phase 3, 要件 2.1_
  
  - [x] 4.5 テーブルボディを変更
    - 「売出価格」セルを削除
    - 「土地面積」「建物面積」セルを削除
    - 「ペット」セルを追加（`hasApartment`が`true`の場合のみ）
    - 「内覧前伝達事項」セルを追加（`formatPropertyAbout`を使用）
    - _要件: Phase 3, 要件 2.1_
  
  - [x] 4.6 `colSpan`を修正
    - 「近隣物件が見つかりませんでした」のメッセージ
    - `colSpan={10}`を`colSpan={8}`または`colSpan={9}`に変更（マンションの有無による）
    - _要件: Phase 3_

- [-] 5. テスト
  - [x] 5.1 ローカル環境でテスト
    - バックエンドを起動: `cd backend && npm run dev`
    - フロントエンドを起動: `cd frontend && npm run dev`
    - 買主詳細ページを開く
    - 「近隣物件」ボタンをクリック
    - _要件: Phase 4_
  
  - [x] 5.2 マンションが含まれる場合のテスト
    - 近隣物件にマンションが含まれる買主を選択
    - 「ペット」列が表示されることを確認
    - マンション物件の「ペット」セルに値が表示されることを確認
    - マンション以外の物件の「ペット」セルに`'-'`が表示されることを確認
    - _要件: Phase 4, 成功指標 3_
  
  - [x] 5.3 マンションが含まれない場合のテスト
    - 近隣物件にマンションが含まれない買主を選択
    - 「ペット」列が表示されないことを確認
    - _要件: Phase 4, 成功指標 4_
  
  - [x] 5.4 内覧前伝達事項のテスト
    - 「内覧前伝達事項」列が表示されることを確認
    - 50文字を超える内覧前伝達事項が省略表示されることを確認
    - _要件: Phase 4, 成功指標 1_
  
  - [x] 5.5 削除された列のテスト
    - 「売出価格」列が表示されないことを確認
    - 「土地面積」列が表示されないことを確認
    - 「建物面積」列が表示されないことを確認
    - _要件: Phase 4, 成功指標 2_

- [ ] 6. デプロイ
  - [ ] 6.1 バックエンドをデプロイ
    - `cd backend && vercel --prod`
    - デプロイ完了を確認
    - _要件: Phase 4_
  
  - [ ] 6.2 フロントエンドをデプロイ
    - `cd frontend && vercel --prod`
    - デプロイ完了を確認
    - _要件: Phase 4_
  
  - [ ] 6.3 本番環境で動作確認
    - 買主詳細ページを開く
    - 「近隣物件」ボタンをクリック
    - テーブル表示を確認
    - _要件: Phase 4_

## 注意事項

- すべてのタスクは必須の実装タスクです
- `property_about`は既に`property_listings`テーブルに存在します（BQ列から同期済み）
- `pet_allowed`カラムが存在しない場合は、マイグレーションを作成して追加する必要があります
- 「ペット」列はマンションが含まれる場合のみ表示されます
- システム隔離ルールを遵守し、買主リスト専用のファイルのみを変更してください

## 成功指標

- ✅ 近隣物件一覧画面のテーブルに「価格」「ペット」（マンションの場合のみ）「内覧前伝達事項」が表示される
- ✅ 「売出価格」「土地面積」「建物面積」が表示されない
- ✅ マンション物件の場合、「ペット」列が表示される
- ✅ マンション以外の物件の場合、「ペット」列が表示されない

---

**作成日**: 2026年2月11日  
**作成理由**: 買主担当者が近隣物件を効率的に比較検討できるようにするため
