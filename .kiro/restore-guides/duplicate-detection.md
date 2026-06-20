---
tags: [general, code-quality, eslint, troubleshooting, best-practices]
priority: medium
context: all
inclusion: always
last-verified: 2026-01-25
---

# 重複宣言の検出と防止ガイド

## 概要

このプロジェクトでは、重複宣言（関数、変数、インポートなど）が頻繁にエラーの原因となっています。
このガイドでは、重複を早期に検出し、防止するためのベストプラクティスを定義します。

## よくある重複パターン

### 1. 関数の重複宣言

**問題例**:
```typescript
// ファイルの先頭でインポート
import { isPropertyClickable } from '../utils/propertyStatusUtils';

// ... コード ...

// ファイルの最後で再定義（重複！）
function isPropertyClickable(atbbStatus: string | null | undefined): boolean {
  // ...
}
```

**解決策**:
- インポートした関数は再定義しない
- ファイル内で関数を定義する場合は、インポートしない
- ESLintの`no-redeclare`ルールが有効になっているか確認

### 2. インポートの重複

**問題例**:
```typescript
import { useState } from 'react';
import { useEffect } from 'react';
import { useState } from 'react'; // 重複！
```

**解決策**:
```typescript
import { useState, useEffect } from 'react';
```

### 3. 変数の重複宣言

**問題例**:
```typescript
const apiUrl = 'http://localhost:3000';
// ... コード ...
const apiUrl = process.env.API_URL; // 重複！
```

**解決策**:
- 変数名を変更する
- スコープを分ける
- 既存の変数を再利用する

## ESLintルール

以下のESLintルールが有効になっています：

```json
{
  "rules": {
    "no-redeclare": "error",
    "@typescript-eslint/no-redeclare": "error",
    "no-duplicate-imports": "error"
  }
}
```

## 重複検出のチェックリスト

コードを書く際は、以下をチェックしてください：

### ✅ コーディング前
1. **インポートを確認**: 使用する関数やコンポーネントが既にインポートされているか確認
2. **既存の関数を検索**: 同じ名前の関数が既に存在しないか`Ctrl+F`で検索
3. **ユーティリティファイルを確認**: 共通関数は`utils/`フォルダに既に存在する可能性がある

### ✅ コーディング中
1. **IDEの警告を確認**: VSCodeやKiroは重複宣言を警告で表示する
2. **ESLintを実行**: `npm run lint`でコード全体をチェック
3. **型エラーを確認**: TypeScriptコンパイラも重複を検出する

### ✅ コーディング後
1. **ファイル全体を見直す**: 特にファイルの先頭と最後を確認
2. **インポート文を整理**: 未使用のインポートを削除
3. **ESLintの自動修正を実行**: `npm run lint -- --fix`

## 重複エラーが発生した場合の対処法

### ステップ1: エラーメッセージを確認
```
Duplicate declaration "isPropertyClickable"
```

### ステップ2: 重複箇所を特定
- エラーメッセージに表示されている行番号を確認
- `Ctrl+F`で関数名を検索し、全ての出現箇所を確認

### ステップ3: 重複を解消
1. **インポートと定義が重複している場合**:
   - インポートを使用する場合: ファイル内の定義を削除
   - ファイル内の定義を使用する場合: インポートを削除

2. **複数の定義が存在する場合**:
   - どちらか一方を削除
   - または、関数名を変更して区別する

3. **インポートが重複している場合**:
   - 1つのインポート文にまとめる

### ステップ4: 確認
- ESLintを実行: `npm run lint`
- 開発サーバーを再起動
- ブラウザでエラーが解消されたか確認

## 自動検出ツール

### ESLintの実行
```bash
# フロントエンド
cd frontend
npm run lint

# バックエンド
cd backend
npm run lint
```

### 自動修正
```bash
# フロントエンド
cd frontend
npm run lint -- --fix

# バックエンド
cd backend
npm run lint -- --fix
```

### VSCodeの設定

`.vscode/settings.json`に以下を追加すると、保存時に自動でESLintが実行されます：

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

## よくある質問

### Q: インポートした関数を修正したい場合は？
A: 元のファイル（例: `utils/propertyStatusUtils.ts`）を修正してください。ローカルで再定義しないでください。

### Q: 同じ名前の関数を別の実装で使いたい場合は？
A: 関数名を変更するか、インポート時にエイリアスを使用してください：
```typescript
import { isPropertyClickable as isClickableUtil } from '../utils/propertyStatusUtils';

function isPropertyClickable(atbbStatus: string) {
  // カスタム実装
}
```

### Q: ESLintエラーが表示されない場合は？
A: 
1. ESLintが正しくインストールされているか確認: `npm list eslint`
2. `.eslintrc.json`が正しく設定されているか確認
3. VSCodeのESLint拡張機能がインストールされているか確認

## まとめ

重複宣言は以下の方法で防止できます：

1. **ESLintルールを有効にする** ✓ 完了
2. **コーディング前に既存コードを確認する**
3. **IDEの警告に注意する**
4. **定期的に`npm run lint`を実行する**
5. **コードレビュー時に重複をチェックする**

このガイドに従うことで、重複宣言によるエラーを大幅に減らすことができます。
