# Gmail送信元選択機能 トラブルシューティングガイド

## 問題: 送信元アドレスが空のまま表示されない

### 症状
- EmailTemplateSelectorモーダルを開いても送信元アドレスのドロップダウンが表示されない
- または、ドロップダウンは表示されるが選択肢が空

### 原因の可能性

#### 1. バックエンドAPIエラー

**確認方法:**
1. ブラウザの開発者ツールを開く（F12）
2. Consoleタブを確認
3. `/api/employees/active` へのリクエストでエラーが出ていないか確認

**よくあるエラー:**
- `401 Unauthorized`: 認証エラー
- `500 Internal Server Error`: サーバーエラー
- `404 Not Found`: エンドポイントが見つからない

**解決方法:**
```bash
# バックエンドサーバーを再起動
cd backend
npm run dev
```

#### 2. データベースに社員データが存在しない

**確認方法:**
```sql
-- Supabaseダッシュボードで実行
SELECT id, email, name, role, initials, is_active
FROM employees
WHERE is_active = true
  AND email IS NOT NULL
  AND email != '';
```

**解決方法:**
社員データが存在しない場合は、データを追加する必要があります。

#### 3. GYOSHA除外フィルターで全員除外されている

**確認方法:**
```sql
-- GYOSHAを含むメールアドレスを確認
SELECT id, email, name
FROM employees
WHERE is_active = true
  AND email ILIKE '%GYOSHA%';
```

**解決方法:**
- `tenant@ifoo-oita.com` は常に表示されるはずです
- 他の社員のメールアドレスに "GYOSHA" が含まれていないか確認

#### 4. キャッシュの問題

**確認方法:**
ブラウザのコンソールで以下を実行:
```javascript
localStorage.removeItem('employees_cache');
location.reload();
```

**解決方法:**
キャッシュをクリアして再読み込み

### デバッグ手順

#### ステップ1: ブラウザコンソールでログを確認

```javascript
// コンソールに以下のようなログが表示されるはずです
// ✅ Using cached employee data
// または
// 📡 Fetching active employees from API
// ✅ Fetched X active employees
```

エラーが表示される場合は、そのエラーメッセージを確認してください。

#### ステップ2: APIを直接テスト

ブラウザのコンソールで以下を実行:
```javascript
fetch('/api/employees/active', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => console.log('Employees:', data))
.catch(err => console.error('Error:', err));
```

#### ステップ3: バックエンドログを確認

バックエンドのターミナルで以下のようなログを確認:
```
Returning X active employees (excluding GYOSHA users)
```

#### ステップ4: ネットワークタブで確認

1. ブラウザの開発者ツールを開く（F12）
2. Networkタブを選択
3. EmailTemplateSelectorを開く
4. `/api/employees/active` へのリクエストを確認
5. Responseタブでレスポンスの内容を確認

### 期待される動作

#### 正常なレスポンス例:
```json
{
  "employees": [
    {
      "id": "1",
      "email": "tenant@ifoo-oita.com",
      "name": "テナント",
      "role": "admin",
      "initials": "T"
    },
    {
      "id": "2",
      "email": "tomoko.kunihiro@ifoo-oita.com",
      "name": "国広智子",
      "role": "agent",
      "initials": "K"
    }
  ]
}
```

#### 正常なUI表示:
- EmailTemplateSelectorモーダルの上部に「送信元」ドロップダウンが表示される
- デフォルトで「tenant@ifoo-oita.com」が選択されている
- ドロップダウンを開くと、有効な社員のメールアドレスが表示される

### よくある問題と解決方法

#### 問題1: "tenant@ifoo-oita.com" しか表示されない

**原因:**
- データベースに他の社員データが存在しない
- または、全ての社員のメールアドレスに "GYOSHA" が含まれている

**解決方法:**
```sql
-- 社員データを確認
SELECT id, email, name, is_active
FROM employees
WHERE is_active = true;
```

#### 問題2: ドロップダウンが全く表示されない

**原因:**
- `SenderAddressSelector` コンポーネントがインポートされていない
- または、propsが正しく渡されていない

**解決方法:**
```typescript
// EmailTemplateSelector.tsx を確認
import SenderAddressSelector from './SenderAddressSelector';

// propsが正しく渡されているか確認
<SenderAddressSelector
  value={senderAddress}
  onChange={onSenderAddressChange}
  employees={employees}
/>
```

#### 問題3: 選択しても反映されない

**原因:**
- `onSenderAddressChange` が正しく実装されていない
- セッションストレージへの保存が失敗している

**解決方法:**
```javascript
// ブラウザコンソールで確認
sessionStorage.getItem('gmail_sender_address');
// 選択したアドレスが表示されるはずです
```

### 手動テスト手順

1. **EmailTemplateSelectorを開く**
   - 物件リストページで「Gmailで配信」ボタンをクリック

2. **送信元ドロップダウンを確認**
   - モーダルの上部に「送信元」ドロップダウンが表示されることを確認
   - デフォルトで「tenant@ifoo-oita.com」が選択されていることを確認

3. **送信元を変更**
   - ドロップダウンを開いて別の社員を選択
   - 選択が反映されることを確認

4. **テンプレートを選択**
   - メールテンプレートを選択
   - BuyerFilterSummaryModalが開くことを確認

5. **送信元アドレスの表示を確認**
   - BuyerFilterSummaryModalに選択した送信元アドレスが表示されることを確認

6. **メール送信**
   - 「メールを送信」ボタンをクリック
   - 成功メッセージに送信元アドレスが含まれることを確認

### 緊急対応

もし上記の手順で解決しない場合は、以下の緊急対応を実施してください:

1. **バックエンドサーバーを再起動**
```bash
cd backend
npm run dev
```

2. **フロントエンドを再ビルド**
```bash
cd frontend
npm run build
npm run dev
```

3. **ブラウザのキャッシュをクリア**
- Ctrl + Shift + Delete
- キャッシュと Cookie をクリア
- ページを再読み込み

4. **データベース接続を確認**
```bash
# backend/.env を確認
cat backend/.env | grep SUPABASE
```

### サポート情報の収集

問題が解決しない場合は、以下の情報を収集してください:

1. **ブラウザコンソールのエラーログ**
2. **バックエンドサーバーのログ**
3. **ネットワークタブのリクエスト/レスポンス**
4. **データベースの社員データ**
```sql
SELECT COUNT(*) as total_employees,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_employees,
       COUNT(CASE WHEN is_active = true AND email IS NOT NULL AND email != '' THEN 1 END) as active_with_email
FROM employees;
```

これらの情報があれば、問題の特定と解決が容易になります。
