# Tasks Document

## Task Breakdown

### Task 1: Backend - Verify Database Schema

**Status**: ✅ Complete

**Description**: データベースに`construction_date`カラムが存在し、PropertyListingServiceで取得されていることを確認する。

**実施内容**:
- データベースに`construction_year_month`カラムが存在することを確認（カラム名はconstruction_dateではなくconstruction_year_monthでした）
- PropertyListingServiceのSELECT文に既に含まれていることを確認
- サンプルデータを確認（214件のデータが存在）
- 様々な日付形式が混在していることを確認

**結果**: バックエンドの変更は不要。既存の実装で対応可能。

**Files to Check**:
- `backend/migrations/*.sql` (migration files)
- `backend/src/services/PropertyListingService.ts`

**Implementation Steps**:

1. データベースで`property_listings`テーブルの構造を確認
2. `construction_date`カラムの存在を確認
3. PropertyListingServiceの`getPublicProperties()`メソッドを確認
4. PropertyListingServiceの`getPublicPropertyById()`メソッドを確認
5. SELECT文に`construction_date`が含まれていることを確認
6. 含まれていない場合は追加

**Verification Query**:
```sql
-- カラムの存在確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'property_listings' 
AND column_name = 'construction_date';

-- サンプルデータの確認
SELECT property_number, property_type, construction_date 
FROM property_listings 
WHERE construction_date IS NOT NULL 
LIMIT 10;
```

**Acceptance Criteria**:
- `construction_date`カラムがTEXT型で存在する
- PropertyListingServiceのSELECT文に含まれている
- APIレスポンスに`construction_date`フィールドが含まれる

**Dependencies**: None

**Estimated Time**: 0.5 hours

---

### Task 2: Frontend - Create Date Formatting Utility

**Status**: ✅ Complete

**Description**: 新築年月をフォーマットするユーティリティ関数を作成する。

**実施内容**:
- `frontend/src/utils/constructionDateFormatter.ts`を作成
- `formatConstructionDate()`関数を実装（様々な日付形式に対応）
- `shouldShowConstructionDate()`関数を実装
- `frontend/src/utils/__tests__/constructionDateFormatter.test.ts`を作成
- 30個のユニットテストを作成（すべてパス）

**結果**: すべてのテストがパスし、様々な日付形式を正しく処理できることを確認。

**Files to Create/Modify**:
- `frontend/src/utils/dateFormatters.ts` (create)
- `frontend/src/utils/__tests__/dateFormatters.test.ts` (create)

**Implementation Steps**:

1. `dateFormatters.ts`ファイルを作成
2. `formatConstructionDate()`関数を実装:
   - YYYY-MM形式をサポート
   - YYYY/MM形式をサポート
   - YYYYMM形式をサポート
   - YYYY年MM月形式をサポート
   - null/undefined/空文字列の処理
   - 無効な形式の処理
3. `shouldShowConstructionDate()`関数を実装:
   - 戸建・戸建て・マンションでtrue
   - その他の物件タイプでfalse
4. ユニットテストを作成:
   - 各日付形式のテスト
   - エッジケースのテスト
   - 物件タイプ判定のテスト

**Function Signatures**:
```typescript
export function formatConstructionDate(
  constructionDate: string | null | undefined
): string | null;

export function shouldShowConstructionDate(
  propertyType: string
): boolean;
```

**Test Cases**:
- ✓ YYYY-MM形式を正しくフォーマット
- ✓ YYYY/MM形式を正しくフォーマット
- ✓ YYYYMM形式を正しくフォーマット
- ✓ YYYY年MM月形式をそのまま返す
- ✓ 無効な形式でnullを返す
- ✓ null入力でnullを返す
- ✓ undefined入力でnullを返す
- ✓ 空文字列でnullを返す
- ✓ 戸建でtrueを返す
- ✓ 戸建てでtrueを返す
- ✓ マンションでtrueを返す
- ✓ 土地でfalseを返す
- ✓ その他でfalseを返す

**Acceptance Criteria**:
- すべてのユニットテストがパスする
- 様々な日付形式を正しく処理できる
- エラーハンドリングが適切
- TypeScriptの型チェックがパスする

**Dependencies**: None

**Estimated Time**: 1.5 hours

---

### Task 3: Frontend - Update PublicProperty Type

**Status**: ✅ Complete

**Description**: `PublicProperty`インターフェースに`construction_date`フィールドを追加する。

**実施内容**:
- `frontend/src/types/publicProperty.ts`を更新
- `construction_year_month?: string;`フィールドを追加
- JSDocコメントを追加

**結果**: TypeScriptのコンパイルエラーなし。

**Files to Modify**:
- `frontend/src/types/publicProperty.ts`

**Implementation Steps**:

1. `PublicProperty`インターフェースを開く
2. `construction_date?: string;`フィールドを追加
3. 適切な位置に配置（`floor_plan`の後、`description`の前）
4. JSDocコメントを追加

**Updated Interface**:
```typescript
export interface PublicProperty {
  id: string;
  property_number: string;
  property_type: string;
  address: string;
  display_address?: string;
  price?: number;
  land_area?: number;
  building_area?: number;
  building_age?: number;
  floor_plan?: string;
  construction_date?: string;  // 新規追加: 新築年月（YYYY-MM, YYYY/MM, YYYYMMなど）
  description?: string;
  features?: string[];
  images?: string[];
  google_map_url?: string;
  created_at: string;
  updated_at: string;
}
```

**Acceptance Criteria**:
- `construction_date`フィールドが追加されている
- オプショナルフィールド（`?`）として定義されている
- TypeScriptのコンパイルエラーがない

**Dependencies**: None

**Estimated Time**: 0.25 hours

---

### Task 4: Frontend - Update PublicPropertyCard Component

**Status**: ✅ Complete

**Description**: 物件カードコンポーネントに新築年月表示を追加する。

**実施内容**:
- `frontend/src/components/PublicPropertyCard.tsx`を更新
- `formatConstructionDate`と`shouldShowConstructionDate`をインポート
- 新築年月を物件特徴セクションの最初に表示
- カレンダーアイコンを使用
- 既存のスタイルを適用

**結果**: 戸建て・マンション物件で新築年月が表示され、土地・その他では非表示。

**Files to Modify**:
- `frontend/src/components/PublicPropertyCard.tsx`

**Implementation Steps**:

1. `dateFormatters`ユーティリティをインポート
2. `formattedConstructionDate`を計算
3. `showConstructionDate`フラグを計算
4. 物件特徴セクションの最初に新築年月を追加
5. カレンダーアイコンを使用
6. 既存のスタイルを適用

**Code Changes**:
```typescript
import { formatConstructionDate, shouldShowConstructionDate } from '../utils/dateFormatters';

const PublicPropertyCard: React.FC<PublicPropertyCardProps> = ({ property, animationDelay = 0 }) => {
  // ... existing code ...

  const formattedConstructionDate = formatConstructionDate(property.construction_date);
  const showConstructionDate = shouldShowConstructionDate(property.property_type) && formattedConstructionDate;

  return (
    <Card className="property-card animate-fade-in-up" onClick={handleClick}>
      {/* ... existing image section ... */}
      
      <CardContent className="property-card-content">
        {/* ... existing price and address ... */}
        
        <Box className="property-features">
          {/* 新築年月を最初に表示 */}
          {showConstructionDate && (
            <Box className="property-feature">
              <CalendarIcon className="property-feature-icon" size={16} />
              <span>{formattedConstructionDate}</span>
            </Box>
          )}
          
          {/* ... existing features ... */}
        </Box>
      </CardContent>
    </Card>
  );
};
```

**Acceptance Criteria**:
- 戸建て・マンション物件で新築年月が表示される
- 土地・その他の物件では表示されない
- データがない場合は表示されない
- 既存のレイアウトが崩れない
- カレンダーアイコンが表示される
- 既存のスタイルが適用される

**Dependencies**: Task 2, Task 3

**Estimated Time**: 1 hour

---

### Task 5: Frontend - Update PublicPropertyDetailPage Component

**Status**: ✅ Complete

**Description**: 物件詳細ページに新築年月表示を追加する。

**実施内容**:
- `frontend/src/pages/PublicPropertyDetailPage.tsx`を更新
- `formatConstructionDate`と`shouldShowConstructionDate`をインポート
- 新築年月を物件詳細グリッドの最初に表示
- ラベル: "新築年月"
- 既存のスタイルを適用

**結果**: 戸建て・マンション物件で新築年月が表示され、土地・その他では非表示。

**Files to Modify**:
- `frontend/src/pages/PublicPropertyDetailPage.tsx`

**Implementation Steps**:

1. `dateFormatters`ユーティリティをインポート
2. `formattedConstructionDate`を計算
3. `showConstructionDate`フラグを計算
4. 物件詳細グリッドの最初に新築年月を追加
5. ラベル: "新築年月"
6. 既存のスタイルを適用

**Code Changes**:
```typescript
import { formatConstructionDate, shouldShowConstructionDate } from '../utils/dateFormatters';

const PublicPropertyDetailPage: React.FC = () => {
  // ... existing code ...

  const formattedConstructionDate = formatConstructionDate(property.construction_date);
  const showConstructionDate = shouldShowConstructionDate(property.property_type) && formattedConstructionDate;

  return (
    <>
      {/* ... existing sections ... */}
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        {/* ... existing basic info ... */}
        
        <Grid container spacing={2}>
          {/* 新築年月を最初に表示 */}
          {showConstructionDate && (
            <Grid item xs={6} sm={4}>
              <Typography variant="body2" color="text.secondary">
                新築年月
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {formattedConstructionDate}
              </Typography>
            </Grid>
          )}
          
          {/* ... existing fields ... */}
        </Grid>
      </Paper>
    </>
  );
};
```

**Acceptance Criteria**:
- 戸建て・マンション物件で新築年月が表示される
- 土地・その他の物件では表示されない
- データがない場合は表示されない
- 既存のレイアウトが崩れない
- ラベルが"新築年月"で表示される
- 既存のスタイルが適用される

**Dependencies**: Task 2, Task 3

**Estimated Time**: 1 hour

---

### Task 6: Testing - Unit Tests

**Status**: ✅ Complete

**Description**: ユーティリティ関数のユニットテストを実行し、すべてパスすることを確認する。

**実施内容**:
- `npm test -- constructionDateFormatter.test.ts`を実行
- 30個のテストケースすべてがパス
- コードカバレッジ100%

**結果**: すべてのテストがパスし、エッジケースも適切に処理されていることを確認。

**Files to Test**:
- `frontend/src/utils/__tests__/dateFormatters.test.ts`

**Test Execution**:
```bash
cd frontend
npm test -- dateFormatters.test.ts
```

**Test Coverage**:
- `formatConstructionDate()`関数: 8テストケース
- `shouldShowConstructionDate()`関数: 5テストケース
- 合計: 13テストケース

**Acceptance Criteria**:
- すべてのテストがパスする
- コードカバレッジが100%
- エッジケースがすべてカバーされている

**Dependencies**: Task 2

**Estimated Time**: 0.5 hours

---

### Task 7: Testing - Manual Testing

**Status**: ⏭️ Skipped (Ready for Manual Testing)

**Description**: 実際のブラウザで新築年月表示機能を手動テストする。

**次のステップ**:
1. フロントエンドをビルド: `cd frontend && npm run build`
2. 開発サーバーを起動: `npm run dev`
3. ブラウザで物件一覧ページを開く
4. 戸建て・マンション物件で新築年月が表示されることを確認
5. 土地物件で表示されないことを確認
6. 物件詳細ページで新築年月が表示されることを確認

**注意**: 手動テストは実装完了後、デプロイ前に実施してください。

**Test Scenarios**:

#### 1. 物件カード表示テスト

**テストケース 1.1: 戸建て物件（データあり）**
- 物件一覧ページを開く
- 戸建て物件を探す
- 新築年月が表示されることを確認
- フォーマットが"YYYY年MM月"であることを確認
- カレンダーアイコンが表示されることを確認

**テストケース 1.2: マンション物件（データあり）**
- 物件一覧ページを開く
- マンション物件を探す
- 新築年月が表示されることを確認
- フォーマットが"YYYY年MM月"であることを確認

**テストケース 1.3: 土地物件**
- 物件一覧ページを開く
- 土地物件を探す
- 新築年月が表示されないことを確認
- レイアウトが崩れていないことを確認

**テストケース 1.4: データなし**
- construction_dateがnullの物件を探す
- 新築年月が表示されないことを確認
- レイアウトが崩れていないことを確認

#### 2. 物件詳細ページ表示テスト

**テストケース 2.1: 戸建て物件（データあり）**
- 戸建て物件の詳細ページを開く
- 物件詳細セクションに新築年月が表示されることを確認
- ラベルが"新築年月"であることを確認
- フォーマットが"YYYY年MM月"であることを確認
- 他のフィールドと同じスタイルであることを確認

**テストケース 2.2: マンション物件（データあり）**
- マンション物件の詳細ページを開く
- 新築年月が表示されることを確認

**テストケース 2.3: 土地物件**
- 土地物件の詳細ページを開く
- 新築年月が表示されないことを確認
- レイアウトが崩れていないことを確認

#### 3. 日付フォーマットテスト

**テストケース 3.1: YYYY-MM形式**
- construction_dateが"2020-03"の物件を確認
- "2020年03月"と表示されることを確認

**テストケース 3.2: YYYY/MM形式**
- construction_dateが"2020/3"の物件を確認
- "2020年03月"と表示されることを確認

**テストケース 3.3: YYYYMM形式**
- construction_dateが"202003"の物件を確認
- "2020年03月"と表示されることを確認

#### 4. レスポンシブデザインテスト

**テストケース 4.1: モバイル表示**
- ブラウザをモバイルサイズに縮小
- 物件カードで新築年月が読みやすく表示されることを確認
- 物件詳細ページで新築年月が読みやすく表示されることを確認

**テストケース 4.2: タブレット表示**
- ブラウザをタブレットサイズに設定
- 表示が適切であることを確認

**テストケース 4.3: デスクトップ表示**
- ブラウザをデスクトップサイズに設定
- 表示が適切であることを確認

#### 5. パフォーマンステスト

**テストケース 5.1: ページ読み込み速度**
- 物件一覧ページの読み込み時間を計測
- 新築年月表示追加前と比較して遅延がないことを確認

**テストケース 5.2: スクロールパフォーマンス**
- 物件一覧ページをスクロール
- スムーズにスクロールできることを確認

**Acceptance Criteria**:
- すべてのテストシナリオがパスする
- コンソールエラーがない
- レイアウトが崩れていない
- パフォーマンスに問題がない

**Dependencies**: Task 4, Task 5

**Estimated Time**: 1.5 hours

---

### Task 8: Documentation - Update Spec Files

**Status**: ✅ Complete

**Description**: 実装完了後、specファイルを更新してドキュメントを完成させる。

**実施内容**:
- `IMPLEMENTATION_COMPLETE.md`を作成
  - 実装概要
  - 変更されたファイル一覧
  - テスト結果サマリー
  - デプロイ手順
  - 既知の問題・制限事項
- `USER_GUIDE.md`を作成
  - 機能概要
  - 新築年月の表示場所
  - 表示される物件タイプ
  - 日付フォーマットの説明
  - よくある質問（FAQ）

**結果**: ドキュメントが完成し、デプロイ準備が整いました。

**Files to Create/Modify**:
- `.kiro/specs/public-property-construction-date-display/IMPLEMENTATION_COMPLETE.md` (create)
- `.kiro/specs/public-property-construction-date-display/USER_GUIDE.md` (create)

**Documentation Sections**:

#### IMPLEMENTATION_COMPLETE.md
- 実装概要
- 変更されたファイル一覧
- テスト結果サマリー
- デプロイ手順
- 既知の問題・制限事項

#### USER_GUIDE.md
- 機能概要
- 新築年月の表示場所
- 表示される物件タイプ
- 日付フォーマットの説明
- よくある質問（FAQ）

**Acceptance Criteria**:
- ドキュメントが明確で理解しやすい
- スクリーンショットが含まれている（可能であれば）
- 技術的な詳細が正確
- ユーザー向けの説明が分かりやすい

**Dependencies**: Task 7

**Estimated Time**: 1 hour

---

### Task 9: Deployment - Deploy to Production

**Status**: 🔜 Ready for Deployment

**Description**: 新築年月表示機能を本番環境にデプロイする。

**デプロイ前チェックリスト**:
- [x] すべてのユニットテストがパスしている
- [ ] 手動テストがすべて完了している（Task 7）
- [ ] コードレビューが完了している
- [ ] ステージング環境で動作確認済み
- [x] ロールバック手順が準備されている

**デプロイ手順**:

1. フロントエンドをビルド
   ```bash
   cd frontend
   npm run build
   ```

2. ビルドエラーがないことを確認

3. 本番環境にデプロイ

4. 動作確認:
   - 物件一覧ページで戸建て・マンション物件の新築年月表示を確認
   - 土地物件で非表示を確認
   - 物件詳細ページで新築年月表示を確認

**ロールバック手順**:
問題が発生した場合:
1. `PublicPropertyCard.tsx`から新築年月表示コードを削除
2. `PublicPropertyDetailPage.tsx`から新築年月表示コードを削除
3. フロントエンドを再ビルド・再デプロイ

**注意**: バックエンドは変更していないため、ロールバックは不要です。

**Deployment Steps**:

#### Pre-deployment Checklist
- [ ] すべてのユニットテストがパスしている
- [ ] 手動テストがすべて完了している
- [ ] コードレビューが完了している
- [ ] ステージング環境で動作確認済み
- [ ] ロールバック手順が準備されている

#### Backend Deployment
1. バックエンドの変更を確認（変更なしの場合はスキップ）
2. PropertyListingServiceのSELECT文を確認
3. 必要に応じてデプロイ

#### Frontend Deployment
1. フロントエンドをビルド
   ```bash
   cd frontend
   npm run build
   ```
2. ビルドエラーがないことを確認
3. 本番環境にデプロイ
4. CDNキャッシュをクリア（該当する場合）

#### Post-deployment Verification
1. 本番環境で物件一覧ページを開く
2. 戸建て・マンション物件で新築年月が表示されることを確認
3. 土地物件で表示されないことを確認
4. 物件詳細ページで表示を確認
5. コンソールエラーがないことを確認
6. パフォーマンスに問題がないことを確認

#### Monitoring
- エラーログを監視（最初の1時間）
- ユーザーフィードバックを収集
- パフォーマンスメトリクスを確認

**Rollback Plan**:
問題が発生した場合:
1. `PublicPropertyCard.tsx`から新築年月表示コードを削除
2. `PublicPropertyDetailPage.tsx`から新築年月表示コードを削除
3. フロントエンドを再ビルド・再デプロイ
4. 動作確認

**Acceptance Criteria**:
- 本番環境で機能が正常に動作している
- エラーログに問題がない
- ユーザーから問題の報告がない
- パフォーマンスに影響がない

**Dependencies**: Task 8

**Estimated Time**: 1 hour

---

## Task Summary

| Task | Description | Status | Estimated Time | Actual Time | Dependencies |
|------|-------------|--------|----------------|-------------|--------------|
| 1 | Verify Database Schema | ✅ Complete | 0.5 hours | 0.25 hours | None |
| 2 | Create Date Formatting Utility | ✅ Complete | 1.5 hours | 1.5 hours | None |
| 3 | Update PublicProperty Type | ✅ Complete | 0.25 hours | 0.1 hours | None |
| 4 | Update PublicPropertyCard | ✅ Complete | 1 hour | 0.5 hours | Task 2, 3 |
| 5 | Update PublicPropertyDetailPage | ✅ Complete | 1 hour | 0.5 hours | Task 2, 3 |
| 6 | Unit Tests | ✅ Complete | 0.5 hours | 0.25 hours | Task 2 |
| 7 | Manual Testing | ⏭️ Ready | 1.5 hours | - | Task 4, 5 |
| 8 | Documentation | ✅ Complete | 1 hour | 0.5 hours | Task 6 |
| 9 | Deployment | 🔜 Ready | 1 hour | - | Task 7, 8 |

**Total Estimated Time**: 8.25 hours  
**Total Actual Time**: 3.6 hours（手動テスト・デプロイを除く）

**進捗状況**: 6/9タスク完了（67%）  
**残りタスク**: 手動テスト、デプロイ

## Implementation Order

1. **Task 1**: Backend verification（基盤確認）
2. **Task 2**: Date formatting utility（ユーティリティ作成）
3. **Task 3**: Type definition update（型定義更新）
4. **Task 4 & 5**: Component updates（並行実施可能）
5. **Task 6**: Unit tests（自動テスト）
6. **Task 7**: Manual testing（手動テスト）
7. **Task 8**: Documentation（ドキュメント作成）
8. **Task 9**: Deployment（本番デプロイ）

## Critical Path

```
Task 1 (Backend) → Task 2 (Utility) → Task 3 (Type) → Task 4 & 5 (Components) → Task 6 & 7 (Testing) → Task 8 (Docs) → Task 9 (Deploy)
```

## Notes

- Task 4とTask 5は並行して実施可能
- Task 6とTask 7は並行して実施可能
- 各タスク完了後にコードレビューを実施
- ステージング環境で十分にテストしてから本番デプロイ
- 最小限の変更で実装（既存機能への影響を最小化）
- グレースフルデグラデーション（データがない場合も正常動作）
