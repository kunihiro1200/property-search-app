# Migration 081 - クイックフィックス

## 🎯 問題

valuationsテーブルのカラムはデータベースに存在するが、アプリケーションから見えない。

## ⚡ 解決方法（30秒）

### 1. Supabaseダッシュボードを開く

### 2. SQL Editorに移動

### 3. 以下をコピペして実行

```sql
NOTIFY pgrst, 'reload schema';
```

### 4. 10秒待つ

⏳ 1... 2... 3... 4... 5... 6... 7... 8... 9... 10

### 5. 検証

```bash
npx ts-node backend/migrations/verify-081-migration.ts
```

## ✅ 成功

```
✅ テーブル properties が存在します
✅ properties に必要なカラムがすべて存在します
✅ テーブル valuations が存在します
✅ valuations に必要なカラムがすべて存在します
```

## ❌ まだエラーが出る場合

### プロジェクト再起動（5分）

1. Supabaseダッシュボード → Settings → General
2. **Pause project**
3. 待つ（1-2分）
4. **Resume project**
5. 待つ（2-3分）
6. 検証スクリプトを再実行

---

**それでもダメなら**: `backend/migrations/081_NEXT_STEPS.md`を参照
