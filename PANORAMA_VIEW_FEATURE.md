# 360°パノラマビュー機能

## 概要

公開物件サイトの詳細ページに、360°パノラマビューを自動表示する機能です。

## 機能説明

### 自動取得フロー

1. **業務リスト（業務依頼シート）から取得**
   - 物件番号で業務リストを検索
   - 「スプシURL」（D列）から個別物件スプレッドシートURLを取得
   - 個別スプレッドシートの`athome`シートのN1セルからパノラマURLを取得

2. **フォールバック（オプション）**
   - スプシURLがない場合、業務依頼Driveフォルダから物件番号を含むスプレッドシートを検索
   - 環境変数`GYOMU_FOLDER_ID`が設定されている場合のみ有効

3. **フロントエンド表示**
   - パノラマURLが存在する物件のみ表示
   - 物件画像ギャラリーの直前に配置
   - 印刷時は非表示

## 技術仕様

### バックエンド

#### 新規サービス
- **PanoramaUrlService** (`backend/src/services/PanoramaUrlService.ts`)
  - パノラマURL取得ロジック
  - キャッシュ機能（10分間）
  - 業務リストとDrive検索の両方に対応

#### APIエンドポイント
```
GET /api/public/properties/:propertyNumber/panorama-url
```

**レスポンス例:**
```json
{
  "success": true,
  "panoramaUrl": "https://vrpanorama.athome.jp/panoramas/_NRVze2Nm-/embed?from=at&user_id=80401786"
}
```

### フロントエンド

#### 変更ファイル
- **PublicPropertyDetailPage.tsx** (`frontend/src/pages/PublicPropertyDetailPage.tsx`)
  - パノラマURL取得のuseEffect追加
  - パノラマビューセクションの条件付き表示

#### 表示条件
- `panoramaUrl`が存在する場合のみ表示
- 16:9のアスペクト比でレスポンシブ対応
- iframeでフルスクリーン表示対応

## 環境変数

### 必須
なし（業務リストのスプシURLから自動取得）

### オプション
```bash
# 業務依頼フォルダID（パノラマURL検索用）
# スプシURLが業務リストにない場合のフォールバック
GYOMU_FOLDER_ID=your-gyomu-folder-id
```

## データソース

### 業務リスト（業務依頼シート）
- **スプレッドシートID**: `GYOMU_LIST_SPREADSHEET_ID`
- **シート名**: `業務依頼`
- **カラム**: 
  - `物件番号`: 物件の識別子
  - `スプシURL` (D列): 個別物件スプレッドシートURL

### 個別物件スプレッドシート
- **シート名**: `athome`
- **セル**: `N1` - パノラマURL

## 使用例

### AA10528の場合

1. 業務リストで`AA10528`を検索
2. スプシURL: `https://docs.google.com/spreadsheets/d/xxx/edit`
3. athomeシートのN1セル: `https://vrpanorama.athome.jp/panoramas/_NRVze2Nm-/embed?from=at&user_id=80401786`
4. 公開物件サイトで自動表示

### 表示URL
```
http://localhost:5173/public/properties/{uuid}
```

## キャッシュ

- **キャッシュ期間**: 10分
- **キャッシュキー**: `panorama:{propertyNumber}`
- **キャッシュ対象**: パノラマURL（存在しない場合もキャッシュ）

## エラーハンドリング

- パノラマURLが見つからない場合: セクション非表示（エラー表示なし）
- スプレッドシート読み取りエラー: ログ出力のみ（ユーザーには影響なし）
- API呼び出しエラー: グレースフルデグラデーション（セクション非表示）

## 印刷対応

- パノラマビューセクションに`no-print`クラスを適用
- 印刷時は完全に非表示

## パフォーマンス

- **初回読み込み**: 業務リスト全体をキャッシュ（5分間）
- **パノラマURL取得**: 個別スプレッドシート読み取り（10分間キャッシュ）
- **フロントエンド**: 非同期読み込み（ページ表示をブロックしない）

## テスト方法

### バックエンドテスト
```bash
cd backend
npx ts-node -e "
import { PanoramaUrlService } from './src/services/PanoramaUrlService';
const service = new PanoramaUrlService();
service.getPanoramaUrl('AA10528').then(url => console.log('Panorama URL:', url));
"
```

### フロントエンドテスト
1. ブラウザで物件詳細ページを開く
2. DevToolsのNetworkタブで`panorama-url`リクエストを確認
3. パノラマビューセクションが表示されることを確認

## トラブルシューティング

### パノラマビューが表示されない

**原因1**: 業務リストにスプシURLがない
- 解決策: 業務リストの「スプシURL」列を確認

**原因2**: athomeシートのN1セルが空
- 解決策: 個別スプレッドシートのathomeシートN1セルにパノラマURLを入力

**原因3**: サービスアカウントの権限不足
- 解決策: 個別スプレッドシートにサービスアカウントの閲覧権限を付与

### APIエラー

**エラー**: `Error reading N1 cell from spreadsheet`
- 原因: スプレッドシートが存在しないか、権限がない
- 解決策: スプレッドシートURLとサービスアカウント権限を確認

## 今後の拡張

### データベース保存（オプション）
- `property_listings`テーブルに`panorama_url`カラムを追加
- 定期的な同期処理でパノラマURLをDBに保存
- API呼び出しを高速化

### 複数パノラマ対応
- N1セルだけでなく、N2, N3...も読み取り
- カルーセル形式で複数のパノラマを表示

### パノラマプレビュー
- 管理画面でパノラマURLのプレビュー機能
- パノラマURLの一括更新機能

## 関連ドキュメント

- [スプレッドシート設定ガイド](spreadsheet-configuration.md)
- [スプレッドシートカラムマッピング](spreadsheet-column-mapping.md)
- [業務リストサービス](backend/src/services/GyomuListService.ts)

## 変更履歴

- **2025-01-18**: 初回実装
  - PanoramaUrlService作成
  - APIエンドポイント追加
  - フロントエンド表示機能追加
