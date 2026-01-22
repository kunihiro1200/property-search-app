# Migration 015: スタッフ詳細情報の追加

## 概要
employeesテーブルにスタッフの詳細情報（イニシャル、名前、Chat webhook、電話番号）を追加します。

## 追加されるカラム
- `initials`: スタッフのイニシャル（例：KK、YY）
- `last_name`: 姓
- `first_name`: 名
- `chat_webhook_url`: Google Chat Webhook URL
- `phone_number`: 電話番号

## 実行方法

### オプション1: Supabase SQLエディタで実行（推奨）

1. Supabaseダッシュボードにログイン
2. SQL Editorを開く
3. `backend/migrations/015_add_staff_details.sql`の内容をコピー＆ペースト
4. 実行

### オプション2: TypeScriptスクリプトで実行

```bash
cd backend/migrations
npx ts-node run-015-migration.ts
```

## 登録されるスタッフ

| イニシャル | 名前 | メールアドレス | 電話番号 |
|-----------|------|---------------|----------|
| KK | 国広智子 | tomoko.kunihiro@ifoo-oita.com | 09066394809 |
| YY | 山本裕子 | yuuko.yamamoto@ifoo-oita.com | 08044435905 |
| II | 角井宏充 | hiromitsu-kakui@ifoo-oita.com | 07031283766 |
| 生 | 生野陸斗 | rikuto.shouno@ifoo-oita.com | 08097125265 |
| UU | 裏天真 | tenma.ura@ifoo-oita.com | 08034165869 |
| RR | 木村侑里音 | yurine.kimura@ifoo-oita.com | 08046223810 |
| 久 | 久米マリ子 | mariko.kume@ifoo-oita.com | 08046223532 |
| HH | 廣瀬尚美 | naomi.hirose@ifoo-oita.com | 07031283763 |
| 事務 | 事務 | GYOSHA@ifoo-oita.com | - |
| 業者 | 業者 | tenant@ifoo-oita.com | - |

## 検証

マイグレーション後、以下のSQLで確認：

```sql
SELECT initials, name, email, phone_number, chat_webhook_url 
FROM employees 
ORDER BY initials;
```

## ロールバック

カラムを削除する場合：

```sql
ALTER TABLE employees DROP COLUMN IF EXISTS initials;
ALTER TABLE employees DROP COLUMN IF EXISTS last_name;
ALTER TABLE employees DROP COLUMN IF EXISTS first_name;
ALTER TABLE employees DROP COLUMN IF EXISTS chat_webhook_url;
ALTER TABLE employees DROP COLUMN IF EXISTS phone_number;
```

## 影響範囲

- システム全体でスタッフ選択時にイニシャルが使用可能になります
- 初電者、査定担当などの選択でイニシャルが表示されます
- Google Chat通知機能で個別のWebhook URLが使用できます
