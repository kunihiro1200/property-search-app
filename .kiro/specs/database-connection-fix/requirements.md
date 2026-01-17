# Database Connection Fix - Requirements

## Overview

Migration 081の検証スクリプトがデータベースに接続できない問題を解決するためのスペックです。`DATABASE_URL`は設定されていますが、接続時にエラーが発生しています。

## Background

### 現在の状況

1. **環境変数は設定済み**
   - `backend/.env`に`DATABASE_URL`が存在
   - 形式: `postgresql://postgres:[PASSWORD]@db.fzcuexscuwhoywcicdqq.supabase.co:5432/postgres`

2. **接続エラーが発生**
   - `verify-081-direct-pg.ts`実行時にエラー
   - データベースへの接続が確立できない

3. **影響範囲**
   - Migration 081の検証ができない
   - 物件リストの同期が機能しない
   - AA13226等の物件がブラウザに表示されない
   - AA4885のATBB状況が正しく反映されない

### 根本原因の可能性

1. **パスワードの問題**
   - パスワードが変更された
   - パスワードに特殊文字が含まれている（URLエンコードが必要）

2. **ネットワークの問題**
   - ファイアウォールがPostgreSQLポート(5432)をブロック
   - Supabaseプロジェクトのネットワーク設定

3. **データベースの問題**
   - データベースが一時停止している
   - 接続制限に達している

4. **認証情報の問題**
   - ユーザー名が間違っている
   - データベース名が間違っている

## User Stories

### US-1: 接続診断
**As a** 開発者  
**I want to** データベース接続の問題を診断する  
**So that** 具体的な原因を特定できる

**Acceptance Criteria:**
- 診断スクリプトが接続エラーの詳細を表示
- 環境変数の設定状態を確認
- ネットワーク接続をテスト
- 認証情報の妥当性を検証
- 具体的な解決策を提示

### US-2: 接続文字列の修正
**As a** 開発者  
**I want to** 正しい接続文字列を取得して設定する  
**So that** データベースに接続できる

**Acceptance Criteria:**
- Supabaseダッシュボードから最新の接続文字列を取得
- パスワードを正しく入力
- 特殊文字を適切にURLエンコード
- `.env`ファイルを更新
- 接続テストで成功を確認

### US-3: 接続の検証
**As a** 開発者  
**I want to** データベース接続が正常に機能することを確認する  
**So that** Migration 081の検証を進められる

**Acceptance Criteria:**
- 接続テストスクリプトが成功
- 簡単なクエリ（SELECT 1）が実行できる
- テーブル一覧が取得できる
- Migration 081検証スクリプトが実行できる

## Functional Requirements

### FR-1: 診断スクリプト
システムは以下を診断するスクリプトを提供する:
- `DATABASE_URL`環境変数の存在確認
- 接続文字列の形式検証
- ホスト名の解決確認
- ポート5432への接続テスト
- 認証情報の検証
- データベースの存在確認

### FR-2: 接続文字列取得ガイド
システムは以下の手順を提供する:
1. Supabaseダッシュボードへのアクセス方法
2. Project Settings → Database → Connection stringの場所
3. パスワードの入力方法
4. 接続文字列のコピー方法
5. `.env`ファイルへの設定方法

### FR-3: トラブルシューティングガイド
システムは以下のトラブルシューティング手順を提供する:

#### パスワードの問題
- パスワードのリセット方法
- 特殊文字のURLエンコード方法
- パスワードの確認方法

#### ネットワークの問題
- ファイアウォール設定の確認
- VPN接続の確認
- プロキシ設定の確認

#### データベースの問題
- プロジェクトの状態確認
- データベースの再起動方法
- 接続制限の確認

### FR-4: 接続テストスクリプト
システムは段階的な接続テストを提供する:
1. 環境変数の読み込みテスト
2. 接続文字列のパーステスト
3. ホスト名の解決テスト
4. TCP接続テスト
5. PostgreSQL認証テスト
6. データベースクエリテスト

## Technical Specifications

### 診断スクリプトの実装

```typescript
// backend/diagnose-database-connection.ts

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as dns from 'dns';
import * as net from 'net';

dotenv.config({ path: path.join(__dirname, '.env') });

async function diagnoseDatabaseConnection() {
  console.log('🔍 データベース接続診断を開始します...\n');

  // Step 1: Check environment variable
  console.log('📋 ステップ1: 環境変数の確認');
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL が設定されていません');
    console.log('\n解決方法:');
    console.log('1. backend/.env ファイルを開く');
    console.log('2. 以下の行を追加:');
    console.log('   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.fzcuexscuwhoywcicdqq.supabase.co:5432/postgres');
    console.log('3. [YOUR-PASSWORD] を実際のパスワードに置き換える');
    console.log('\nパスワードの取得方法:');
    console.log('- Supabaseダッシュボード → Project Settings → Database → Connection string');
    return;
  }
  
  console.log('✅ DATABASE_URL が設定されています');
  console.log(`   ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  // Step 2: Parse connection string
  console.log('📋 ステップ2: 接続文字列の解析');
  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
    console.log('✅ 接続文字列の形式が正しいです');
    console.log(`   ホスト: ${parsedUrl.hostname}`);
    console.log(`   ポート: ${parsedUrl.port}`);
    console.log(`   ユーザー: ${parsedUrl.username}`);
    console.log(`   データベース: ${parsedUrl.pathname.slice(1)}\n`);
  } catch (error) {
    console.error('❌ 接続文字列の形式が不正です');
    console.error(`   エラー: ${error.message}`);
    console.log('\n正しい形式:');
    console.log('postgresql://postgres:[PASSWORD]@db.fzcuexscuwhoywcicdqq.supabase.co:5432/postgres');
    return;
  }

  // Step 3: DNS resolution
  console.log('📋 ステップ3: ホスト名の解決');
  try {
    const addresses = await dns.promises.resolve4(parsedUrl.hostname);
    console.log('✅ ホスト名が解決できました');
    console.log(`   IPアドレス: ${addresses.join(', ')}\n`);
  } catch (error) {
    console.error('❌ ホスト名が解決できません');
    console.error(`   エラー: ${error.message}`);
    console.log('\n解決方法:');
    console.log('- インターネット接続を確認');
    console.log('- DNSサーバーの設定を確認');
    console.log('- VPN接続を確認');
    return;
  }

  // Step 4: TCP connection
  console.log('📋 ステップ4: TCP接続のテスト');
  const tcpConnected = await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port),
      timeout: 5000
    });

    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });

  if (!tcpConnected) {
    console.error('❌ TCP接続ができません');
    console.log('\n解決方法:');
    console.log('- ファイアウォールがポート5432をブロックしていないか確認');
    console.log('- プロキシ設定を確認');
    console.log('- Supabaseプロジェクトが実行中か確認');
    return;
  }

  console.log('✅ TCP接続が成功しました\n');

  // Step 5: PostgreSQL connection
  console.log('📋 ステップ5: PostgreSQL接続のテスト');
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✅ PostgreSQL接続が成功しました\n');

    // Step 6: Query test
    console.log('📋 ステップ6: クエリのテスト');
    const result = await client.query('SELECT version()');
    console.log('✅ クエリが成功しました');
    console.log(`   PostgreSQLバージョン: ${result.rows[0].version.split(',')[0]}\n`);

    // Success!
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ 全ての診断に合格しました！');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n次のステップ:');
    console.log('npx ts-node migrations/verify-081-direct-pg.ts');

  } catch (error) {
    console.error('❌ PostgreSQL接続に失敗しました');
    console.error(`   エラー: ${error.message}`);
    console.log('\n解決方法:');
    
    if (error.message.includes('password')) {
      console.log('1. パスワードが正しいか確認');
      console.log('2. Supabaseダッシュボードでパスワードをリセット');
      console.log('3. 新しいパスワードで DATABASE_URL を更新');
    } else if (error.message.includes('database')) {
      console.log('1. データベース名が正しいか確認（通常は "postgres"）');
      console.log('2. Supabaseプロジェクトが実行中か確認');
    } else if (error.message.includes('user')) {
      console.log('1. ユーザー名が正しいか確認（通常は "postgres"）');
    } else {
      console.log('1. Supabaseダッシュボードで接続文字列を再確認');
      console.log('2. プロジェクトが一時停止していないか確認');
      console.log('3. 接続制限に達していないか確認');
    }

  } finally {
    await client.end();
  }
}

diagnoseDatabaseConnection().catch(console.error);
```

### 接続文字列取得ガイド

```markdown
# DATABASE_URL の取得方法

## 手順

1. **Supabaseダッシュボードにアクセス**
   - https://app.supabase.com にログイン
   - プロジェクト「seller-management-personal」を選択

2. **Database設定を開く**
   - 左サイドバーから「Project Settings」をクリック
   - 「Database」タブをクリック

3. **Connection stringを取得**
   - 「Connection string」セクションを見つける
   - 「URI」タブを選択
   - パスワード入力欄に実際のパスワードを入力
   - 完全な接続文字列が表示される

4. **接続文字列をコピー**
   - 表示された文字列全体をコピー
   - 形式: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`

5. **`.env`ファイルに設定**
   - `backend/.env`ファイルを開く
   - `DATABASE_URL=`の行を見つける（なければ追加）
   - コピーした接続文字列を貼り付け
   - ファイルを保存

6. **接続をテスト**
   ```bash
   cd backend
   npx ts-node diagnose-database-connection.ts
   ```

## パスワードに特殊文字が含まれる場合

パスワードに以下の文字が含まれる場合、URLエンコードが必要です:
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`
- `[` → `%5B`
- `]` → `%5D`
- `%` → `%25`

例:
- パスワード: `my@pass:word`
- エンコード後: `my%40pass%3Aword`
```

## Execution Flow

```
1. 診断スクリプトを実行
   ↓
2. 環境変数を確認
   ├─ 設定なし → 設定方法を表示 → 終了
   └─ 設定あり → 次へ
   ↓
3. 接続文字列を解析
   ├─ 形式エラー → 正しい形式を表示 → 終了
   └─ 正常 → 次へ
   ↓
4. ホスト名を解決
   ├─ 失敗 → ネットワーク確認を促す → 終了
   └─ 成功 → 次へ
   ↓
5. TCP接続をテスト
   ├─ 失敗 → ファイアウォール確認を促す → 終了
   └─ 成功 → 次へ
   ↓
6. PostgreSQL接続をテスト
   ├─ 失敗 → 認証情報確認を促す → 終了
   └─ 成功 → 次へ
   ↓
7. クエリをテスト
   ├─ 失敗 → データベース状態確認を促す → 終了
   └─ 成功 → Migration 081検証へ進む
```

## Success Criteria

1. ✅ 診断スクリプトが全てのステップをパス
2. ✅ PostgreSQL接続が確立できる
3. ✅ 簡単なクエリが実行できる
4. ✅ Migration 081検証スクリプトが実行できる
5. ✅ 物件リストの同期が機能する

## Dependencies

- Node.js環境
- `pg` パッケージ
- Supabaseプロジェクトへのアクセス権
- 正しいデータベースパスワード
- ネットワーク接続

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| パスワードが不明 | High | Supabaseダッシュボードでリセット手順を提供 |
| ネットワーク制限 | Medium | ファイアウォール設定の確認手順を提供 |
| 特殊文字の問題 | Medium | URLエンコードの方法を明示 |
| プロジェクト一時停止 | Low | ダッシュボードでの確認方法を提供 |

## Out of Scope

- Supabaseプロジェクトの作成
- データベースの初期設定
- ネットワーク環境の構築
- ファイアウォールの設定変更

## References

- Migration 081 Spec: `.kiro/specs/migration-081-completion/requirements.md`
- 検証スクリプト: `backend/migrations/verify-081-direct-pg.ts`
- Supabase Documentation: https://supabase.com/docs/guides/database/connecting-to-postgres

---

**Created**: 2025-01-09  
**Priority**: Critical  
**Blocks**: Migration 081 Completion, Property Listing Sync
