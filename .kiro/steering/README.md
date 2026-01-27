# ステアリングドキュメント構成

## 📁 ディレクトリ構造

### `.kiro/steering/`（ルート）
**常に読み込まれる普遍的なルール**

- `japanese-language.md` - 日本語応答設定
- `project-isolation-rule.md` - プロジェクト隔離ルール（本番環境保護）
- `git-history-first-approach.md` - Git履歴優先アプローチ
- `file-encoding-protection.md` - ファイルエンコーディング保護

---

### `.kiro/restore-guides/`（ステアリングディレクトリの外）
**特定の機能が壊れた時だけ手動で参照する復元ガイド**

復元ガイドは`.kiro/restore-guides/`に保存されています（ステアリングルールとして自動読み込みされません）。

#### 公開物件サイト関連
- `google-maps-marker-display-fix.md` - 地図のピン表示修正
- `estimate-pdf-generation-fix.md` - 概算書PDF生成修正
- `show-public-only-default-fix.md` - 「公開中のみ表示」デフォルト設定
- `public-property-performance-critical-rules.md` - パフォーマンス重要ルール
- `list-view-images-must-always-show.md` - 一覧画面の画像表示ルール

#### データ同期関連
- `storage-location-manual-flag-implementation.md` - 格納先URL自動同期除外
- `gyomu-list-cache-optimization.md` - 業務リストキャッシュ最適化

#### データ分類・検証
- `atbb-status-classification.md` - atbb_status分類定義
- `duplicate-detection.md` - 重複宣言の検出と防止
- `frontend-data-type-validation.md` - フロントエンドデータ型検証

---

### `.kiro/sessions/`（ステアリングディレクトリの外）
**過去のセッション記録（参考用）**

セッション記録は`.kiro/sessions/`に保存されています（ステアリングルールとして自動読み込みされません）。

- `session-2026-01-25-manual-refresh-buttons.md`
- `session-2026-01-25-panorama-estimate-pdf-fix.md`
- `session-2026-01-25-public-site-buttons-url-fix.md`
- `session-2026-01-26-storage-location-auto-sync-exclusion.md`
- `session-2026-01-27-cc6-image-and-scroll-position-fix.md`
- `session-2026-01-27-encryption-issue-fix.md`

---

## 🔍 ドキュメントの使い方

### セッション開始時
ルートディレクトリ（`.kiro/steering/`）の4つのドキュメント + README.mdのみが自動的に読み込まれます。

### 問題が発生した時
該当する機能の復元ガイド（`.kiro/restore-guides/`）を手動で参照してください。

例：
- 地図のピンが表示されない → `.kiro/restore-guides/google-maps-marker-display-fix.md`
- 概算書PDFが生成されない → `.kiro/restore-guides/estimate-pdf-generation-fix.md`
- 初回ロードが遅い → `.kiro/restore-guides/public-property-performance-critical-rules.md`

---

## 📝 復元依頼の仕方

各復元ガイドには「次回の復元依頼の仕方」セクションがあります。

**例**（地図のピン表示）:
```
地図のピンが表示されない。コミット b67e7fd に戻して。
```

これだけで、該当するドキュメントを参照して復元できます。

---

**最終更新日**: 2026年1月27日
