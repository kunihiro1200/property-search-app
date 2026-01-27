# CC100同期問題の調査報告

## 報告日時
2026年1月26日 17:00 JST

## 問題
「5分前にCC100を物件リスト（スプシ）に新規にあがったが物件リストにはあがってこない」

## 調査結果

### 1. CC100の状態

**スプレッドシート（業務依頼シート）**:
- ✅ **存在する**
- 物件番号: CC100
- 物件所在: 青葉台2号棟
- 売主: タマホーム
- 格納先URL: https://drive.google.com/drive/folders/15Cothyr2PEIrmqrDwWI5ay_agKfi7h_o?usp=sharing

**データベース（property_listings）**:
- ❌ **存在しない**
- 最近作成された物件の最新はAA13453（今朝07:54）

### 2. 自動同期の状態

**サーバー状態**:
- ✅ サーバーは実行中（PID: 9080、起動時刻: 16:48）
- ✅ `AUTO_SYNC_ENABLED=true`（有効）
- ✅ `AUTO_SYNC_INTERVAL_MINUTES=5`（5分ごと）

**自動同期の実行状況**:
- ⚠️  **Google Sheets APIのクォータ超過が発生**
- エラーメッセージ:
  ```
  Quota exceeded for quota metric 'Read requests' and limit 
  'Read requests per minute per user' of service 
  'sheets.googleapis.com' for consumer 'project_number:930176668752'.
  ```

### 3. 問題の原因

#### 主要な原因: Google Sheets APIのクォータ超過

**Google Sheets APIの制限**:
- **1分あたり60リクエスト**（ユーザーごと）
- **1日あたり500リクエスト**（プロジェクトごと）

**現在の自動同期の動作**:
1. 5分ごとに実行
2. 各実行で以下のフェーズを実行:
   - Phase 1: 売主追加同期（スプレッドシート全件読み取り）
   - Phase 2: 売主更新同期（スプレッドシート全件読み取り）
   - Phase 4.5: 物件リスト更新同期（業務依頼シート全件読み取り）
   - Phase 4.6: 新規物件追加同期（業務依頼シート全件読み取り）
   - Phase 4.7: 物件詳細同期

**問題点**:
- 1回の自動同期で**複数回のスプレッドシート読み取り**が発生
- 5分ごとに実行されるため、**短時間に大量のリクエスト**が発生
- Google Sheets APIのクォータを超過し、新規物件の検出ができない

### 4. なぜCC100は同期されなかったのか？

**タイムライン**:
1. **16:48頃**: サーバーが起動
2. **16:48:05頃**: 自動同期の初回実行（サーバー起動5秒後）
3. **16:53頃**: 2回目の自動同期実行（5分後）
4. **16:55頃**: CC100がスプレッドシートに追加される
5. **16:58頃**: 3回目の自動同期実行（5分後）
   - ❌ **Google Sheets APIのクォータ超過により失敗**
6. **17:00現在**: CC100はまだデータベースに同期されていない

**結論**:
- CC100が追加された後の自動同期（16:58頃）で、Google Sheets APIのクォータ超過により同期が失敗
- そのため、CC100はデータベースに追加されなかった

### 5. 解決策

#### 即座の対応（CC100を追加するため）

**5-10分待ってから手動同期を実行**:

```powershell
# 5-10分待機してから実行（APIクォータがリセットされるまで）
cd backend
npx ts-node manual-sync-cc100.ts
```

**または、直接APIエンドポイントを呼び出す**:

```powershell
# 手動同期APIを呼び出す
curl -X POST http://localhost:3000/api/sync/manual
```

#### 長期的な対応

##### 対応1: 自動同期の間隔を延長（推奨）

**`.env`ファイルを編集**:

```env
# 現在: 5分ごと
AUTO_SYNC_INTERVAL_MINUTES=5

# 推奨: 15分ごと（APIクォータの消費を1/3に削減）
AUTO_SYNC_INTERVAL_MINUTES=15

# または: 30分ごと（APIクォータの消費を1/6に削減）
AUTO_SYNC_INTERVAL_MINUTES=30
```

**効果**:
- 15分ごと: APIリクエスト数を1/3に削減
- 30分ごと: APIリクエスト数を1/6に削減
- クォータ超過のリスクを大幅に削減

##### 対応2: スプレッドシートのキャッシュを実装

**現在の問題**:
- 毎回スプレッドシート全件を読み取っている
- 6,712件の売主データを毎回取得

**改善案**:
- スプレッドシートのデータをメモリにキャッシュ
- キャッシュの有効期限: 15分
- キャッシュが有効な場合は、スプレッドシートにアクセスしない

**実装例**:
```typescript
// EnhancedAutoSyncService.ts
private spreadsheetCache: Map<string, any> | null = null;
private spreadsheetCacheExpiry: number = 0;
private readonly SPREADSHEET_CACHE_TTL = 15 * 60 * 1000; // 15分

async getSpreadsheetData(): Promise<any[]> {
  const now = Date.now();
  if (this.spreadsheetCache && now < this.spreadsheetCacheExpiry) {
    console.log('✅ Using cached spreadsheet data');
    return Array.from(this.spreadsheetCache.values());
  }
  
  // キャッシュが無効な場合のみスプレッドシートから取得
  const data = await this.sheetsClient!.readAll();
  this.spreadsheetCache = new Map(data.map(row => [row['売主番号'], row]));
  this.spreadsheetCacheExpiry = now + this.SPREADSHEET_CACHE_TTL;
  
  return data;
}
```

##### 対応3: バッチ処理の最適化

**現在の問題**:
- 各フェーズで個別にスプレッドシートを読み取っている
- 重複した読み取りが発生

**改善案**:
- 1回の自動同期で1回だけスプレッドシートを読み取る
- 取得したデータを各フェーズで共有

##### 対応4: Google Sheets APIのクォータを増やす（オプション）

**Google Cloud Consoleで設定**:
1. https://console.cloud.google.com/ にアクセス
2. プロジェクト（project_number: 930176668752）を選択
3. 「APIとサービス」→「クォータ」
4. 「Google Sheets API」のクォータを確認
5. 必要に応じてクォータの増加をリクエスト

**注意**:
- クォータの増加には審査が必要
- 承認されるまで数日かかる可能性がある

### 6. 推奨アクション（優先順位順）

#### 優先度1: 即座の対応（CC100を追加）

```powershell
# 5-10分待機してから実行
cd backend
npx ts-node manual-sync-cc100.ts
```

#### 優先度2: 自動同期の間隔を延長

**`.env`ファイルを編集**:
```env
AUTO_SYNC_INTERVAL_MINUTES=15
```

**サーバーを再起動**:
```powershell
# backend/start-clean.bat を実行
# または
cd backend
npm run dev
```

#### 優先度3: スプレッドシートのキャッシュを実装

- `EnhancedAutoSyncService.ts`を修正
- キャッシュ機能を追加
- テストして動作確認

#### 優先度4: バッチ処理の最適化

- 各フェーズで個別にスプレッドシートを読み取らない
- 1回の読み取りで全フェーズをカバー

### 7. 確認コマンド

```powershell
# CC100がスプレッドシートに存在するか確認
npx ts-node backend/check-cc100-in-sheet.ts

# CC100がデータベースに存在するか確認
npx ts-node backend/check-cc100-in-db.ts

# 手動同期を実行（5-10分待機してから）
npx ts-node backend/manual-sync-cc100.ts

# サーバーが実行中か確認
npx ts-node backend/check-server-running.ts

# 自動同期の実行状況を確認
npx ts-node backend/check-auto-sync-execution.ts
```

## まとめ

**質問への回答**:
「5分前にCC100を物件リスト（スプシ）に新規にあがったが物件リストにはあがってこない」

**答え**:
Google Sheets APIのクォータ超過により、自動同期が失敗しています。自動同期が5分ごとに実行されるため、短時間に大量のAPIリクエストが発生し、クォータを超過しています。

**即座の対応**:
5-10分待ってから手動同期を実行してください：
```powershell
cd backend
npx ts-node manual-sync-cc100.ts
```

**長期的な対応**:
`.env`ファイルの`AUTO_SYNC_INTERVAL_MINUTES`を`15`または`30`に変更し、サーバーを再起動してください。これにより、APIクォータの消費を削減し、クォータ超過のリスクを大幅に削減できます。
