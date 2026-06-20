# 公開物件サイト - 一覧画面に戻るボタンのテスト手順

## 問題
詳細画面から「物件一覧」ボタンを押しても一覧画面に戻らない

## テスト手順

### 1. ブラウザのコンソールを開く
- Chrome: F12 → Console タブ
- Firefox: F12 → コンソール タブ

### 2. 公開物件サイトにアクセス
```
http://localhost:5173/public/properties
```

### 3. 任意の物件をクリックして詳細画面に移動
例: BB16物件

### 4. 「物件一覧」ボタンをクリック

### 5. コンソールログを確認
以下のログが表示されるはずです：
```
[PublicPropertyHeader] handleBackClick - navigating back with history
```

## 期待される動作
- 一覧画面に戻る
- スクロール位置が保持される
- フィルター状態が保持される

## 実際の動作
- （ユーザーから報告された動作を記載）

## デバッグ情報

### 現在の実装（PublicPropertyHeader.tsx）
```typescript
const handleBackClick = () => {
  console.log('[PublicPropertyHeader] handleBackClick - navigating back with history');
  navigate(-1);
};
```

### 考えられる原因

1. **JavaScriptエラー**
   - ボタンクリック時にエラーが発生している
   - コンソールにエラーメッセージが表示される

2. **イベントハンドラーが登録されていない**
   - ボタンの`onClick`が正しく設定されていない
   - コンポーネントが正しくレンダリングされていない

3. **ルーティングの問題**
   - `navigate(-1)`が機能していない
   - React Routerの設定に問題がある

4. **ブラウザの履歴が空**
   - 直接URLを入力して詳細画面にアクセスした場合
   - 履歴がないため戻れない

## 次のステップ

### ステップ1: コンソールログを確認
- エラーメッセージが表示されているか？
- `[PublicPropertyHeader] handleBackClick`のログが表示されているか？

### ステップ2: ボタンが正しくレンダリングされているか確認
- ブラウザの開発者ツールでボタン要素を検査
- `onClick`イベントが設定されているか確認

### ステップ3: React Routerの履歴を確認
```typescript
// PublicPropertyHeader.tsxに追加
const location = useLocation();
console.log('Current location:', location);
console.log('Navigation state:', location.state);
```

### ステップ4: 一覧画面から詳細画面に移動する方法を確認
- 一覧画面でどのようにリンクをクリックしているか？
- `Link`コンポーネントを使用しているか？
- `navigate()`を使用しているか？

## 修正案

### 修正案1: デバッグログを追加
```typescript
const handleBackClick = () => {
  console.log('[PublicPropertyHeader] handleBackClick - START');
  console.log('[PublicPropertyHeader] Current location:', location);
  console.log('[PublicPropertyHeader] Navigation state:', location.state);
  
  try {
    navigate(-1);
    console.log('[PublicPropertyHeader] navigate(-1) called successfully');
  } catch (error) {
    console.error('[PublicPropertyHeader] Error during navigation:', error);
  }
};
```

### 修正案2: フォールバック処理を追加
```typescript
const handleBackClick = () => {
  console.log('[PublicPropertyHeader] handleBackClick - navigating back with history');
  
  // 履歴がない場合は一覧画面に直接移動
  if (window.history.length <= 1) {
    console.log('[PublicPropertyHeader] No history, navigating to /public/properties');
    navigate('/public/properties');
  } else {
    navigate(-1);
  }
};
```

### 修正案3: 明示的に一覧画面に移動
```typescript
const handleBackClick = () => {
  console.log('[PublicPropertyHeader] handleBackClick - navigating to /public/properties');
  navigate('/public/properties', { 
    state: navigationState // スクロール位置とフィルター状態を保持
  });
};
```

## 最終確認

- [ ] コンソールにエラーメッセージが表示されているか？
- [ ] `[PublicPropertyHeader] handleBackClick`のログが表示されているか？
- [ ] ボタンをクリックしても何も起こらないか？
- [ ] ブラウザの戻るボタンは機能するか？
- [ ] 一覧画面から詳細画面に移動する際、どのような方法を使用しているか？

