# calls.ts コンパイルエラー修正ガイド

## 実施日
2025-12-13

## 概要
`backend/src/routes/calls.ts`のコンパイルエラーを修正するための詳細ガイドです。

## 必要な修正（優先度順）

### 1. 型定義の修正（最優先）

#### a. req.user → req.employee に変更
calls.tsでは`req.user`を使用していますが、auth.tsでは`req.employee`を定義しています。

**修正箇所**:
- 行65, 71: `userId: userId || req.user?.id` → `userId: userId || req.employee?.id`
- 行467: `await recordingService.recordAccess(recording.id, req.user?.id)` → `await recordingService.recordAccess(recording.id, req.employee?.id)`

#### b. 管理者権限チェックの修正
`req.user?.isAdmin`は存在しません。`req.employee?.role === 'admin'`を使用します。

**修正箇所**:
- 行556: `if (!req.user?.isAdmin)` → `if (req.employee?.role !== 'admin')`
- 行605: `if (!req.user?.isAdmin)` → `if (req.employee?.role !== 'admin')`

**注意**: `manager`ロールは`EmployeeRole`に存在しないため、`admin`のみをチェックします。

### 2. 存在しないメソッドの対応

#### a. phoneService.endCall()
**問題**: `endCall(callId: string)`として呼び出していますが、実際は`endCall(options: EndCallOptions)`です。

**修正**:
```typescript
// 修正前
const result = await phoneService.endCall(callId);

// 修正後
await phoneService.endCall({
  callLogId: callId,
  endedAt: new Date(),
  durationSeconds: durationSeconds || 0,
  status: 'completed',
});
const result = { callLogId: callId, status: 'completed' };
```

#### b. phoneService.handleInboundWebhook()
**問題**: このメソッドは実装されていません。

**暫定対応**: コメントアウトして、代わりに`createCallLog`を直接呼び出します。

```typescript
// TODO: Webhookイベントを処理（handleInboundWebhookメソッドを実装する必要があります）
const callLog = await phoneService.createCallLog({
  seller_id: null, // TODO: 電話番号からSellerを検索
  user_id: null,
  direction: 'inbound',
  phone_number: phoneNumber,
  call_status: eventType === 'call_ended' ? 'completed' : 'completed',
  started_at: new Date(timestamp),
  ended_at: eventType === 'call_ended' ? new Date() : null,
  duration_seconds: null,
  contact_id: contactId,
  instance_id: instanceId,
  queue_id: queueId,
  agent_id: agentId,
});

const result = {
  callLogId: callLog.id,
  sellerId: null,
  matched: false,
};
```

**注意**: `createCallLog`をpublicにする必要があります（PhoneService.tsで`private`を削除）。

#### c. transcriptionService.getTranscriptionByCallLogId()
**問題**: このメソッドは実装されていません。

**暫定対応**: Supabaseクライアントを直接使用します。

```typescript
// TODO: getTranscriptionByCallLogIdメソッドを実装する必要があります
const { data: transcription } = await supabase
  .from('call_transcriptions')
  .select('*')
  .eq('call_log_id', callId)
  .single();
```

**必要な追加**: ファイル先頭にSupabaseクライアントをインポート・初期化します。

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

#### d. testConnection()メソッド
**問題**: 各サービスに`testConnection()`メソッドが実装されていません。

**暫定対応**: コメントアウトして、暫定的に`true`を返します。

```typescript
// TODO: testConnectionメソッドを各サービスに実装する必要があります
try {
  // results.connect = await phoneService.testConnection();
  results.connect = true; // 暫定的にtrueを返す
} catch (error) {
  logger.error('Connect test failed', { error });
}

// 他のサービスも同様に修正
```

### 3. 重複したルート定義の削除

**問題**: `/config`と`/config/test`ルートが重複して定義されています。

**修正**: 行868〜1080の重複したルート定義を削除します。

### 4. 未使用の変数の修正

**修正箇所**:
- 行843: `async (req: Request, res: Response)` → `async (_req: Request, res: Response)`
- 行1268: `async (req: Request, res: Response)` → `async (_req: Request, res: Response)`

### 5. クリーンアップルートの権限チェック修正

**修正箇所**:
- 行1093〜1100: `const user = (req as any).user;` → `req.employee`を使用
- 行1157〜1164: 同上
- 行1225〜1232: 同上

**修正例**:
```typescript
// 修正前
const user = (req as any).user;
if (user.role !== 'admin' && user.role !== 'manager') {
  // ...
}
logger.info('Manual cleanup requested', {
  userId: user.id,
  options: req.body,
});

// 修正後
const isAdmin = req.employee?.role === 'admin';
if (!isAdmin) {
  // ...
}
logger.info('Manual cleanup requested', {
  userId: req.employee?.id,
  options: req.body,
});
```

## 修正手順

### ステップ1: バックアップを作成
```bash
cp backend/src/routes/calls.ts backend/src/routes/calls.ts.backup
```

### ステップ2: 型定義の修正
1. `req.user` → `req.employee`に一括置換
2. `req.user?.isAdmin` → `req.employee?.role === 'admin'`に修正
3. `req.employee?.role === 'manager'`を削除（managerロールは存在しない）

### ステップ3: メソッド呼び出しの修正
1. `endCall(callId)`を`endCall(options)`に修正
2. `handleInboundWebhook()`をコメントアウトして暫定実装を追加
3. `getTranscriptionByCallLogId()`をSupabase直接呼び出しに置換
4. `testConnection()`をコメントアウトして暫定実装を追加

### ステップ4: PhoneService.tsの修正
```typescript
// backend/src/services/PhoneService.ts
// 行282付近
- private async createCallLog(...)
+ async createCallLog(...)
```

### ステップ5: 重複ルートの削除
行868〜1080の重複したルート定義を削除

### ステップ6: 未使用変数の修正
`req` → `_req`に変更（2箇所）

### ステップ7: コンパイルエラーの確認
```bash
cd backend
npx tsc --noEmit src/routes/calls.ts
```

## 今後の対応（優先度順）

### 短期（1-2日以内）
1. **PhoneServiceにhandleInboundWebhookメソッドを実装**
   - Webhook受信処理
   - 電話番号からSeller検索
   - 通話ログ作成

2. **TranscriptionServiceにgetTranscriptionByCallLogIdメソッドを実装**
   - call_log_idで文字起こしを検索
   - エラーハンドリング

3. **各サービスにtestConnectionメソッドを実装**
   - PhoneService.testConnection()
   - TranscriptionService.testConnection()
   - RecordingService.testConnection()
   - SentimentAnalysisService.testConnection()

### 中期（1週間以内）
4. **統合テストの実装**
   - 基本的なCRUD操作のテスト
   - エラーハンドリングのテスト

5. **EmployeeRoleにmanagerロールを追加（必要に応じて）**
   ```typescript
   export enum EmployeeRole {
     ADMIN = 'admin',
     MANAGER = 'manager',  // 追加
     AGENT = 'agent',
     VIEWER = 'viewer',
   }
   ```

### 長期（2週間以内）
6. **AWS統合テストの実装**
   - モック環境でのテスト
   - 実際のAWS環境でのテスト（オプション）

## 注意事項

1. **文字エンコーディング**: PowerShellで一括置換を行うと文字化けする可能性があります。手動で修正するか、UTF-8エンコーディングを明示的に指定してください。

2. **段階的な修正**: すべてを一度に修正せず、段階的に修正してコンパイルエラーを確認しながら進めてください。

3. **テストの実行**: 修正後は必ずテストを実行して、既存の機能が壊れていないことを確認してください。

## 関連ドキュメント

- [TASK-30: API統合テスト](./TASK-30-STATUS.md)
- [TESTING-SUMMARY](./TESTING-SUMMARY.md)
- [Design Document](./design.md)

## コンパイルエラーの確認コマンド

```bash
# calls.tsのみをチェック
cd backend
npx tsc --noEmit src/routes/calls.ts

# プロジェクト全体をチェック
npx tsc --noEmit

# 特定のエラーを確認
npx tsc --noEmit 2>&1 | grep "calls.ts"
```
