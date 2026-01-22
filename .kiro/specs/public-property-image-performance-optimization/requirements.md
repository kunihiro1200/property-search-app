# Requirements Document

## Introduction

公開物件サイトの詳細画面において、初めて開く物件の画像表示に約5秒かかる問題を解決する。1度開いた物件はキャッシュにより即座に表示されるため、キャッシュ機構は正常に動作している。問題は初回アクセス時のサブフォルダ検索処理（athome公開/atbb公開フォルダの検索）にある。この処理は2階層目まで再帰的に検索を行うため、フォルダ構造が複雑な場合に時間がかかる。

**重要**: この改善では、既存のサブフォルダ検索機能（athome公開/atbb公開フォルダの優先表示）は完全に維持する。パフォーマンス改善のみを目的とし、機能の変更や削除は行わない。

**追加要件**: 画像ライトボックス（拡大表示）の「次へ/前へ」ボタンを、画像の下部だけでなく上部にも追加して、ユーザビリティを向上させる。

## Glossary

- **PropertyImageService**: 物件画像を取得するバックエンドサービス
- **Public_Subfolder**: 「athome公開」または「atbb公開」という名前のサブフォルダ
- **Parent_Folder**: 物件の格納先URLで指定される親フォルダ
- **Folder_ID_Cache**: サブフォルダ検索結果をキャッシュする仕組み（現在5分間）
- **Google_Drive_API**: Googleドライブにアクセスするための外部API
- **Recursive_Search**: 2階層目まで再帰的にサブフォルダを検索する処理

## Requirements

### Requirement 0: 既存機能の完全維持

**User Story:** As a システム管理者, I want 既存のサブフォルダ検索機能を維持したい, so that athome公開/atbb公開フォルダからの画像表示が引き続き機能する。

#### Acceptance Criteria

1. THE PropertyImageService SHALL 引き続き「athome公開」フォルダを最優先で検索する
2. THE PropertyImageService SHALL 「athome公開」が見つからない場合、「atbb公開」フォルダを検索する
3. THE PropertyImageService SHALL 両方のフォルダが見つからない場合、親フォルダを使用する
4. THE PropertyImageService SHALL 2階層目までの再帰的検索を維持する
5. WHEN フォルダ構造が変更された THEN THE PropertyImageService SHALL 正しいフォルダを検出する
6. THE PropertyImageService SHALL 既存のフォールバック戦略を維持する

### Requirement 1: サブフォルダ検索のキャッシュ時間延長

**User Story:** As a システム, I want サブフォルダ検索結果を長時間キャッシュしたい, so that 同じフォルダへのアクセス時に再検索を避けられる。

#### Acceptance Criteria

1. WHEN サブフォルダ検索が完了した THEN THE PropertyImageService SHALL 検索結果を最低1時間キャッシュする
2. WHEN キャッシュが有効な間 THEN THE PropertyImageService SHALL Google Drive APIへの再問い合わせを行わない
3. THE PropertyImageService SHALL キャッシュの有効期限を環境変数で設定可能にする
4. WHEN キャッシュが期限切れになった THEN THE PropertyImageService SHALL バックグラウンドで再検索を実行する（ユーザーを待たせない）

### Requirement 2: データベースへのフォルダ構造の保存

**User Story:** As a システム管理者, I want フォルダ構造をデータベースに保存したい, so that 毎回Google Drive APIを呼び出す必要がなくなる。

#### Acceptance Criteria

1. THE System SHALL property_listingsテーブルに新しいカラム`public_folder_id`を追加する
2. WHEN サブフォルダ検索が成功した THEN THE PropertyImageService SHALL 結果をデータベースに保存する
3. WHEN 画像を取得する THEN THE PropertyImageService SHALL まずデータベースから`public_folder_id`を確認する
4. IF データベースに`public_folder_id`が存在する THEN THE PropertyImageService SHALL Google Drive APIの検索をスキップする
5. IF データベースに`public_folder_id`が存在しない THEN THE PropertyImageService SHALL サブフォルダ検索を実行し結果を保存する

### Requirement 3: サブフォルダ検索の最適化

**User Story:** As a システム, I want サブフォルダ検索を高速化したい, so that 初回アクセス時の待ち時間を短縮できる。

#### Acceptance Criteria

1. WHEN 複数のサブフォルダを検索する THEN THE PropertyImageService SHALL 並列処理で検索する
2. WHEN 「athome公開」フォルダが見つかった THEN THE PropertyImageService SHALL 「atbb公開」の検索をスキップする（優先順位）
3. THE PropertyImageService SHALL 検索タイムアウトを設定する（デフォルト: 2秒）
4. IF タイムアウトが発生した THEN THE PropertyImageService SHALL 親フォルダを使用する（フォールバック）
5. WHEN 2階層目の検索を行う THEN THE PropertyImageService SHALL 最大3つのサブフォルダまでに制限する（無限ループ防止）

### Requirement 4: バックグラウンドでのフォルダ構造の事前スキャン

**User Story:** As a システム管理者, I want 全物件のフォルダ構造を事前にスキャンしたい, so that ユーザーアクセス時に検索処理が不要になる。

#### Acceptance Criteria

1. THE System SHALL バックグラウンドジョブでフォルダ構造をスキャンする機能を提供する
2. WHEN バックグラウンドジョブが実行される THEN THE System SHALL 全物件の格納先URLからサブフォルダを検索する
3. WHEN サブフォルダが見つかった THEN THE System SHALL データベースに保存する
4. THE System SHALL バックグラウンドジョブを定期的に実行する（デフォルト: 1日1回）
5. THE System SHALL 手動でバックグラウンドジョブを実行できるコマンドを提供する

### Requirement 5: パフォーマンスモニタリング

**User Story:** As a システム管理者, I want 画像取得のパフォーマンスを監視したい, so that 問題を早期に発見できる。

#### Acceptance Criteria

1. WHEN 画像を取得する THEN THE PropertyImageService SHALL 処理時間をログに記録する
2. WHEN サブフォルダ検索を実行する THEN THE PropertyImageService SHALL 検索時間をログに記録する
3. IF 処理時間が閾値を超えた THEN THE PropertyImageService SHALL 警告ログを出力する（デフォルト: 2秒）
4. THE System SHALL パフォーマンスメトリクスをダッシュボードで確認できるようにする

### Requirement 6: 段階的なフォールバック戦略

**User Story:** As a システム, I want 検索に失敗した場合の代替手段を持ちたい, so that ユーザー体験を損なわない。

#### Acceptance Criteria

1. WHEN サブフォルダ検索を開始する THEN THE PropertyImageService SHALL 以下の順序で試行する:
   - データベースの`public_folder_id`を確認
   - メモリキャッシュを確認
   - Google Drive APIで検索（タイムアウト付き）
   - 親フォルダを使用（最終フォールバック）
2. WHEN いずれかの手段が成功した THEN THE PropertyImageService SHALL 後続の手段をスキップする
3. WHEN 全ての手段が失敗した THEN THE PropertyImageService SHALL エラーをログに記録し、空の結果を返す

### Requirement 7: キャッシュの無効化機能

**User Story:** As a システム管理者, I want キャッシュを手動で無効化したい, so that フォルダ構造の変更を即座に反映できる。

#### Acceptance Criteria

1. THE System SHALL 特定の物件のキャッシュを無効化するAPIエンドポイントを提供する
2. THE System SHALL 全物件のキャッシュを無効化するAPIエンドポイントを提供する
3. WHEN キャッシュが無効化された THEN THE PropertyImageService SHALL 次回アクセス時に再検索を実行する
4. THE System SHALL キャッシュ無効化の履歴をログに記録する

## Non-Functional Requirements

### Performance Requirements
- 画像表示の初回読み込み時間: 1秒以内（90パーセンタイル）
- キャッシュヒット時の画像表示時間: 200ms以内
- サブフォルダ検索のタイムアウト: 3秒
- バックグラウンドジョブの実行時間: 全物件で30分以内

### Scalability Requirements
- 1000件以上の物件に対応
- 同時アクセス数: 100ユーザー以上

### Reliability Requirements
- Google Drive API障害時でも親フォルダから画像を取得できる
- キャッシュ障害時でもサービスは継続する

## Technical Constraints

- Google Drive APIのレート制限を考慮する（1ユーザーあたり1秒間に10リクエスト）
- データベースのストレージ容量を考慮する（新しいカラムの追加）
- 既存のキャッシュ機構との互換性を保つ

## Success Metrics

- **初回アクセス時の画像表示時間**: 5秒 → 2秒以下に改善
- **2回目以降のアクセス時の画像表示時間**: 200ms以内（キャッシュヒット）
- Google Drive APIの呼び出し回数が80%削減される
- ユーザーからの画像表示に関する問い合わせが減少する

## Out of Scope

以下は本specの対象外とし、別のspecで対応する：
- ライトボックスUIの改善（次へ/前へボタンの配置変更）
- 画像の事前読み込み（プリロード）の改善
- 画像圧縮や最適化
