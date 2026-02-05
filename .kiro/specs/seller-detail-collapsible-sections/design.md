# 通話モードページの折りたたみ可能セクション追加 - 設計ドキュメント

## 概要

通話モードページ（CallModePage.tsx）の「近隣買主リスト」と「実績」のセクションを、`CollapsibleSection`コンポーネントを使用して折りたたみ可能にします。

## アーキテクチャ

### コンポーネント構成

```
CallModePage.tsx
├── (既存のセクション)
├── 近隣買主リスト (Box → CollapsibleSection) ← 修正
│   └── NearbyBuyersList
├── (既存のセクション)
└── 実績 (Box → CollapsibleSection) ← 修正
    └── PerformanceMetricsSection
```

### 使用する既存コンポーネント

1. **CollapsibleSection** (`frontend/src/components/CollapsibleSection.tsx`)
   - 折りたたみ可能なセクションを提供
   - Props:
     - `title`: セクションのタイトル
     - `defaultExpanded`: 初期状態で展開するかどうか（デフォルト: false）
     - `children`: セクションの内容

2. **NearbyBuyersList** (`frontend/src/components/NearbyBuyersList.tsx`)
   - 近隣買主リストを表示
   - Props:
     - `sellerId`: 売主ID（必須）

3. **PerformanceMetricsSection** (`frontend/src/components/PerformanceMetricsSection.tsx`)
   - 実績データを表示
   - Props: なし（内部でAPIを呼び出してデータを取得）

## 実装詳細

### 1. インポートの確認

`CallModePage.tsx`に`CollapsibleSection`のインポートがあるか確認：

```typescript
import CollapsibleSection from '../components/CollapsibleSection';
```

もし存在しない場合は追加します。

### 2. 近隣買主リストセクションの修正

**現在のコード（行2901-2909付近）**:
```typescript
{/* 近隣買主リスト */}
{seller?.id && (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      🏘️ 近隣買主リスト
    </Typography>
    <NearbyBuyersList sellerId={seller.id} />
  </Box>
)}
```

**修正後のコード**:
```typescript
{/* 近隣買主リスト */}
{seller?.id && (
  <CollapsibleSection title="近隣買主リスト" defaultExpanded={false}>
    <NearbyBuyersList sellerId={seller.id} />
  </CollapsibleSection>
)}
```

### 3. 実績セクションの修正

**現在のコード（行4988-4991付近）**:
```typescript
{/* 実績セクション */}
<Box sx={{ mt: 3 }}>
  <PerformanceMetricsSection />
</Box>
```

**修正後のコード**:
```typescript
{/* 実績セクション */}
<CollapsibleSection title="実績" defaultExpanded={false}>
  <PerformanceMetricsSection />
</CollapsibleSection>
```

## データフロー

### 近隣買主リスト

1. ユーザーが「近隣買主リスト」ボタンをクリック
2. `CollapsibleSection`が展開される
3. `NearbyBuyersList`コンポーネントがマウントされる
4. `NearbyBuyersList`が`/api/sellers/${sellerId}/nearby-buyers`を呼び出す
5. 近隣買主データが表示される

### 実績

1. ユーザーが「実績」ボタンをクリック
2. `CollapsibleSection`が展開される
3. `PerformanceMetricsSection`コンポーネントがマウントされる
4. `PerformanceMetricsSection`が`/api/performance-metrics`を呼び出す
5. 実績データが表示される

## エラーハンドリング

### 近隣買主リスト

- `seller.id`が存在しない場合: 「売主情報が読み込まれていません」と表示
- APIエラー: `NearbyBuyersList`コンポーネント内でエラーメッセージを表示

### 実績

- APIエラー: `PerformanceMetricsSection`コンポーネント内でエラーメッセージを表示

## パフォーマンス最適化

### 遅延読み込み

`CollapsibleSection`コンポーネントは、セクションが展開された時のみ子コンポーネントをレンダリングします。これにより、初期ページ読み込み時のパフォーマンスへの影響を最小限に抑えます。

**CollapsibleSectionの実装確認が必要**:
- 現在の`CollapsibleSection`が遅延読み込みをサポートしているか確認
- サポートしていない場合は、条件付きレンダリングを追加

```typescript
{/* 遅延読み込みの例 */}
<CollapsibleSection title="近隣買主リスト" defaultExpanded={false}>
  {isExpanded && seller?.id && <NearbyBuyersList sellerId={seller.id} />}
</CollapsibleSection>
```

## テスト計画

### 単体テスト

1. **近隣買主リストセクション**
   - セクションが初期状態で折りたたまれていることを確認
   - ボタンをクリックするとセクションが展開されることを確認
   - `seller.id`が存在する場合、`NearbyBuyersList`がレンダリングされることを確認

2. **実績セクション**
   - セクションが初期状態で折りたたまれていることを確認
   - ボタンをクリックするとセクションが展開されることを確認
   - `PerformanceMetricsSection`がレンダリングされることを確認

### 統合テスト

1. 通話モードページを開く
2. 「近隣買主リスト」ボタンをクリック
3. 近隣買主リストが表示されることを確認
4. 再度ボタンをクリックして折りたたまれることを確認
5. 「実績」ボタンをクリック
6. 実績データが表示されることを確認
7. 再度ボタンをクリックして折りたたまれることを確認

### E2Eテスト

1. ブラウザで通話モードページを開く
2. 「近隣買主リスト」と「実績」のボタンが表示されることを確認
3. 各ボタンをクリックして展開/折りたたみが正しく動作することを確認
4. 近隣買主リストと実績のデータが正しく表示されることを確認

## セキュリティ考慮事項

- 既存のAPIエンドポイントを使用するため、新しいセキュリティリスクはなし
- `seller.id`の検証は既存のコンポーネントで実施済み

## 互換性

- 既存の通話モードページの機能に影響なし
- 近隣買主リストと実績の表示内容は現在と同じ

## デプロイ計画

1. フロントエンドのビルド
2. Vercelへのデプロイ
3. 本番環境での動作確認

## ロールバック計画

問題が発生した場合は、以下の手順でロールバック：

1. Gitで前のコミットに戻す
2. フロントエンドを再ビルド
3. Vercelへの再デプロイ

## 監視とメトリクス

- ページ読み込み時間の監視（既存のメトリクスを使用）
- APIエラー率の監視（既存のメトリクスを使用）

## 今後の改善案

1. **カスタマイズ可能な初期状態**: ユーザーが各セクションの初期状態（展開/折りたたみ）を設定できるようにする
2. **パフォーマンス最適化**: 近隣買主リストと実績データのキャッシュ
3. **アクセシビリティ向上**: キーボードショートカットの追加

## 参考資料

- [CollapsibleSectionコンポーネント](frontend/src/components/CollapsibleSection.tsx)
- [NearbyBuyersListコンポーネント](frontend/src/components/NearbyBuyersList.tsx)
- [PerformanceMetricsSectionコンポーネント](frontend/src/components/PerformanceMetricsSection.tsx)
- [通話モードページ](frontend/src/pages/CallModePage.tsx) - 行2901-2909（近隣買主リスト）、行4988-4991（実績）
