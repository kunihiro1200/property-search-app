# Property URL Manual Edit Feature

## 概要

物件リストの地図URL（Google Map URL）と格納先URL（Storage Location）を手動で編集できる機能を追加します。

## 背景

現在、これらのURLフィールドは表示のみで、編集することができません。ユーザーが直接URLを入力・編集できるようにすることで、データの柔軟な管理を可能にします。

## 対象フィールド

1. **地図URL** (`google_map_url`)
   - 物件の位置を示すGoogle MapsのURL
   - 更新時に配信エリアが自動的に再計算される

2. **格納先URL** (`storage_location`)
   - 物件関連ドキュメントが保存されているGoogle DriveフォルダのURL
   - 更新時に画像表示が新しいフォルダから取得される

## 主な機能

- ✅ インライン編集UI（編集/保存/キャンセル）
- ✅ URL形式の検証
- ✅ 空欄を許可（オプショナルフィールド）
- ✅ 保存時の自動配信エリア再計算（地図URLの場合）
- ✅ エラーハンドリングと成功メッセージ
- ✅ ローディング状態の表示

## ドキュメント構成

### 📋 [requirements.md](./requirements.md)
詳細な要件定義書。ユーザーストーリーと受け入れ基準を含みます。

**主な要件**:
- Requirement 1: Google Map URL Manual Edit
- Requirement 2: Storage Location URL Manual Edit
- Requirement 3: URL Field Display and Validation
- Requirement 4: URL Format Validation
- Requirement 5: Integration with Existing Features
- Requirement 6: User Experience and Accessibility

### 🏗️ [design.md](./design.md)
技術設計書。アーキテクチャ、コンポーネント構造、データフローを含みます。

**主な内容**:
- Component Structure (Frontend & Backend)
- API Endpoints
- Data Flow
- URL Validation Rules
- UI/UX Design
- Error Handling
- Security Considerations

### ✅ [tasks.md](./tasks.md)
実装タスクリスト。フェーズごとに分かれた詳細なタスク。

**フェーズ**:
- Phase 1: Backend Foundation (3 hours)
- Phase 2: Frontend Components (5 hours)
- Phase 3: Testing (5 hours)
- Phase 4: Documentation (1.5 hours)

**合計見積もり時間**: 14.5時間

### 🚀 [QUICK_START.md](./QUICK_START.md)
クイックスタートガイド。すぐに実装を始めるための簡潔なガイド。

**内容**:
- 実装ステップの概要
- 例とコードスニペット
- よくある問題と解決策
- 推奨タイムライン

## 実装の流れ

```
1. Backend (2-3 hours)
   ├── URL Validator作成
   └── API Endpoints追加

2. Frontend (3-4 hours)
   ├── EditableUrlField Component作成
   └── Property Detail Page更新

3. Testing (2-3 hours)
   ├── Manual Testing
   └── Unit Tests (optional)

4. Documentation (1 hour)
   └── User Guide作成
```

## 技術スタック

### Backend
- Node.js + Express
- Supabase (PostgreSQL)
- TypeScript

### Frontend
- React + TypeScript
- Material-UI
- React Router

## URL形式

### Google Map URL
```
✅ https://maps.google.com/maps?q=35.6812,139.7671
✅ https://www.google.com/maps/place/Tokyo
✅ https://goo.gl/maps/abc123
```

### Storage Location URL
```
✅ https://drive.google.com/drive/folders/1a2b3c4d5e6f
✅ https://drive.google.com/drive/u/0/folders/1a2b3c4d5e6f
```

## データベース

既存のカラムを使用するため、マイグレーションは不要です：

```sql
-- property_listings table (existing)
google_map_url TEXT
storage_location TEXT
```

## API Endpoints

### Update Google Map URL
```
PATCH /api/property-listings/:propertyNumber/google-map-url
Body: { googleMapUrl: string }
Response: { success: boolean, distributionAreas?: string }
```

### Update Storage Location
```
PATCH /api/property-listings/:propertyNumber/storage-location
Body: { storageLocation: string }
Response: { success: boolean }
```

## セキュリティ

- ✅ 入力のサニタイゼーション
- ✅ XSS防止
- ✅ 認証・認可チェック
- ✅ 監査ログ記録

## パフォーマンス

- ✅ デバウンスされたバリデーション（300ms）
- ✅ 楽観的UI更新
- ✅ 非同期配信エリア計算
- ✅ 結果のキャッシング

## テスト戦略

### Unit Tests
- URL validation logic
- EditableUrlField component
- API endpoint handlers

### Integration Tests
- End-to-end URL update flow
- Distribution area recalculation
- Error handling scenarios

### Manual Testing
- 各種URLフォーマットのテスト
- エラーハンドリングのテスト
- モバイルデバイスでのテスト
- キーボードナビゲーションのテスト

## ロールバック計画

問題が発生した場合：
1. EditableUrlFieldコンポーネントを削除
2. PropertyListingDetailPageの変更を元に戻す
3. 新しいAPIエンドポイントを削除
4. URLはデータベースに残り、読み取り専用で表示可能

## 将来の拡張

1. URL履歴トラッキング
2. 一括URL編集
3. URLアクセシビリティ検証
4. 住所からのURL自動提案
5. 他のマッピングサービスとの統合

## 関連仕様

- [property-storage-url-display](../property-storage-url-display/) - 格納先URL表示機能
- [property-detail-map-url-display](../property-detail-map-url-display/) - 地図URL表示機能
- [property-area-based-email-distribution](../property-area-based-email-distribution/) - 配信エリア計算機能

## 開始方法

1. **QUICK_START.mdを読む** - 実装の概要を理解
2. **requirements.mdを確認** - 詳細な要件を確認
3. **design.mdを参照** - 技術設計を理解
4. **tasks.mdに従って実装** - ステップバイステップで実装

## サポート

質問や問題がある場合は、各ドキュメントを参照してください：
- 要件に関する質問 → `requirements.md`
- 技術的な質問 → `design.md`
- 実装手順 → `tasks.md`
- クイックリファレンス → `QUICK_START.md`

---

**Status**: 📝 Specification Complete - Ready for Implementation

**Estimated Effort**: 14.5 hours

**Priority**: Medium

**Dependencies**: None (uses existing database columns)
