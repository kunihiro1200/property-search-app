# Requirements Document

## Introduction

物件公開サイトの物件詳細画面において、物件データに含まれる「格納先URL（storage_url）」フィールドからGoogleドライブフォルダを特定し、そのフォルダ内の画像ファイルを取得して表示する機能を実装する。

## Glossary

- **Storage_URL**: 物件データに含まれるGoogleドライブフォルダのURL（格納先URL）
- **Drive_Folder**: Googleドライブ上のフォルダ
- **Image_Service**: Googleドライブから画像を取得するバックエンドサービス
- **Public_Property_Page**: 物件公開サイトの物件詳細ページ
- **Thumbnail**: 画像の縮小版プレビュー

## Requirements

### Requirement 1: 格納先URLからの画像取得

**User Story:** As a 物件公開サイトの訪問者, I want 物件詳細ページで物件の画像を見たい, so that 物件の外観や内装を確認できる。

#### Acceptance Criteria

1. WHEN 物件詳細ページが読み込まれる THEN THE Image_Service SHALL 物件の格納先URL（storage_url）からフォルダIDを抽出する
2. WHEN フォルダIDが抽出できた THEN THE Image_Service SHALL そのフォルダ内の画像ファイルを取得する
3. IF 格納先URLが設定されていない場合 THEN THE Image_Service SHALL 空の配列を返す
4. IF 格納先URLが無効な形式の場合 THEN THE Image_Service SHALL エラーをログに記録し空の配列を返す

### Requirement 2: フォルダ内画像の取得

**User Story:** As a システム, I want 検索したフォルダから画像ファイルを取得したい, so that 物件詳細ページに表示できる。

#### Acceptance Criteria

1. WHEN フォルダが見つかった THEN THE Image_Service SHALL そのフォルダ内の画像ファイル（JPEG, PNG, GIF）を取得する
2. WHEN 画像ファイルを取得する THEN THE Image_Service SHALL サムネイルURLと元画像URLの両方を返す
3. WHEN 画像が複数ある THEN THE Image_Service SHALL 更新日時の新しい順にソートして返す
4. IF フォルダ内に画像がない場合 THEN THE Image_Service SHALL 空の配列を返す

### Requirement 3: 画像表示UI

**User Story:** As a 物件公開サイトの訪問者, I want 物件画像をギャラリー形式で見たい, so that 複数の画像を簡単に閲覧できる。

#### Acceptance Criteria

1. WHEN 画像が取得できた THEN THE Public_Property_Page SHALL 画像をギャラリー形式で表示する
2. WHEN 画像をクリックした THEN THE Public_Property_Page SHALL 拡大表示モーダルを開く
3. WHEN 複数の画像がある THEN THE Public_Property_Page SHALL 左右の矢印で画像を切り替えられるようにする
4. IF 画像が取得できなかった場合 THEN THE Public_Property_Page SHALL 「画像なし」のプレースホルダーを表示する
5. WHILE 画像を読み込み中 THEN THE Public_Property_Page SHALL ローディングインジケーターを表示する

### Requirement 4: パフォーマンスとキャッシュ

**User Story:** As a システム管理者, I want 画像取得のパフォーマンスを最適化したい, so that ページの読み込み速度を維持できる。

#### Acceptance Criteria

1. WHEN 画像URLを取得する THEN THE Image_Service SHALL 結果を一定時間キャッシュする
2. WHEN キャッシュが有効な間 THEN THE Image_Service SHALL Googleドライブへの再問い合わせを行わない
3. THE Image_Service SHALL キャッシュの有効期限を設定可能にする（デフォルト: 1時間）

### Requirement 5: エラーハンドリング

**User Story:** As a システム, I want エラーを適切に処理したい, so that ユーザー体験を損なわない。

#### Acceptance Criteria

1. IF Googleドライブへの接続に失敗した場合 THEN THE Image_Service SHALL エラーをログに記録し、空の結果を返す
2. IF 認証エラーが発生した場合 THEN THE Image_Service SHALL 管理者に通知する仕組みを持つ
3. WHEN エラーが発生した THEN THE Public_Property_Page SHALL ユーザーに適切なメッセージを表示する（技術的詳細は隠す）
