# Gmail送信元選択機能 - 実装完了

## 実装概要

売主リストのEmail送信機能に、送信元メールアドレスを選択できる機能を追加しました。ユーザーは有効な社員のメールアドレスから送信元を選択でき、売主からの返信先を制御できるようになりました。

## 実装内容

### Backend

#### 1. 有効な社員取得API (`GET /employees/active`)
- 有効な社員のメールアドレス一覧を取得するエンドポイントを追加
- メールアドレスが存在する社員のみをフィルタリング
- **GYOSHA除外機能**: メールアドレスに"GYOSHA"を含むユーザーを自動除外
- **tenant@ifoo-oita.comは常に含める**: デフォルト送信元として必ず利用可能
- 名前でソート

**フィルタリングルール:**
- `is_active = true` (有効な社員のみ)
- `email IS NOT NULL AND email != ''` (メールアドレスが存在する)
- メールアドレスに "GYOSHA" が含まれない（大文字小文字を区別しない）
- ただし、`tenant@ifoo-oita.com` は常に含める

**除外される例:**
- `GYOSHA@ifoo-oita.com` → 除外される
- `gyosha.test@example.com` → 除外される

**常に含まれる:**
- `tenant@ifoo-oita.com` → 常に含まれる（デフォルト送信元）

**ファイル:**
- `backend/src/routes/employees.ts`

#### 2. Email送信APIの更新
- `POST /sellers/:sellerId/send-template-email` に `from` パラメータを追加
- `from` パラメータのバリデーション
- `from` が指定されていない場合は `employeeEmail` を使用（後方互換性）

**ファイル:**
- `backend/src/routes/emails.ts`
- `backend/src/services/EmailService.supabase.ts`

### Frontend

#### 1. SenderAddressSelectorコンポーネント
- 送信元アドレス選択用のドロップダウンコンポーネント
- 社員名とメールアドレスを表示
- デフォルト値として `tenant@ifoo-oita.com` を設定
- ツールチップで社員の役割を表示

**ファイル:**
- `frontend/src/components/SenderAddressSelector.tsx`

#### 2. 社員データ取得とキャッシュ
- `/employees/active` を呼び出す関数を作成
- ローカルストレージでキャッシュ（5分間有効）
- エラーハンドリング

**ファイル:**
- `frontend/src/services/employeeService.ts`

#### 3. セッションストレージでの選択保持
- 送信元アドレスの選択をセッションストレージに保存
- ページ遷移後も選択を保持

**ファイル:**
- `frontend/src/utils/senderAddressStorage.ts`

#### 4. CallModePageへの統合
- SenderAddressSelectorをEmail送信UIに追加
- 選択された送信元アドレスを状態管理
- Email送信時に選択された送信元アドレスをAPIに送信

**ファイル:**
- `frontend/src/pages/CallModePage.tsx`

## 使用方法

### 1. Email送信時の送信元選択

1. 売主詳細ページ（CallModePage）でEmailテンプレートを選択
2. 確認ダイアログが表示されます
3. **送信元**ドロップダウンから送信元メールアドレスを選択
   - デフォルト: `tenant@ifoo-oita.com`
   - 有効な社員のメールアドレスから選択可能
4. 送信先、件名、本文を確認・編集
5. 送信ボタンをクリック

### 2. 送信元アドレスの保持

- 一度選択した送信元アドレスは、セッションが続く限り保持されます
- ページを再読み込みしても、同じセッション内であれば選択が保持されます
- ブラウザを閉じると、次回はデフォルトの `tenant@ifoo-oita.com` に戻ります

### 3. 社員データのキャッシュ

- 社員データは5分間ローカルストレージにキャッシュされます
- キャッシュが有効な間は、APIを呼び出さずに高速に表示されます
- 新しい社員が追加された場合、5分後に自動的に反映されます

## 技術的な詳細

### デフォルト送信元アドレス

```typescript
const DEFAULT_SENDER_ADDRESS = 'tenant@ifoo-oita.com';
```

### キャッシュの有効期限

```typescript
const CACHE_DURATION = 5 * 60 * 1000; // 5分
```

### セッションストレージのキー

```typescript
const SENDER_ADDRESS_KEY = 'email_sender_address';
```

## 後方互換性

既存のEmail送信機能との互換性を保つため、`from`パラメータが指定されていない場合は、従来通り`employeeEmail`（ログインユーザーのメールアドレス）を使用します。

```typescript
// fromが指定されていない場合はemployeeEmailを使用（後方互換性）
const senderAddress = from || employeeEmail;
```

## トラブルシューティング

### 社員データが表示されない

1. ブラウザのコンソールでエラーを確認
2. `/employees/active` APIが正常に動作しているか確認
3. ローカルストレージのキャッシュをクリア: `localStorage.removeItem('employees_cache')`

### 送信元アドレスが保存されない

1. ブラウザのセッションストレージが有効か確認
2. プライベートブラウジングモードを使用していないか確認

### Email送信時にエラーが発生する

1. 選択した送信元アドレスが有効な社員のメールアドレスか確認
2. バックエンドのログを確認
3. Gmail APIの認証が正常か確認

## 今後の拡張

### PropertyListingDetailPageへの統合

現在、CallModePageのみに実装されていますが、将来的にPropertyListingDetailPageのGmail配信機能にも同様の送信元選択機能を追加できます。

**実装手順:**
1. PropertyListingDetailPageに同じimportを追加
2. 同じ状態管理を追加
3. Gmail配信ボタンのハンドラーに`from`パラメータを追加

## テスト

### Backend APIテスト

```bash
cd backend
npx ts-node test-active-employees-endpoint.ts
npx ts-node test-gyosha-exclusion-direct.ts
```

### テスト結果

GYOSHA除外機能のテスト結果:
```
✅ PASSED: GYOSHA users are excluded
✅ PASSED: tenant@ifoo-oita.com is included
🎉 All tests PASSED!

Total active employees: 10
After filtering: 9
Excluded: 1 (GYOSHA@ifoo-oita.com)
```

### 手動テスト

1. バックエンドとフロントエンドを起動
2. 売主詳細ページにアクセス
3. Emailテンプレートを選択
4. 送信元ドロップダウンが表示されることを確認
5. 異なる送信元を選択してEmailを送信
6. 送信されたEmailの送信元アドレスを確認

## 変更履歴

### 2025-12-19: GYOSHA除外機能の追加
- `GYOSHA@ifoo-oita.com` などの業者用アカウントを送信元選択から除外
- `tenant@ifoo-oita.com` は例外として常に利用可能
- フィルタリングロジックをバックエンドAPIに実装
- テストスクリプトを追加して動作確認

### 2025-12-19: 初回実装
- 送信元メールアドレス選択機能の実装
- 社員データ取得とキャッシュ機能
- セッションストレージでの選択保持

## 完了日

2025年12月19日

## 実装者

Kiro AI Assistant
