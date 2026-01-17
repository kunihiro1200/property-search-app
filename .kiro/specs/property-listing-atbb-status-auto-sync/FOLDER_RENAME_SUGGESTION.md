# Specフォルダ名変更の提案

## 現在のフォルダ名
`.kiro/specs/property-listing-atbb-status-auto-sync/`

## 問題点

現在のフォルダ名は「ATBB状態の自動同期」を示していますが、実際のspecの内容は以下を含む包括的なものです:

1. **全フィールドの自動同期**
   - ATBB状態
   - 価格（売却価格、査定価格など）
   - 物件タイプ
   - 住所情報
   - 面積情報
   - その他すべてのカラム

2. **公開物件サイトのバッジ更新**
   - ATBB状態バッジ
   - 専任バッジ
   - その他の状態バッジ

3. **公開URL表示の復元**
   - 物件リスト画面での公開URL表示
   - URLクリックで公開サイトへ遷移

## 提案する新しいフォルダ名

### オプション1: `property-listing-comprehensive-auto-sync`
**理由**: 「comprehensive（包括的）」が全フィールドの同期を明確に示す

**メリット**:
- 機能の範囲が明確
- 既存の`property-listing-update-sync`との関連性が明確
- 英語として自然

**デメリット**:
- やや長い

---

### オプション2: `property-listing-full-field-auto-sync`
**理由**: 「full-field（全フィールド）」が具体的

**メリット**:
- 何を同期するかが明確
- 技術的に正確

**デメリット**:
- バッジ更新やURL表示が含まれることが不明確

---

### オプション3: `property-listing-auto-sync-enhancement`
**理由**: 「enhancement（拡張）」が既存機能の改善を示す

**メリット**:
- 既存の`property-listing-update-sync`の拡張であることが明確
- 短くて覚えやすい

**デメリット**:
- 具体的な内容が不明確

---

## 推奨

**オプション1: `property-listing-comprehensive-auto-sync`**

理由:
1. 機能の範囲を最も正確に表現
2. 既存のspec名との一貫性
3. 将来的な拡張にも対応可能

## 変更手順

### 1. フォルダ名を変更

```bash
cd .kiro/specs
mv property-listing-atbb-status-auto-sync property-listing-comprehensive-auto-sync
```

### 2. ドキュメント内の参照を更新

以下のファイルでフォルダ名の参照を更新:

- `requirements.md`
- `design.md`
- `tasks.md`
- `SPEC_UPDATE_SUMMARY.md`
- `QUICK_START.md`

検索・置換:
- `property-listing-atbb-status-auto-sync` → `property-listing-comprehensive-auto-sync`

### 3. 関連ドキュメントの更新

以下のファイルでこのspecへの参照を更新:

- `README.md`（プロジェクトルート）
- 他のspecファイル（関連がある場合）
- 実装完了報告書（作成時）

## 変更しない場合の対応

フォルダ名を変更しない場合は、以下のドキュメントで明確化:

1. **README.md**（specフォルダ内）を作成し、以下を記載:
   ```markdown
   # 物件リスト包括的自動同期
   
   注意: このspecのフォルダ名は`property-listing-atbb-status-auto-sync`ですが、
   実際の内容は全フィールドの包括的な自動同期、公開物件サイトのバッジ更新、
   公開URL表示の復元を含みます。
   ```

2. **各ドキュメントの冒頭**に同様の注意書きを追加

## 決定事項

- [ ] オプション1: `property-listing-comprehensive-auto-sync`に変更
- [ ] オプション2: `property-listing-full-field-auto-sync`に変更
- [ ] オプション3: `property-listing-auto-sync-enhancement`に変更
- [ ] 変更しない（README.mdで明確化）

## 関連ドキュメント

- `SPEC_UPDATE_SUMMARY.md` - Spec更新の経緯
- `requirements.md` - 更新済み要件定義
- `design.md` - 更新済み設計書
- `tasks.md` - 更新済みタスク一覧
