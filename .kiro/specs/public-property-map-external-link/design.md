# 設計ドキュメント：公開物件サイト地図マーカー外部リンク機能

## 概要

公開物件サイトの地図表示コンポーネント（PropertyMapView）において、マーカーをクリックして表示される情報ウィンドウ内の「詳細を見る」ボタンの動作を変更します。現在は`navigate()`を使用して同一タブ内で遷移していますが、これを`window.open()`を使用して新しいタブで開くように変更します。

## アーキテクチャ

### 現在の実装

```
ユーザー → マーカークリック → InfoWindow表示 → 「詳細を見る」ボタンクリック
                                                    ↓
                                            navigate() 呼び出し
                                                    ↓
                                            同一タブ内で遷移
                                                    ↓
                                            地図画面が失われる
```

### 新しい実装

```
ユーザー → マーカークリック → InfoWindow表示 → 「詳細を見る」ボタンクリック
                                                    ↓
                                            window.open() 呼び出し
                                                    ↓
                                            新しいタブで開く
                                                    ↓
                                            地図画面が保持される
```

## コンポーネントとインターフェース

### 1. PropertyMapView コンポーネント

**変更箇所**: `handlePropertyClick` 関数

**現在の実装**:
```typescript
const handlePropertyClick = (propertyId: string) => {
  navigate(`/public/properties/${propertyId}`);
};
```

**新しい実装**:
```typescript
const handlePropertyClick = (propertyId: string) => {
  // 新しいタブで物件詳細ページを開く
  window.open(`/public/properties/${propertyId}`, '_blank', 'noopener,noreferrer');
};
```

### 2. InfoWindow内のボタン

**変更なし**: ボタンのクリックイベントハンドラーは引き続き`handlePropertyClick`を呼び出します。

```typescript
<Button
  variant="contained"
  size="small"
  fullWidth
  onClick={() => handlePropertyClick(selectedProperty.id)}
  sx={{
    backgroundColor: '#FFC107',
    color: '#000',
    '&:hover': {
      backgroundColor: '#FFB300',
    },
  }}
>
  詳細を見る
</Button>
```

## データモデル

データモデルの変更はありません。既存の`PublicProperty`型と`PropertyWithCoordinates`型をそのまま使用します。

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性または動作です。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ1: 新しいタブでのリンク動作

*すべての*物件IDに対して、`handlePropertyClick`を呼び出すと、新しいタブで物件詳細ページが開かれること

**検証**: 要件 1.1

### プロパティ2: 元のタブの保持

*すべての*物件詳細ページ遷移において、元の地図画面のタブが保持され、ユーザーが戻れること

**検証**: 要件 1.2, 1.3

### プロパティ3: 既存機能の非破壊性

*すべての*地図表示、マーカー表示、InfoWindow表示の既存機能が、リンク動作の変更後も正常に動作すること

**検証**: 要件 3.1

## エラーハンドリング

### ポップアップブロック

一部のブラウザでは、ユーザーの操作によらない`window.open()`呼び出しがブロックされる場合があります。しかし、今回の実装では、ユーザーがボタンをクリックした際に`window.open()`を呼び出すため、ポップアップブロックの影響を受けません。

### セキュリティ考慮事項

`window.open()`の第3引数に`'noopener,noreferrer'`を指定することで、以下のセキュリティリスクを軽減します：

- **noopener**: 新しいタブから元のタブへの`window.opener`アクセスを防ぎ、タブナビゲーション攻撃を防止
- **noreferrer**: リファラー情報を送信せず、プライバシーを保護

## テスト戦略

### ユニットテスト

1. **handlePropertyClick関数のテスト**
   - `window.open`が正しい引数で呼び出されることを確認
   - モックを使用して`window.open`の呼び出しを検証

### 統合テスト

1. **マーカークリックからボタンクリックまでのフロー**
   - マーカーをクリックしてInfoWindowが表示されることを確認
   - 「詳細を見る」ボタンをクリックして`handlePropertyClick`が呼び出されることを確認

### E2Eテスト

1. **新しいタブでの遷移**
   - 実際のブラウザで地図を表示
   - マーカーをクリックして「詳細を見る」ボタンをクリック
   - 新しいタブで物件詳細ページが開かれることを確認
   - 元のタブで地図画面が保持されていることを確認

2. **複数物件の確認**
   - 複数のマーカーをクリックして、それぞれ新しいタブで開かれることを確認
   - 各タブで正しい物件詳細が表示されることを確認

### プロパティベーステスト

プロパティベーステストは、この機能の性質上、ランダム入力による検証が困難なため、実施しません。代わりに、上記のユニットテスト、統合テスト、E2Eテストで十分なカバレッジを確保します。

## 実装の詳細

### 変更が必要なファイル

- `frontend/src/components/PropertyMapView.tsx`

### 変更内容

1. `handlePropertyClick`関数を以下のように変更：

```typescript
const handlePropertyClick = (propertyId: string) => {
  // 新しいタブで物件詳細ページを開く
  window.open(`/public/properties/${propertyId}`, '_blank', 'noopener,noreferrer');
};
```

2. `navigate`のインポートを削除（使用しなくなるため）：

```typescript
// 削除
import { useNavigate } from 'react-router-dom';

// 削除
const navigate = useNavigate();
```

### アクセシビリティの考慮

ボタンに`aria-label`を追加して、スクリーンリーダーユーザーに新しいタブで開くことを明示します：

```typescript
<Button
  variant="contained"
  size="small"
  fullWidth
  onClick={() => handlePropertyClick(selectedProperty.id)}
  aria-label="物件詳細を新しいタブで開く"
  sx={{
    backgroundColor: '#FFC107',
    color: '#000',
    '&:hover': {
      backgroundColor: '#FFB300',
    },
  }}
>
  詳細を見る
</Button>
```

## パフォーマンスへの影響

この変更は、既存の地図表示パフォーマンスに影響を与えません。`window.open()`は軽量な操作であり、地図のレンダリングやマーカーの表示には影響しません。

## ブラウザ互換性

`window.open()`は、すべての主要なモダンブラウザ（Chrome、Firefox、Safari、Edge）でサポートされています。`'noopener,noreferrer'`オプションも、これらのブラウザで広くサポートされています。

## まとめ

この設計では、最小限の変更で要件を満たすことができます。`navigate()`を`window.open()`に置き換えるだけで、新しいタブでのリンク動作を実現し、ユーザーが地図画面に戻れるようになります。セキュリティとアクセシビリティにも配慮した実装となっています。
