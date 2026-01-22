# Tasks Document: 専任件数の割合の計算式修正と表示改善

## Task Breakdown

### Task 1: Backend - 計算ロジックの修正
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 2 hours

#### Subtasks
1.1. `PerformanceMetricsService.ts` の `calculateExclusiveContracts` メソッドを修正
   - 訪問数を取得するクエリを追加（visit_date基準）
   - 一般媒介数を取得するクエリを追加（contract_year_month基準）
   - 分母の計算を修正: `訪問数 - 一般媒介数`
   - ゼロ除算のエラーハンドリングを追加

1.2. レスポンス構造を拡張
   - `numerator`（専任件数）を追加
   - `denominator`（訪問数 - 一般媒介数）を追加
   - `visitCount`（訪問数）を追加
   - `generalAgencyCount`（一般媒介数）を追加

1.3. 営担別の計算も同様に修正
   - 各営担ごとに訪問数、一般媒介数を集計
   - 各営担ごとに分母を計算
   - 各営担ごとに割合を計算

#### Acceptance Criteria
- [ ] 訪問数が visit_date 基準で正しくカウントされる
- [ ] 一般媒介数が contract_year_month 基準で正しくカウントされる
- [ ] 分母が `訪問数 - 一般媒介数` で計算される
- [ ] ゼロ除算時に rate = 0 を返す
- [ ] レスポンスに numerator, denominator, visitCount, generalAgencyCount が含まれる
- [ ] 営担別の計算も正しく動作する

#### Files to Modify
- `backend/src/services/PerformanceMetricsService.ts`

---

### Task 2: Backend - 型定義の更新
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 30 minutes

#### Subtasks
2.1. `RepresentativeMetric` インターフェースを拡張
   - `numerator: number` を追加
   - `denominator: number` を追加
   - `visitCount: number` を追加
   - `generalAgencyCount: number` を追加

2.2. `RepresentativeMetricWithAverage` インターフェースも同様に拡張

2.3. `ExclusiveContractsMetric` の total 型を更新

#### Acceptance Criteria
- [ ] 型定義が正しく更新される
- [ ] TypeScript のコンパイルエラーがない
- [ ] 既存のコードとの互換性が保たれる

#### Files to Modify
- `backend/src/services/PerformanceMetricsService.ts`
- `backend/src/types/index.ts` (必要に応じて)

---

### Task 3: Frontend - MetricCard コンポーネントの拡張
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 1.5 hours

#### Subtasks
3.1. `MetricCardProps` インターフェースを拡張
   - `formulaLabel?: string` を追加（計算式の説明）
   - `formulaWithNumbers?: string` を追加（実際の数字を使った計算式）

3.2. 表示レイアウトを修正
   - 計算式の説明を上部に表示（小さめのフォント）
   - パーセンテージ値を中央に表示（大きめのフォント）
   - 実際の数字を使った計算式を下部に表示（小さめのフォント）

3.3. スタイリングの調整
   - 計算式の説明: `text-xs text-gray-600 font-medium`
   - 実際の数字: `text-xs text-gray-500`
   - 適切な余白を設定

#### Acceptance Criteria
- [ ] formulaLabel が上部に表示される
- [ ] formulaWithNumbers が下部に表示される
- [ ] パーセンテージ値が中央に大きく表示される
- [ ] レイアウトが崩れない
- [ ] 他のメトリクスカードとの一貫性が保たれる

#### Files to Modify
- `frontend/src/components/MetricCard.tsx`

---

### Task 4: Frontend - PerformanceMetricsSection の更新
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 1 hour

#### Subtasks
4.1. 型定義を更新
   - `ExclusiveContractsMetric` の型を拡張
   - `RepresentativeMetricWithAverage` の型を拡張

4.2. MetricCard に新しい props を渡す
   - `formulaLabel` を設定: "専任件数 ÷ (訪問数 - 一般媒介数)"
   - `formulaWithNumbers` を動的に生成
   - 例: `"3 ÷ (12 - 1) = 27.3%"`

4.3. 計算式の文字列を生成する関数を作成
   ```typescript
   const generateFormulaString = (
     numerator: number,
     visitCount: number,
     generalAgencyCount: number,
     rate: number
   ): string => {
     return `${numerator} ÷ (${visitCount} - ${generalAgencyCount}) = ${rate.toFixed(1)}%`;
   };
   ```

#### Acceptance Criteria
- [ ] formulaLabel が正しく設定される
- [ ] formulaWithNumbers が動的に生成される
- [ ] 実際の数字が正しく表示される
- [ ] TypeScript のコンパイルエラーがない

#### Files to Modify
- `frontend/src/components/PerformanceMetricsSection.tsx`

---

### Task 5: Testing - バックエンドのテスト
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 2 hours

#### Subtasks
5.1. 検証スクリプトの作成
   - `backend/test-exclusive-contract-rate-fix.ts` を作成
   - 2025年11月のデータで検証
   - 営担 I の結果が 27.3% になることを確認

5.2. ユニットテストの作成
   - 正常系のテスト
   - ゼロ除算のテスト
   - 空データのテスト
   - 複数営担のテスト

5.3. 統合テストの実行
   - 実際のデータベースでテスト
   - 各営担の結果を確認
   - パフォーマンスを測定

#### Acceptance Criteria
- [ ] 検証スクリプトが正常に実行される
- [ ] 営担 I の2025年11月の結果が 27.3% になる
- [ ] すべてのユニットテストがパスする
- [ ] 統合テストがパスする
- [ ] クエリのパフォーマンスが許容範囲内（< 200ms）

#### Files to Create
- `backend/test-exclusive-contract-rate-fix.ts`
- `backend/src/services/__tests__/PerformanceMetricsService.exclusiveRate.test.ts`

---

### Task 6: Testing - フロントエンドのテスト
**Status:** Not Started  
**Priority:** Medium  
**Estimated Time:** 1.5 hours

#### Subtasks
6.1. MetricCard コンポーネントのテスト
   - formulaLabel の表示テスト
   - formulaWithNumbers の表示テスト
   - レイアウトのテスト

6.2. PerformanceMetricsSection のテスト
   - 計算式の文字列生成テスト
   - props の渡し方のテスト

6.3. 手動テスト
   - ブラウザで実際に表示を確認
   - 各営担の表示を確認
   - レスポンシブデザインを確認

#### Acceptance Criteria
- [ ] コンポーネントテストがパスする
- [ ] 手動テストで表示が正しいことを確認
- [ ] レスポンシブデザインが正常に動作する

#### Files to Create/Modify
- `frontend/src/components/__tests__/MetricCard.test.tsx`
- `frontend/src/components/__tests__/PerformanceMetricsSection.test.tsx`

---

### Task 7: Documentation - ドキュメントの更新
**Status:** Not Started  
**Priority:** Low  
**Estimated Time:** 1 hour

#### Subtasks
7.1. コードコメントの更新
   - `calculateExclusiveContracts` メソッドのコメントを更新
   - 計算式の説明を追加
   - 具体例を追加

7.2. ユーザーガイドの更新
   - 専任件数の割合の計算方法を説明
   - 画面の表示内容を説明
   - 具体例を追加

7.3. 実装完了レポートの作成
   - 変更内容のサマリー
   - テスト結果
   - 既知の問題点

#### Acceptance Criteria
- [ ] コードコメントが更新される
- [ ] ユーザーガイドが更新される
- [ ] 実装完了レポートが作成される

#### Files to Create/Modify
- `backend/src/services/PerformanceMetricsService.ts` (コメント)
- `.kiro/specs/call-mode-exclusive-contract-rate-fix/USER_GUIDE.md`
- `.kiro/specs/call-mode-exclusive-contract-rate-fix/IMPLEMENTATION_COMPLETE.md`

---

### Task 8: Deployment - デプロイと検証
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 1 hour

#### Subtasks
8.1. バックエンドのビルドとデプロイ
   - `npm run build` を実行
   - `pm2 restart backend` を実行
   - ログを確認

8.2. フロントエンドのビルドとデプロイ
   - `npm run build` を実行
   - デプロイ
   - ブラウザキャッシュをクリア

8.3. 本番環境での検証
   - 2025年11月のデータで確認
   - 営担 I の結果が 27.3% になることを確認
   - 他の営担の結果も確認
   - 計算式の表示を確認

#### Acceptance Criteria
- [ ] バックエンドが正常にデプロイされる
- [ ] フロントエンドが正常にデプロイされる
- [ ] 本番環境で正しい結果が表示される
- [ ] エラーログがない

#### Commands
```bash
# Backend
cd backend
npm run build
pm2 restart backend
pm2 logs backend

# Frontend
cd frontend
npm run build
# Deploy to hosting service

# Verification
cd backend
npx ts-node test-exclusive-contract-rate-fix.ts
```

---

## Task Dependencies

```
Task 1 (Backend Logic) → Task 5 (Backend Testing)
                       ↓
Task 2 (Type Definitions) → Task 4 (Frontend Update)
                          ↓
Task 3 (MetricCard) → Task 6 (Frontend Testing)
                    ↓
Task 7 (Documentation)
                    ↓
Task 8 (Deployment)
```

## Estimated Total Time
- Backend: 2.5 hours
- Frontend: 2.5 hours
- Testing: 3.5 hours
- Documentation: 1 hour
- Deployment: 1 hour
- **Total: 10.5 hours**

## Risk Assessment

### High Risk
- データベースクエリのパフォーマンス（3つのクエリを実行）
- ゼロ除算のエッジケース

### Medium Risk
- 既存のメトリクスとの整合性
- レスポンシブデザインの崩れ

### Low Risk
- 型定義の更新
- ドキュメントの更新

## Rollback Plan

1. Git で変更をコミット
2. 問題が発生した場合は `git revert` で戻す
3. バックエンドとフロントエンドを再デプロイ
4. キャッシュをクリア

## Success Criteria

### Technical
- [ ] すべてのテストがパスする
- [ ] クエリのパフォーマンスが許容範囲内
- [ ] TypeScript のコンパイルエラーがない
- [ ] エラーログがない

### Business
- [ ] 営担 I の2025年11月の専任件数の割合が 27.3% と表示される
- [ ] 計算式の説明が表示される: "専任件数 ÷ (訪問数 - 一般媒介数)"
- [ ] 実際の数字が表示される: "3 ÷ (12 - 1) = 27.3%"
- [ ] 他の営担の結果も正しく表示される
