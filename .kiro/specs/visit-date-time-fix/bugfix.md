# Bugfix Requirements Document

## Introduction

売主管理システムの通話モードページ（`/sellers/:id/call`）において、訪問日（visit_date）に日時（例：2026-04-20 14:30）を入力して保存すると、時間情報が失われ 0:00（例：2026-04-20 00:00）として保存されるバグを修正する。

このバグは、フロントエンドとバックエンドの両方でタイムゾーン変換（JST → UTC）が適切に処理されていないことに起因する。具体的には：

- フロントエンド（`CallModePage.tsx`）：`new Date(editedAppointmentDate).toISOString()` によりローカル時刻がUTCに変換される
- バックエンド（`SellerService.supabase.ts`）：受け取ったISO文字列を `new Date()` で再変換後、`toISOString().split('T')[0]` で日付のみを `visit_date` に保存するため、時間情報が完全に失われる

また、表示時にも `new Date(sellerData.appointmentDate).toISOString().slice(0, 16)` でUTC変換されるため、入力フォームに表示される時刻もずれる可能性がある。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN ユーザーが通話モードページの訪問日フィールドに日時（例：2026-04-20 14:30）を入力して保存する THEN システムは時間情報を失い、visit_date に 0:00（例：2026-04-20 00:00）として保存する

1.2 WHEN フロントエンドが `new Date(editedAppointmentDate).toISOString()` を呼び出す THEN システムはローカル時刻（JST）をUTCに変換し、時刻がずれたISO文字列をバックエンドに送信する

1.3 WHEN バックエンドが受け取ったappointmentDateを `new Date(appointmentDate)` で変換後 `toISOString().split('T')[0]` で visit_date を生成する THEN システムはUTC基準の日付のみを保存し、時間情報が完全に失われる

1.4 WHEN 保存済みの訪問日を通話モードページで再表示する際に `new Date(sellerData.appointmentDate).toISOString().slice(0, 16)` を使用する THEN システムはUTC変換により入力フォームに表示される時刻がずれる

### Expected Behavior (Correct)

2.1 WHEN ユーザーが通話モードページの訪問日フィールドに日時（例：2026-04-20 14:30）を入力して保存する THEN システムは入力された日時をそのまま保持し、visit_date に正確な日時（例：2026-04-20 14:30）として保存する

2.2 WHEN フロントエンドが訪問日時をバックエンドに送信する THEN システムはタイムゾーン変換を行わず、入力された日時文字列（YYYY-MM-DDTHH:mm形式）をそのまま送信する

2.3 WHEN バックエンドが受け取ったappointmentDateから visit_date と visit_time を生成する THEN システムはUTC変換を行わず、入力された日時から正確な日付と時刻を抽出して保存する

2.4 WHEN 保存済みの訪問日を通話モードページで再表示する THEN システムは保存された日時をそのまま入力フォームに表示し、時刻のずれが発生しない

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ユーザーが訪問日フィールドを空にして保存する THEN システムは CONTINUE TO visit_date と visit_time を null として保存する

3.2 WHEN ユーザーが訪問担当者（assignedTo）を設定して訪問日を保存する THEN システムは CONTINUE TO カレンダーイベントを正常に作成・更新する

3.3 WHEN ユーザーが訪問日以外のフィールド（ステータス、次電日、コメントなど）を更新する THEN システムは CONTINUE TO それらのフィールドを正常に保存する

3.4 WHEN 訪問日が設定されている売主の一覧を表示する THEN システムは CONTINUE TO 訪問日フィルター（visitScheduled、visitCompleted）が正常に動作する

3.5 WHEN スプレッドシート同期が実行される THEN システムは CONTINUE TO 訪問日関連フィールドを正常に同期する
