# 概算書PDF生成の修正ガイド

## ⚠️ 問題の症状

以下の症状が発生した場合、このガイドを使用してください：

1. **概算書ボタンをクリックすると500エラーが発生する**
2. **ブラウザのコンソールに「概算書の生成に失敗しました」と表示される**
3. **Vercelログに`error:1E08010C:DECODER routines::unsupported`エラーが表示される**

---

## ✅ 正しい動作

- **概算書ボタンをクリックすると、新しいタブでPDFが開く**
- **エラーが発生しない**
- **Vercelログに`[generateEstimatePdf] ✅ Converted \\\\n to actual newlines in private_key`が表示される**

---

## 🔧 復元方法

### 方法1: コミットから復元（推奨）

```bash
# 動作確認済みコミット: 2ec19cd
git checkout 2ec19cd -- backend/src/services/PropertyService.ts
git add backend/src/services/PropertyService.ts
git commit -m "Restore: Fix estimate PDF generation (commit 2ec19cd)"
git push
```

### 方法2: 手動で修正

**ファイル**: `backend/src/services/PropertyService.ts`

**修正箇所**: `generateEstimatePdf()`メソッド内（約445行目）

**修正内容**:

```typescript
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  // Vercel環境: 環境変数から直接読み込む
  console.log(`[generateEstimatePdf] Using GOOGLE_SERVICE_ACCOUNT_JSON from environment`);
  try {
    keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    console.log(`[generateEstimatePdf] Successfully parsed GOOGLE_SERVICE_ACCOUNT_JSON`);
    
    // ⚠️ 重要：private_keyの\\nを実際の改行に変換
    if (keyFile.private_key) {
      keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
      console.log(`[generateEstimatePdf] ✅ Converted \\\\n to actual newlines in private_key`);
    }
  } catch (parseError: any) {
    console.error(`[generateEstimatePdf] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:`, parseError);
    throw new Error(`認証情報のパースに失敗しました: ${parseError.message}`);
  }
}
```

**重要なポイント**:
- `keyFile.private_key.replace(/\\n/g, '\n')`が必須
- この処理がないと、Google APIが`private_key`を認識できない

---

## 📝 次回の復元依頼の仕方

問題が発生したら、以下のように伝えてください：

### パターン1: シンプルな依頼
```
概算書PDF生成が失敗する。
コミット 2ec19cd に戻して。
```

### パターン2: 詳細な依頼
```
概算書ボタンをクリックすると500エラーが発生する。
PropertyService.tsのprivate_key改行変換処理を復元して。
```

### パターン3: ファイル名を指定
```
PropertyService.tsの概算書PDF生成を修正して。
private_keyの\\nを\nに変換する処理が必要。
```

---

## 🔍 確認方法

### ステップ1: コードを確認

```bash
# private_key変換処理が含まれているか確認
Get-Content backend/src/services/PropertyService.ts | Select-String -Pattern "private_key.*replace" -Context 2
```

**期待される出力**:
```typescript
// ⚠️ 重要：private_keyの\\nを実際の改行に変換
if (keyFile.private_key) {
  keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
  console.log(`[generateEstimatePdf] ✅ Converted \\\\n to actual newlines in private_key`);
}
```

### ステップ2: ブラウザで確認

1. 物件詳細ページを開く（例: AA13447）
   ```
   https://property-site-frontend-kappa.vercel.app/public/properties/AA13447
   ```

2. 「概算書を表示」ボタンをクリック

3. 新しいタブでPDFが開くことを確認

### ステップ3: Vercelログで確認

1. Vercelダッシュボードを開く
   ```
   https://vercel.com/kunihiro1200s-projects/property-site-frontend/deployments
   ```

2. 最新のデプロイメント → Functions → `/api/public/properties/[propertyNumber]/estimate-pdf`

3. ログに以下が表示されることを確認:
   ```
   [generateEstimatePdf] ✅ Converted \\n to actual newlines in private_key
   ```

---

## 📊 Git履歴

### 成功したコミット

**コミットハッシュ**: `2ec19cd`

**コミットメッセージ**: "Fix: Convert \\n to actual newlines in private_key for estimate PDF generation (same as GoogleDriveService)"

**変更内容**:
```diff
+ // ⚠️ 重要：private_keyの\\nを実際の改行に変換
+ if (keyFile.private_key) {
+   keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
+   console.log(`[generateEstimatePdf] ✅ Converted \\\\n to actual newlines in private_key`);
+ }
```

**変更ファイル**:
- `backend/src/services/PropertyService.ts`

**日付**: 2026年1月25日

---

## 🎯 重要なポイント

### なぜこの修正が必要か

1. **Vercel環境変数の仕様**:
   - JSON文字列として保存される際、`\n`が`\\n`（エスケープされた文字列）になる
   - 例: `"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADA..."`

2. **Google APIの要求**:
   - 実際の改行文字（`\n`）を期待している
   - 例: `"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADA..."`

3. **変換処理の必要性**:
   - `\\n`（文字列）を`\n`（改行文字）に変換する必要がある
   - `replace(/\\n/g, '\n')`で変換

### この処理を削除してはいけない理由

- **削除すると**: Google APIが`private_key`を認識できず、`error:1E08010C:DECODER routines::unsupported`エラーが発生
- **結果**: 概算書PDF生成が失敗する

---

## 🐛 トラブルシューティング

### 問題1: 修正したのに概算書が生成されない

**原因**: Vercelのデプロイが完了していない

**解決策**:
1. Vercelダッシュボードでデプロイ状況を確認
2. デプロイ完了まで2-3分待つ
3. ブラウザでハードリロード（`Ctrl + Shift + R`）

### 問題2: Vercelログにエラーが表示される

**原因**: `GOOGLE_SERVICE_ACCOUNT_JSON`環境変数が正しく設定されていない

**解決策**:
1. Vercel環境変数を確認
   ```
   https://vercel.com/kunihiro1200s-projects/property-site-frontend/settings/environment-variables
   ```
2. `GOOGLE_SERVICE_ACCOUNT_JSON`が設定されているか確認
3. JSON形式が正しいか確認（`private_key`フィールドが含まれているか）

### 問題3: ローカル環境では動作するが、Vercel環境で失敗する

**原因**: ローカル環境とVercel環境で認証情報の読み込み方法が異なる

**解決策**:
- ローカル環境: `google-service-account.json`ファイルから読み込む
- Vercel環境: `GOOGLE_SERVICE_ACCOUNT_JSON`環境変数から読み込む
- 両方の環境で動作するように、条件分岐が正しく実装されているか確認

---

## 📚 関連ドキュメント

- [パノラマ・概算書修正セッション記録](.kiro/steering/archive/session-2026-01-25-panorama-estimate-pdf-fix.md)
- [GoogleDriveService.ts](../../backend/src/services/GoogleDriveService.ts) - 同じ改行変換処理が実装されている

---

## ✅ 復元完了チェックリスト

修正後、以下を確認してください：

- [ ] `private_key.replace(/\\n/g, '\n')`が含まれている
- [ ] コミットメッセージに「private_key」または「estimate PDF」が含まれている
- [ ] GitHubにプッシュ済み
- [ ] Vercelのデプロイが完了している
- [ ] ブラウザでハードリロード済み
- [ ] 概算書ボタンをクリックしてPDFが開くことを確認
- [ ] Vercelログに`✅ Converted \\\\n to actual newlines in private_key`が表示される

---

## 🎯 まとめ

### 修正内容

**6行の追加**:
```typescript
// ⚠️ 重要：private_keyの\\nを実際の改行に変換
if (keyFile.private_key) {
  keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
  console.log(`[generateEstimatePdf] ✅ Converted \\\\n to actual newlines in private_key`);
}
```

### 次回の復元依頼

**最もシンプルな依頼**:
```
概算書PDF生成を修正して
```

**または**:
```
コミット 2ec19cd に戻して
```

### 重要なポイント

- **`private_key`の改行変換が必須**
- **`GoogleDriveService.ts`と同じ処理**
- **この処理を削除すると概算書が生成されなくなる**

---

**このドキュメントは、問題が発生した際の復元用です。必ず保管してください。**

**最終更新日**: 2026年1月25日  
**コミットハッシュ**: `2ec19cd`  
**ステータス**: ✅ 修正完了・動作確認済み

---

## 🚀 成功事例

**日付**: 2026年1月25日

**問題**:
1. 概算書ボタンをクリックすると500エラー
2. Vercelログに`error:1E08010C:DECODER routines::unsupported`エラー
3. Redisキャッシュエラーも発生

**解決策**:
1. Redisキャッシュエラーをtry-catchでスキップ
2. `private_key`の改行変換処理を追加

**結果**:
- ✅ 概算書PDFが正常に生成される
- ✅ エラーが発生しない
- ✅ ローカル環境とVercel環境の両方で動作

**ユーザーの反応**:
> 「OK」

---

**次回も同じ問題が発生したら、このドキュメントを参照してください！**
