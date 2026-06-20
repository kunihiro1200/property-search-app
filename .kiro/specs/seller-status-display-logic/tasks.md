# 売主リスト ステータス表示ロジック - タスクリスト

## 実装タスク

### 1. ユーティリティ関数の実装

- [x] 1.1 `sellerStatusUtils.ts`ファイルを作成
  - 場所: `frontend/src/utils/sellerStatusUtils.ts`
  - ✅ 完了（コミット c6b53f6, c8ef454）
  
- [x] 1.2 日付パース関数を実装
  - 関数名: `parseDate(dateStr: string | null): Date | null`
  - 入力: `"2026/1/27"`形式または`"2026-01-27"`形式の文字列
  - 出力: Dateオブジェクト、または null
  - エラーハンドリング: 無効な日付形式の場合はnullを返す
  - ✅ 完了（コミット c6b53f6）- 両方の形式に対応
  
- [x] 1.3 訪問日前日判定関数を実装
  - 関数名: `isVisitDayBefore(visitDateStr: string | null, today: Date): boolean`
  - ロジック:
    - 訪問日が木曜日の場合、火曜日（前々日）に表示
    - それ以外の場合、前日に表示
  - 水曜日休みを考慮
  - ✅ 完了（実装済み）
  
- [x] 1.4 当日TEL（未着手）判定関数を実装
  - 関数名: `isCallTodayUnstarted(seller: Seller, today: Date): boolean`
  - 条件:
    - 次電日が今日を含めて過去
    - 状況（当社）に「追客中」を含む（フィールド名: `status`）
    - 不通カラムが空欄（`is_unreachable`がfalse）
    - 電話担当（任意）が空欄（`phone_person`が空）
    - 反響日付が2026年1月1日以降（`inquiry_date`）
  - ✅ 完了（コミット c6b53f6, c8ef454）
  
- [x] 1.5 ステータス計算関数を実装
  - 関数名: `calculateSellerStatus(seller: Seller): string[]`
  - ロジック:
    1. 不通チェック
    2. 訪問日前日チェック
    3. 当日TEL（担当名）チェック
    4. 当日TEL（未着手）チェック
    5. Pinrich空欄チェック
  - 全ての条件を満たすステータスを配列で返す
  - ✅ 完了（実装済み）

---

### 2. 型定義の更新

- [ ] 2.1 Seller型を拡張
  - 場所: `frontend/src/types/seller.ts`（または適切な型定義ファイル）
  - 追加フィールド:
    ```typescript
    next_call_date: string | null;          // 次電日 (D列)
    status: string | null;                   // 状況（当社） (AH列) ※DBフィールド名
    visit_date: string | null;               // 訪問日 Y/M/D (AB列)
    phone_person: string | null;             // 電話担当（任意） (CQ列)
    pinrich: string | null;                  // Pinrich (BF列)
    not_reachable: string | null;            // 不通 (J列)
    is_unreachable: boolean | null;          // 不通フラグ（boolean型）
    inquiry_date: string | null;             // 反響日付
    displayStatus?: string[];                // 計算されたステータス
    ```
  - ⚠️ 注意: `situation_company`ではなく`status`が正しいフィールド名

---

### 3. カスタムフックの実装

- [ ] 3.1 `useSellerStatus.ts`ファイルを作成
  - 場所: `frontend/src/hooks/useSellerStatus.ts`
  
- [ ] 3.2 useSellerStatusフックを実装
  - 関数名: `useSellerStatus(seller: Seller): string[]`
  - useMemoを使用してパフォーマンス最適化
  - 依存配列:
    - `seller.next_call_date`
    - `seller.status` ※situation_companyではなくstatus
    - `seller.visit_date`
    - `seller.phone_person`
    - `seller.pinrich`
    - `seller.not_reachable`
    - `seller.is_unreachable`
    - `seller.inquiry_date`

---

### 4. UIコンポーネントの実装

- [ ] 4.1 StatusBadgesコンポーネントを作成
  - 場所: `frontend/src/components/StatusBadges.tsx`
  - Props: `{ statuses: string[] }`
  - 表示:
    - 複数のステータスをバッジで表示
    - カンマ区切りではなく、個別のバッジとして表示
    - 色分け:
      - 不通: 赤 (#f44336)
      - 訪問日前日: オレンジ (#ff9800)
      - 当日TEL: 青 (#2196f3)
      - Pinrich空欄: グレー (#9e9e9e)
  
- [ ] 4.2 売主リストテーブルにステータスカラムを追加
  - 場所: `frontend/src/pages/PropertyListingsPage.tsx`（または適切なファイル）
  - 変更:
    - テーブルヘッダーに「ステータス」カラムを追加
    - 各行でuseSellerStatusフックを使用
    - StatusBadgesコンポーネントを表示

---

### 5. バックエンドのデータマッピング確認

- [ ] 5.1 スプレッドシートのカラムマッピングを確認
  - 場所: `backend/src/config/column-mapping.json`
  - 確認事項:
    - D列（次電日）が`next_call_date`にマッピングされているか
    - AH列（状況（当社））が`status`にマッピングされているか ※DBフィールド名
    - AB列（訪問日 Y/M/D）が`visit_date`にマッピングされているか
    - CQ列（電話担当（任意））が`phone_person`にマッピングされているか
    - BF列（Pinrich）が`pinrich`にマッピングされているか
    - J列（不通）が`not_reachable`にマッピングされているか
    - 不通フラグ（boolean型）が`is_unreachable`にマッピングされているか
    - 反響日付が`inquiry_date`にマッピングされているか
  - ⚠️ 注意: U列「状況（売主）」は`current_status`で、今回の機能では使用しない
  
- [ ] 5.2 必要に応じてカラムマッピングを追加
  - マッピングが存在しない場合、追加する

---

### 6. テストの実装

- [ ] 6.1 ユニットテスト: parseDate関数
  - 場所: `frontend/src/utils/sellerStatusUtils.test.ts`
  - テストケース:
    - 正常な日付形式（`"2026/1/27"`）
    - 無効な日付形式（`"2026-01-27"`、`"invalid"`）
    - null、空文字列
  
- [ ] 6.2 ユニットテスト: isVisitDayBefore関数
  - テストケース:
    - 訪問日が翌日（通常）
    - 訪問日が木曜日（前々日に表示）
    - 訪問日が過去
    - 訪問日がnull
  
- [ ] 6.3 ユニットテスト: isCallTodayUnstarted関数
  - テストケース:
    - 全ての条件を満たす
    - 次電日が未来
    - 状況（当社）に「追客中」を含まない
    - 不通カラムに値がある
  
- [ ] 6.4 ユニットテスト: calculateSellerStatus関数
  - テストケース:
    - 不通のみ
    - 訪問日前日のみ
    - 当日TEL（担当名）のみ
    - 当日TEL（未着手）のみ
    - Pinrich空欄のみ
    - 複数のステータス（例: 不通 + Pinrich空欄）
    - ステータスなし
  
- [ ] 6.5 統合テスト: PropertyListingsPage
  - テストケース:
    - ステータスが正しく表示される
    - 複数のステータスが表示される
    - ステータスがない場合、「-」が表示される

---

### 7. 動作確認

- [ ] 7.1 ローカル環境でテスト
  - 売主リストを表示
  - 各ステータス条件を満たす売主を確認
  - ステータスが正しく表示されることを確認
  
- [ ] 7.2 エッジケースのテスト
  - 次電日が今日
  - 訪問日が木曜日（水曜休みの考慮）
  - 複数のステータスを満たす売主
  - 全てのフィールドがnullの売主
  
- [ ] 7.3 パフォーマンステスト
  - 大量の売主データ（100件以上）でテスト
  - ステータス計算が1秒以内に完了することを確認

---

### 8. ドキュメント作成

- [ ] 8.1 実装ガイドを作成
  - 場所: `.kiro/specs/seller-status-display-logic/implementation-guide.md`
  - 内容:
    - ステータス条件の説明
    - 新しいステータスの追加方法
    - トラブルシューティング
  
- [ ] 8.2 コードコメントを追加
  - 各関数に詳細なコメントを追加
  - 複雑なロジックには説明を追加

---

## タスクの優先順位

### 高優先度（必須）
1. ユーティリティ関数の実装（タスク1）
2. 型定義の更新（タスク2）
3. カスタムフックの実装（タスク3）
4. UIコンポーネントの実装（タスク4）
5. バックエンドのデータマッピング確認（タスク5）

### 中優先度（推奨）
6. テストの実装（タスク6）
7. 動作確認（タスク7）

### 低優先度（オプション）
8. ドキュメント作成（タスク8）

---

## 見積もり

### 開発時間
- タスク1: 2時間
- タスク2: 30分
- タスク3: 30分
- タスク4: 1時間
- タスク5: 1時間
- タスク6: 2時間
- タスク7: 1時間
- タスク8: 1時間

**合計**: 約9時間

---

## 依存関係

```
タスク1（ユーティリティ関数）
  ↓
タスク2（型定義）
  ↓
タスク3（カスタムフック）
  ↓
タスク4（UIコンポーネント）
  ↓
タスク5（バックエンド確認）
  ↓
タスク6（テスト）
  ↓
タスク7（動作確認）
  ↓
タスク8（ドキュメント）
```

---

## 完了条件

### 機能要件
- [ ] 全てのステータス条件が正しく判定される
- [ ] 複数のステータスが正しく表示される
- [ ] 水曜日休みが正しく考慮される
- [ ] 日付フォーマット（`2026/1/27`）が正しくパースされる

### 非機能要件
- [ ] ステータス計算が1秒以内に完了する
- [ ] 100件以上の売主データでもパフォーマンスが低下しない
- [ ] エラーハンドリングが適切に実装されている

### テスト
- [ ] 全てのユニットテストが合格する
- [ ] 統合テストが合格する
- [ ] エッジケースのテストが合格する

### ドキュメント
- [ ] 実装ガイドが作成されている
- [ ] コードコメントが追加されている

---

**作成日**: 2026年1月27日  
**最終更新日**: 2026年1月27日  
**ステータス**: ✅ タスク1（ユーティリティ関数）完了 - コミット c6b53f6, c8ef454
