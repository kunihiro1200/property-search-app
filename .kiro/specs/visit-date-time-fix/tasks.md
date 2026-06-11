# Implementation Plan

- [x] 1. バグ条件の探索テストを作成する
  - **Property 1: Bug Condition** - 訪問日時のタイムゾーン変換バグ
  - **CRITICAL**: このテストは修正前のコードで必ず FAIL する — 失敗がバグの存在を証明する
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: このテストは期待される動作をエンコードしており、修正後に PASS することでバグ解消を検証する
  - **GOAL**: バグが存在することを示す反例（counterexample）を発見する
  - **Scoped PBT Approach**: 決定論的なバグのため、具体的な失敗ケースにスコープを絞る
  - テスト対象（Bug Condition in design）:
    - フロントエンド: `new Date("2026-04-20T14:30").toISOString()` が `"2026-04-20T05:30:00.000Z"` になることを確認（JST→UTC変換が発生している）
    - バックエンド: `appointmentDate = "2026-04-20T05:30:00.000Z"` を受け取った場合に `visit_date` が `"2026-04-20"` になり時刻が失われることを確認
    - エンドツーエンド: `14:30` を入力して保存後、`00:00` として保存されることを確認
    - 日付またぎ: `00:30` を入力した場合に日付が前日にずれることを確認
  - テストアサーション（Expected Behavior in design）:
    - `saveAppointmentDate_fixed("2026-04-20T14:30").visit_date` が `"2026-04-20T14:30"` を含むこと
    - `displayAppointmentDate_fixed(result)` が入力値と同一であること
  - 修正前のコードでテストを実行する
  - **EXPECTED OUTCOME**: テストが FAIL する（これが正しい — バグの存在を証明する）
  - 発見した反例を記録する（例: `new Date("2026-04-20T14:30").toISOString()` が `"2026-04-20T14:30:00.000Z"` にならず `"2026-04-20T05:30:00.000Z"` になる）
  - テストを作成し、実行し、失敗を記録したらタスク完了とする
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. 保全プロパティテストを作成する（修正前に実施）
  - **Property 2: Preservation** - 既存動作の維持（非バグ条件の入力）
  - **IMPORTANT**: 観察優先メソドロジーに従う
  - 修正前のコードで非バグ入力（isBugCondition が false を返すケース）の動作を観察する:
    - 観察: 訪問日を空（null）にして保存 → `visit_date = null` になることを確認
    - 観察: ステータス・次電日・コメントなど他フィールドの更新が正常に保存されることを確認
    - 観察: `visitScheduled`・`visitCompleted` フィルターが正常に動作することを確認
    - 観察: 訪問担当者設定時のカレンダーイベント作成・更新が正常に動作することを確認
  - 観察した動作をプロパティベーステストとして記述する（Preservation Requirements in design）:
    - プロパティ: 訪問日が空（null/undefined）の場合、`visit_date` と `visit_time` は null として保存される
    - プロパティ: 訪問日以外のフィールド更新は、訪問日フィールドに影響を与えない
    - プロパティ: 訪問日フィルターは、訪問日の値に基づいて正しく動作する
  - 修正前のコードでテストを実行する
  - **EXPECTED OUTCOME**: テストが PASS する（これが正しい — 保全すべきベースライン動作を確認する）
  - テストを作成し、実行し、PASS を確認したらタスク完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [-] 3. 訪問日時タイムゾーン変換バグの修正

  - [x] 3.1 フロントエンドの送信時タイムゾーン変換を除去する（`frontend/src/pages/CallModePage.tsx`）
    - 送信処理で `new Date(editedAppointmentDate).toISOString()` を使用している箇所を特定する
    - `editedAppointmentDate`（`YYYY-MM-DDTHH:mm` 形式の文字列）をそのままバックエンドに送信するよう変更する
    - UTC変換を行わないことで、JST 14:30 が UTC 05:30 に変換される問題を解消する
    - _Bug_Condition: `input.appointmentDate` に時刻成分（HH:mm）が含まれ、かつ `new Date(input.appointmentDate).toISOString()` によるUTC変換が発生している場合_
    - _Expected_Behavior: `editedAppointmentDate` 文字列をそのまま送信し、タイムゾーン変換を行わない_
    - _Preservation: 訪問日が空（null）の場合は引き続き null を送信する_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 フロントエンドの表示時タイムゾーン変換を除去する（`frontend/src/pages/CallModePage.tsx`）
    - 表示処理で `new Date(sellerData.appointmentDate).toISOString().slice(0, 16)` を使用している箇所を特定する
    - `String(sellerData.appointmentDate).slice(0, 16)` など、UTC変換を行わずに `YYYY-MM-DDTHH:mm` 形式を取得するよう変更する
    - _Bug_Condition: 保存済みの訪問日を表示する際に `new Date().toISOString()` によるUTC変換が発生している場合_
    - _Expected_Behavior: 保存された日時文字列をそのまま入力フォームに表示し、時刻のずれが発生しない_
    - _Preservation: 訪問日が null の場合は引き続き空として表示する_
    - _Requirements: 2.4_

  - [x] 3.3 バックエンドの visit_date・visit_time 生成ロジックを修正する（`backend/src/services/SellerService.supabase.ts`）
    - `new Date(appointmentDate).toISOString().split('T')[0]` を使用している箇所を特定する
    - UTC変換を行わず、受け取った文字列から直接日付・時刻を抽出するよう変更する:
      - `visit_date`: `appointmentDate.split('T')[0]` で日付部分を取得
      - `visit_time`: `appointmentDate.split('T')[1]?.slice(0, 5)` で時刻部分を取得
    - _Bug_Condition: `new Date(appointmentDate)` による再変換と `toISOString().split('T')[0]` による時刻情報の破棄が発生している場合_
    - _Expected_Behavior: UTC変換なしに入力文字列から正確な日付と時刻を抽出して保存する_
    - _Preservation: `appointmentDate` が null/undefined の場合は `visit_date` と `visit_time` を null として保存する_
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

  - [x] 3.4 バグ条件の探索テストが PASS することを確認する
    - **Property 1: Expected Behavior** - 訪問日時の正確な保存
    - **IMPORTANT**: タスク 1 で作成した同じテストを再実行する — 新しいテストを作成しない
    - タスク 1 のテストは期待される動作をエンコードしており、修正後に PASS することでバグ解消を確認する
    - バグ条件の探索テスト（タスク 1）を実行する
    - **EXPECTED OUTCOME**: テストが PASS する（バグが修正されたことを確認）
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 保全プロパティテストが引き続き PASS することを確認する
    - **Property 2: Preservation** - 既存動作の維持
    - **IMPORTANT**: タスク 2 で作成した同じテストを再実行する — 新しいテストを作成しない
    - 保全プロパティテスト（タスク 2）を実行する
    - **EXPECTED OUTCOME**: テストが PASS する（リグレッションがないことを確認）
    - 修正後もすべての既存動作が維持されていることを確認する

- [x] 4. チェックポイント — すべてのテストが PASS することを確認する
  - タスク 1 のバグ条件テストが PASS していることを確認する
  - タスク 2 の保全プロパティテストが PASS していることを確認する
  - 疑問点があればユーザーに確認する
