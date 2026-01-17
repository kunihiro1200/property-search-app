# Design Document

## Overview

通話モードページで全ての売主案件のデータが表示されない問題を解決します。調査の結果、以下の問題が特定されました:

1. **カラムマッピングの不一致**: スプレッドシートの「サイト」カラムが`inquiry_site`にマッピングされているが、データベースには`site`フィールドとして保存する必要がある
2. **物件情報の保存先**: 物件情報（住所、種別、面積など）が`sellers`テーブルにマッピングされているが、`properties`テーブルに保存する必要がある
3. **データ同期の不完全性**: スプレッドシートからデータベースへの同期時に、一部のフィールドが正しく保存されていない可能性がある

この設計では、以下の対応を行います:
1. カラムマッピング設定を修正
2. MigrationServiceを拡張して物件情報を`properties`テーブルに保存
3. データ同期の検証スクリプトを作成
4. 既存データの修正スクリプトを作成

## Architecture

### システム構成

```
[スプレッドシート]
    ↓ (同期)
[MigrationService]
    ↓ (マッピング)
[ColumnMapper]
    ↓ (保存)
[Supabase Database]
    ├─ sellers テーブル
    └─ properties テーブル
    ↓ (取得)
[SellerService]
    ↓ (API)
[CallModePage]
```

## Components and Interfaces

### 1. ColumnMapper (修正)

**責務**: スプレッドシートのカラムとデータベースフィールドのマッピング

**変更点**:
- `inquiry_site` → `site` にマッピングを変更
- 物件情報フィールドを分離して`PropertyData`インターフェースを作成

### 2. MigrationService (拡張)

**責務**: スプレッドシートからデータベースへのデータ移行

**変更点**:
- 物件情報を`properties`テーブルに保存する処理を追加
- トランザクション処理を実装（売主と物件を同時に保存）

### 3. データ検証スクリプト (新規)

**責務**: データベースのデータを検証し、不足しているデータを特定

**ファイル**: `backend/src/scripts/verify-call-mode-data.ts`

### 4. データ修正スクリプト (新規)

**責務**: スプレッドシートから既存データを再同期

**ファイル**: `backend/src/scripts/fix-call-mode-data.ts`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: カラムマッピングの一貫性

*For any* スプレッドシートのカラム、そのカラムが`column-mapping.json`に定義されている場合、`ColumnMapper.mapToDatabase()`はそのカラムの値を正しいデータベースフィールドにマッピングする
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 2: 物件情報の保存

*For any* スプレッドシート行に物件情報が含まれる場合、`MigrationService`は物件情報を`properties`テーブルに保存し、売主情報を`sellers`テーブルに保存する
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 3: サイト情報の同期

*For any* スプレッドシート行に「サイト」カラムが含まれる場合、その値は`sellers.site`フィールドに保存される
**Validates: Requirements 2.1, 2.2**

## Error Handling

### エラーケース

1. **カラムマッピングエラー** - エラーログを記録し、該当行をスキップ
2. **データ型変換エラー** - nullに変換してログを記録
3. **トランザクションエラー** - ロールバックしてエラーログを記録
4. **重複エラー** - 更新処理に切り替え
5. **物件情報不足エラー** - 物件情報を作成せず、売主情報のみ保存

## Testing Strategy

### Unit Tests

1. **ColumnMapper.mapToDatabase()のテスト**
2. **ColumnMapper.extractPropertyData()のテスト**
3. **MigrationService.processBatch()のテスト**

### Integration Tests

1. **エンドツーエンドデータ同期**
2. **データ検証スクリプト**

### Manual Testing

1. **通話モードページの表示確認**
2. **データ修正後の表示確認**

## Deployment Plan

1. **Phase 1**: カラムマッピング修正
2. **Phase 2**: MigrationService修正
3. **Phase 3**: データ検証
4. **Phase 4**: データ修正
5. **Phase 5**: 本番デプロイ

