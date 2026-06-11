# visit-date-time-fix Bugfix Design

## Overview

売主管理システムの通話モードページ（`/sellers/:id/call`）において、訪問日（visit_date）に日時（例：2026-04-20 14:30）を入力して保存すると、時間情報が失われ 0:00（例：2026-04-20 00:00）として保存されるバグを修正する。

バグの根本原因はフロントエンドとバックエンドの両方でタイムゾーン変換（JST → UTC）が発生していることにある。修正方針は、タイムゾーン変換を一切行わず、入力された日時文字列をそのまま保存・表示することである。

## Glossary

- **Bug_Condition (C)**: タイムゾーン変換が発生する条件 — 訪問日フィールドに時刻を含む日時（例：2026-04-20 14:30）を入力して保存する操作
- **Property (P)**: 期待される正しい動作 — 入力された日時がそのまま保存・表示される（時刻が 0:00 にならない）
- **Preservation**: 修正によって変更してはならない既存の動作 — 訪問日が空の場合の保存、他フィールドの更新、訪問日フィルター等
- **editedAppointmentDate**: `CallModePage.tsx` 内で管理する訪問日時の入力値（`YYYY-MM-DDTHH:mm` 形式の文字列）
- **appointmentDate**: フロントエンドからバックエンドへ送信する訪問日時フィールド名
- **visit_date**: Supabase の `sellers` テーブルに保存される訪問日カラム（日時情報を含む）
- **visit_time**: Supabase の `sellers` テーブルに保存される訪問時刻カラム

## Bug Details

### Bug Condition

バグは、ユーザーが通話モードページの訪問日フィールドに時刻を含む日時を入力して保存する際に発生する。フロントエンドの `new Date().toISOString()` によるJST→UTC変換と、バックエンドの `toISOString().split('T')[0]` による時刻情報の破棄が連鎖して、時刻が 0:00 になる。

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { appointmentDate: string }
  OUTPUT: boolean

  RETURN input.appointmentDate IS NOT NULL
         AND input.appointmentDate CONTAINS time component (HH:mm)
         AND (
           frontend applies new Date(input.appointmentDate).toISOString()
           OR backend applies toISOString().split('T')[0]
         )
END FUNCTION
```

### Examples

- **入力**: `2026-04-20 14:30` → **期待**: `visit_date = 2026-04-20 14:30` / **実際**: `visit_date = 2026-04-20 00:00`（JST 14:30 → UTC 05:30 → 日付部分のみ保存）
- **入力**: `2026-04-20 00:30` → **期待**: `visit_date = 2026-04-20 00:30` / **実際**: `visit_date = 2026-04-19 00:00`（UTC変換で日付が前日にずれ、さらに時刻が破棄される）
- **入力**: `2026-04-20 09:00` → **期待**: `visit_date = 2026-04-20 09:00` / **実際**: `visit_date = 2026-04-20 00:00`（UTC変換で 00:00 になり時刻が破棄される）
- **入力**: 空（null） → **期待**: `visit_date = null` / **実際**: `visit_date = null`（バグは発生しない）

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- 訪問日フィールドを空にして保存した場合、`visit_date` と `visit_time` は引き続き null として保存される
- 訪問担当者（assignedTo）を設定して訪問日を保存した場合、カレンダーイベントは引き続き正常に作成・更新される
- 訪問日以外のフィールド（ステータス、次電日、コメントなど）の更新は引き続き正常に保存される
- 訪問日フィルター（visitScheduled、visitCompleted）は引き続き正常に動作する
- スプレッドシート同期は引き続き訪問日関連フィールドを正常に同期する

**Scope:**
訪問日フィールドへの時刻を含む日時入力・保存・表示以外の操作はすべて本修正の影響を受けない。具体的には：
- 訪問日が空（null）の場合の保存処理
- 訪問日以外のフィールドの更新処理
- カレンダーイベント作成・更新処理
- 訪問日フィルター処理
- スプレッドシート同期処理

## Hypothesized Root Cause

バグの根本原因は以下の2箇所にある：

1. **フロントエンドのタイムゾーン変換**（`CallModePage.tsx`）
   - `new Date(editedAppointmentDate).toISOString()` を使用してバックエンドに送信している
   - `new Date("2026-04-20T14:30")` はローカル時刻（JST）として解釈され、`.toISOString()` でUTCに変換される
   - JST 14:30 → UTC 05:30 となり、時刻がずれた状態でバックエンドに送信される

2. **バックエンドの時刻情報破棄**（`backend/src/services/SellerService.supabase.ts`）
   - 受け取った `appointmentDate` を `new Date(appointmentDate)` で再変換後、`toISOString().split('T')[0]` で日付部分のみを `visit_date` に保存している
   - この処理により時刻情報が完全に失われる

3. **表示時のタイムゾーン変換**（`CallModePage.tsx`）
   - 保存済みの訪問日を表示する際に `new Date(sellerData.appointmentDate).toISOString().slice(0, 16)` を使用している
   - UTC変換により、入力フォームに表示される時刻がずれる

## Correctness Properties

Property 1: Bug Condition - 訪問日時の正確な保存

_For any_ 入力において、訪問日フィールドに時刻を含む日時（`YYYY-MM-DDTHH:mm` 形式）が入力されて保存される場合（isBugCondition が true を返す場合）、修正後の処理は入力された日時をタイムゾーン変換なしにそのまま `visit_date` に保存し、再表示時も同じ値を入力フォームに表示する。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - 既存動作の維持

_For any_ 入力において、訪問日フィールドへの時刻を含む日時入力・保存・表示以外の操作（isBugCondition が false を返す場合）、修正後のコードは修正前のコードと同一の結果を生成し、既存のすべての動作を維持する。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

根本原因の分析が正しいと仮定した場合の修正内容：

**File 1**: `frontend/src/pages/CallModePage.tsx`

**変更箇所 1: 送信時のタイムゾーン変換を除去**
- **現在**: `new Date(editedAppointmentDate).toISOString()` でUTC変換してから送信
- **修正後**: `editedAppointmentDate`（`YYYY-MM-DDTHH:mm` 形式の文字列）をそのまま送信

**変更箇所 2: 表示時のタイムゾーン変換を除去**
- **現在**: `new Date(sellerData.appointmentDate).toISOString().slice(0, 16)` でUTC変換してから表示
- **修正後**: `sellerData.appointmentDate` の文字列から直接 `YYYY-MM-DDTHH:mm` 形式を取得して表示（例：`String(sellerData.appointmentDate).slice(0, 16)`）

---

**File 2**: `backend/src/services/SellerService.supabase.ts`

**変更箇所: visit_date・visit_time の生成ロジックを修正**
- **現在**: `new Date(appointmentDate).toISOString().split('T')[0]` で日付のみを保存
- **修正後**: UTC変換を行わず、受け取った文字列から直接日付・時刻を抽出して保存
  - 例：`appointmentDate.split('T')[0]` で日付部分を取得
  - 例：`appointmentDate.split('T')[1]?.slice(0, 5)` で時刻部分を取得

## Testing Strategy

### Validation Approach

テスト戦略は2フェーズで構成される。まず修正前のコードでバグを再現するテストを実行してバグの存在を確認し、次に修正後のコードでバグが解消され既存動作が維持されることを検証する。

### Exploratory Bug Condition Checking

**Goal**: 修正前のコードでバグを再現し、根本原因の分析を確認または反証する。反証された場合は根本原因の再分析が必要。

**Test Plan**: フロントエンドの送信処理とバックエンドの保存処理をそれぞれ単体でテストし、タイムゾーン変換が発生していることを確認する。修正前のコードでテストを実行して失敗を観察する。

**Test Cases**:
1. **フロントエンド変換テスト**: `new Date("2026-04-20T14:30").toISOString()` の出力が `"2026-04-20T05:30:00.000Z"` になることを確認（修正前のコードで失敗）
2. **バックエンド保存テスト**: `appointmentDate = "2026-04-20T05:30:00.000Z"` を受け取った場合に `visit_date` が `"2026-04-20"` になることを確認（時刻が失われる）
3. **エンドツーエンドテスト**: `14:30` を入力して保存後、`00:00` として保存されることを確認（修正前のコードで失敗）
4. **日付またぎテスト**: `00:30` を入力した場合に日付が前日にずれることを確認（修正前のコードで失敗）

**Expected Counterexamples**:
- `new Date("2026-04-20T14:30").toISOString()` が `"2026-04-20T14:30:00.000Z"` にならず `"2026-04-20T05:30:00.000Z"` になる
- バックエンドで `toISOString().split('T')[0]` により時刻情報が完全に失われる

### Fix Checking

**Goal**: バグ条件が成立するすべての入力に対して、修正後の処理が期待通りの動作をすることを検証する。

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := saveAppointmentDate_fixed(input.appointmentDate)
  ASSERT result.visit_date CONTAINS input.appointmentDate (no timezone conversion)
  ASSERT displayAppointmentDate_fixed(result) = input.appointmentDate
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しないすべての入力に対して、修正後の処理が修正前と同一の結果を生成することを検証する。

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT saveAppointmentDate_original(input) = saveAppointmentDate_fixed(input)
END FOR
```

**Testing Approach**: プロパティベーステストを推奨する理由：
- 多様な入力パターン（空値、日付のみ、様々な時刻）を自動生成できる
- 手動テストでは見落としがちなエッジケースを検出できる
- 修正前後の動作が一致することを強力に保証できる

**Test Plan**: 修正前のコードで空値・他フィールド更新などの動作を観察し、修正後も同一の動作をすることをプロパティベーステストで検証する。

**Test Cases**:
1. **空値保存の維持**: 訪問日を空にして保存した場合、`visit_date = null` が維持されることを確認
2. **他フィールド更新の維持**: ステータス・次電日・コメントの更新が引き続き正常に動作することを確認
3. **訪問日フィルターの維持**: `visitScheduled`・`visitCompleted` フィルターが引き続き正常に動作することを確認
4. **カレンダーイベントの維持**: 訪問担当者設定時のカレンダーイベント作成・更新が引き続き正常に動作することを確認

### Unit Tests

- フロントエンドの送信処理：`editedAppointmentDate` がそのまま送信されることを確認
- フロントエンドの表示処理：保存済み値がタイムゾーン変換なしで表示されることを確認
- バックエンドの保存処理：`appointmentDate` 文字列から `visit_date`・`visit_time` が正確に抽出されることを確認
- エッジケース：空値（null/undefined）、日付のみ（時刻なし）、様々な時刻パターン

### Property-Based Tests

- ランダムな日時文字列（`YYYY-MM-DDTHH:mm` 形式）を生成し、保存後に同一の値が取得できることを検証（Property 1）
- ランダムな非バグ入力（空値、他フィールドの更新）を生成し、修正前後で同一の結果になることを検証（Property 2）
- 様々な時刻パターン（00:00〜23:59）で保存・取得が正確に動作することを検証

### Integration Tests

- 通話モードページで `14:30` を入力して保存し、再表示時に `14:30` が表示されることを確認
- 日付またぎケース（`00:30` 入力）で日付がずれないことを確認
- 訪問日を空にして保存後、null として保存されることを確認
- 訪問日の保存後、訪問日フィルターが正常に動作することを確認
