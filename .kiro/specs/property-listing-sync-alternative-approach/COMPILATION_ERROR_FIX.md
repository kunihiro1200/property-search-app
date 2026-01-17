# コンパイルエラー修正ガイド

**作成日**: 2025-01-10  
**ステータス**: 🔄 進行中  
**優先度**: 🔴 高

## 問題の概要

`PropertyListingRestSyncService.ts`で`PropertyListingSyncProcessor`のインポートに関するコンパイルエラーが発生しています。

## エラー詳細

```
Error: Cannot find module './PropertyListingSyncProcessor' or its corresponding type declarations
```

## 調査結果

### ✅ 確認済み項目

1. **ファイルの存在**: `backend/src/services/PropertyListingSyncProcessor.ts`は存在する
2. **エクスポート**: `PropertyListingSyncProcessor`クラスは正しく`export`されている
3. **インポート文**: インポート文の構文は正しい

```typescript
import { PropertyListingSyncProcessor, PropertyListing, SyncResult } from './PropertyListingSyncProcessor';
```

### 🔍 考えられる原因

1. **TypeScriptコンパイラキャッシュの問題**
   - TypeScriptコンパイラがキャッシュされた古い情報を使用している可能性

2. **tsconfig.jsonの設定問題**
   - モジュール解決の設定が正しくない可能性

3. **循環依存の問題**
   - ファイル間で循環依存が発生している可能性

4. **ビルド順序の問題**
   - ファイルのビルド順序が正しくない可能性

## 解決手順

### ステップ1: TypeScriptコンパイラキャッシュのクリア

```bash
# backendディレクトリに移動
cd backend

# node_modulesとビルド成果物を削除
rm -rf node_modules
rm -rf dist
rm -rf .tsbuildinfo

# 依存関係を再インストール
npm install

# ビルドを実行
npm run build
```

**Windows (PowerShell):**
```powershell
cd backend
Remove-Item -Recurse -Force node_modules, dist, .tsbuildinfo -ErrorAction SilentlyContinue
npm install
npm run build
```

### ステップ2: tsconfig.jsonの確認

`backend/tsconfig.json`を確認し、以下の設定が正しいことを確認:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "*": ["*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### ステップ3: 循環依存のチェック

循環依存を検出するツールを使用:

```bash
# madgeをインストール（まだの場合）
npm install -g madge

# 循環依存をチェック
madge --circular backend/src
```

### ステップ4: インポートパスの明示的な指定

`PropertyListingRestSyncService.ts`のインポート文を以下のように変更:

```typescript
// 相対パスを明示的に指定
import { 
  PropertyListingSyncProcessor, 
  PropertyListing, 
  SyncResult 
} from './PropertyListingSyncProcessor';
```

または、絶対パスを使用:

```typescript
// 絶対パスを使用（tsconfig.jsonのbaseUrlが設定されている場合）
import { 
  PropertyListingSyncProcessor, 
  PropertyListing, 
  SyncResult 
} from 'services/PropertyListingSyncProcessor';
```

### ステップ5: 型定義ファイルの確認

`PropertyListingSyncProcessor.ts`が正しくコンパイルされているか確認:

```bash
# TypeScriptコンパイラで単一ファイルをチェック
npx tsc --noEmit backend/src/services/PropertyListingSyncProcessor.ts
```

### ステップ6: IDEのキャッシュクリア

**VS Code:**
1. コマンドパレットを開く（Ctrl+Shift+P / Cmd+Shift+P）
2. "TypeScript: Restart TS Server"を実行
3. VS Codeを再起動

**その他のIDE:**
- キャッシュをクリアして再起動

## 検証方法

### 1. コンパイルエラーの確認

```bash
cd backend
npm run build
```

エラーが表示されないことを確認。

### 2. テストの実行

```bash
cd backend
npm test -- PropertyListingSyncProcessor
```

関連するテストが成功することを確認。

### 3. 型チェックの実行

```bash
cd backend
npx tsc --noEmit
```

型エラーが表示されないことを確認。

## 代替案

### 代替案1: インポートの再構成

`PropertyListingSyncProcessor`の型定義を別ファイルに分離:

**新規ファイル**: `backend/src/types/propertyListingSync.ts`

```typescript
export interface PropertyListing {
  property_number: string;
  [key: string]: any;
}

export interface SyncConfig {
  batchSize: number;
  rateLimit: number;
  concurrency?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SyncResult {
  syncId: string;
  status: 'completed' | 'failed' | 'partial';
  startedAt: Date;
  completedAt: Date;
  stats: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    transientErrors: number;
    permanentErrors: number;
    validationErrors: number;
  };
  errors: SyncError[];
}

export interface SyncError {
  propertyNumber: string;
  error: string;
  errorType: 'transient' | 'permanent' | 'validation' | 'unknown';
  retryCount: number;
  timestamp: Date;
}
```

**修正**: `PropertyListingSyncProcessor.ts`

```typescript
import { PropertyListing, SyncConfig, SyncResult, SyncError } from '../types/propertyListingSync';

export class PropertyListingSyncProcessor {
  // 実装...
}
```

**修正**: `PropertyListingRestSyncService.ts`

```typescript
import { PropertyListingSyncProcessor } from './PropertyListingSyncProcessor';
import { PropertyListing, SyncResult } from '../types/propertyListingSync';
```

### 代替案2: バレルエクスポートの使用

**新規ファイル**: `backend/src/services/index.ts`

```typescript
export * from './PropertyListingSyncProcessor';
export * from './PropertyListingRestSyncService';
export * from './SyncStateService';
// その他のサービス...
```

**修正**: `PropertyListingRestSyncService.ts`

```typescript
import { PropertyListingSyncProcessor, PropertyListing, SyncResult } from './';
```

## 成功基準

- ✅ `npm run build`がエラーなく完了する
- ✅ `npx tsc --noEmit`がエラーを報告しない
- ✅ 関連するテストがすべて成功する
- ✅ IDEで型エラーが表示されない

## 次のステップ

1. **即座に実行**: ステップ1（キャッシュクリア）を実行
2. **検証**: コンパイルエラーが解決されたか確認
3. **テスト**: 関連するテストを実行
4. **ドキュメント更新**: 解決方法をドキュメントに記録

## 関連ドキュメント

- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - 現在の状況
- [tasks.md](./tasks.md) - タスク一覧
- [design.md](./design.md) - 設計ドキュメント

## トラブルシューティング

### 問題: キャッシュクリア後もエラーが続く

**解決策**:
1. `package-lock.json`を削除して再インストール
2. Node.jsのバージョンを確認（推奨: v18以上）
3. TypeScriptのバージョンを確認（推奨: v5.0以上）

### 問題: 循環依存が検出された

**解決策**:
1. 循環依存を引き起こしているファイルを特定
2. 共通の型定義を別ファイルに分離
3. インポート順序を調整

### 問題: IDEで型エラーが表示されるがビルドは成功する

**解決策**:
1. IDEのTypeScriptバージョンを確認
2. ワークスペースのTypeScriptバージョンを使用するよう設定
3. IDEを再起動

---

**最終更新**: 2025-01-10  
**作成者**: Kiro AI Assistant  
**レビュー**: 未実施
