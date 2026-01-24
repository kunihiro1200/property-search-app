# 公開物件サイト「公開中のみ表示」デフォルト設定変更 - タスクリスト

## タスク概要

`PublicPropertiesPage.tsx`の`showPublicOnly`ステートの初期値を`true`から`false`に変更します。

---

## タスク

### 1. コード変更

- [ ] 1.1 `frontend/src/pages/PublicPropertiesPage.tsx`の69行目を変更
  - **変更前**: `const [showPublicOnly, setShowPublicOnly] = useState<boolean>(true);`
  - **変更後**: `const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);`
  - **コメント**: `// 公開中のみ表示フィルター状態（デフォルトで全物件を表示）`

### 2. ローカル環境での動作確認

- [ ] 2.1 開発サーバーを起動
  ```bash
  cd frontend
  npm run dev
  ```

- [ ] 2.2 初期表示の確認
  - [ ] `http://localhost:5173/public/properties`を開く
  - [ ] 全ての物件が表示されることを確認
  - [ ] 「公開中のみ表示」ボタンがOFF状態（チェックマークなし）であることを確認
  - [ ] URLに`showPublicOnly`パラメータが含まれていないことを確認

- [ ] 2.3 フィルター有効化の確認
  - [ ] 「公開中のみ表示」ボタンをクリック
  - [ ] 公開中の物件のみが表示されることを確認
  - [ ] ボタンに「✓ 公開中のみ表示」と表示されることを確認
  - [ ] URLに`showPublicOnly=true`が追加されることを確認

- [ ] 2.4 フィルター無効化の確認
  - [ ] 「公開中のみ表示」ボタンをもう一度クリック
  - [ ] 全ての物件が表示されることを確認
  - [ ] ボタンがOFF状態に戻ることを確認
  - [ ] URLから`showPublicOnly`パラメータが削除されることを確認

- [ ] 2.5 URLパラメータからの復元確認
  - [ ] `http://localhost:5173/public/properties?showPublicOnly=true`を開く
  - [ ] 公開中の物件のみが表示されることを確認
  - [ ] ボタンがON状態であることを確認

- [ ] 2.6 詳細画面からの戻り確認
  - [ ] フィルターをOFF状態で物件詳細を開く
  - [ ] ブラウザの戻るボタンで一覧に戻る
  - [ ] フィルターがOFF状態のまま維持されることを確認
  - [ ] 全ての物件が表示されることを確認

- [ ] 2.7 他のフィルターとの組み合わせ確認
  - [ ] 物件タイプ「マンション」を選択
  - [ ] 「公開中のみ表示」をON
  - [ ] 公開中のマンションのみが表示されることを確認
  - [ ] 「公開中のみ表示」をOFF
  - [ ] 全てのマンションが表示されることを確認

- [ ] 2.8 「すべての条件をクリア」ボタンの確認
  - [ ] 複数のフィルターを設定（物件タイプ、価格、「公開中のみ表示」など）
  - [ ] 「すべての条件をクリア」ボタンをクリック
  - [ ] 全てのフィルターがクリアされることを確認
  - [ ] `showPublicOnly`が`false`になることを確認

### 3. コミットとプッシュ

- [ ] 3.1 変更をステージング
  ```bash
  git add frontend/src/pages/PublicPropertiesPage.tsx
  ```

- [ ] 3.2 コミット
  ```bash
  git commit -m "Fix: Change default value of showPublicOnly to false in PublicPropertiesPage"
  ```

- [ ] 3.3 プッシュ
  ```bash
  git push
  ```

### 4. 本番環境での動作確認

- [ ] 4.1 Vercelのデプロイ完了を待つ（2-3分）
  - [ ] https://vercel.com/kunihiro1200s-projects/property-site-frontend/deployments
  - [ ] デプロイステータスが「Ready」になることを確認

- [ ] 4.2 本番環境での初期表示確認
  - [ ] `https://property-site-frontend-kappa.vercel.app/public/properties`を開く
  - [ ] 全ての物件が表示されることを確認
  - [ ] 「公開中のみ表示」ボタンがOFF状態であることを確認

- [ ] 4.3 本番環境でのフィルター動作確認
  - [ ] 「公開中のみ表示」ボタンをクリック
  - [ ] 公開中の物件のみが表示されることを確認
  - [ ] もう一度クリックして、全ての物件が表示されることを確認

- [ ] 4.4 本番環境でのURLパラメータ確認
  - [ ] `https://property-site-frontend-kappa.vercel.app/public/properties?showPublicOnly=true`を開く
  - [ ] 公開中の物件のみが表示されることを確認

- [ ] 4.5 本番環境でのパフォーマンス確認
  - [ ] ブラウザの開発者ツールを開く（F12）
  - [ ] Networkタブで初期表示のAPIリクエストを確認
  - [ ] レスポンス時間が2秒以内であることを確認

### 5. モニタリング

- [ ] 5.1 Vercelログの確認（デプロイ後30分）
  - [ ] エラーが増加していないことを確認
  - [ ] https://vercel.com/kunihiro1200s-projects/property-site-frontend/logs

- [ ] 5.2 ユーザーフィードバックの確認（デプロイ後24時間）
  - [ ] ユーザーから問題の報告がないことを確認

### 6. ドキュメント更新（オプション）

- [ ] 6.1 ステアリングファイルの更新（存在する場合）
  - [ ] `.kiro/steering/public-property-site-usage.md`に変更内容を記載

---

## ロールバック手順（問題が発生した場合）

### 緊急ロールバック

```bash
# 1. 前のコミットに戻す
git revert HEAD

# 2. プッシュ
git push

# 3. Vercelで自動デプロイ（2-3分）
```

### 手動ロールバック

```bash
# 1. 特定のコミットに戻す
git checkout <previous-commit-hash> -- frontend/src/pages/PublicPropertiesPage.tsx

# 2. コミット
git add frontend/src/pages/PublicPropertiesPage.tsx
git commit -m "Revert: Rollback showPublicOnly default value to true"

# 3. プッシュ
git push
```

---

## 完了条件

- [ ] 全てのタスクが完了している
- [ ] ローカル環境で正常に動作している
- [ ] 本番環境で正常に動作している
- [ ] エラーが発生していない
- [ ] パフォーマンスに問題がない

---

## 見積もり時間

- **コード変更**: 5分
- **ローカル動作確認**: 15分
- **コミット・プッシュ**: 5分
- **本番環境確認**: 15分
- **モニタリング**: 10分

**合計**: 約50分

---

## 優先度

**高** - 本番環境で使用中のため、早急な対応が望ましい

---

## 担当者

- [ ] 実装担当: _________
- [ ] レビュー担当: _________
- [ ] デプロイ担当: _________

---

## 備考

- この変更は1行のみの変更のため、リスクは最小限です
- 問題が発生した場合、即座にロールバック可能です
- 既存の機能には影響しません
