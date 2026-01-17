# Requirements Document

## Introduction

公開物件詳細ページ（`/public/properties/:id`）に表示される物件画像を管理者が削除できる機能を追加する。現在、物件画像はGoogle Driveの格納先フォルダから取得・表示されているが、不要な画像や誤ってアップロードされた画像を削除する手段がない。

## Glossary

- **Public_Property_Page**: 一般公開されている物件詳細ページ（`/public/properties/:id`）
- **Property_Image_Gallery**: 物件画像を表示するギャラリーコンポーネント
- **Image_Deletion_Service**: Google Driveから画像ファイルを削除するバックエンドサービス
- **Admin_User**: 認証済みの管理者ユーザー
- **Storage_URL**: 物件画像が格納されているGoogle DriveフォルダのURL

## Requirements

### Requirement 1: 画像削除ボタンの表示

**User Story:** As an Admin_User, I want to see delete buttons on property images, so that I can identify which images can be removed.

#### Acceptance Criteria

1. WHEN an Admin_User views the Property_Image_Gallery THEN the system SHALL display a delete button on each image thumbnail
2. WHEN a non-authenticated user views the Property_Image_Gallery THEN the system SHALL NOT display delete buttons
3. THE delete button SHALL be positioned at the top-right corner of each image thumbnail
4. THE delete button SHALL have a clear visual indicator (trash icon) that indicates its purpose

### Requirement 2: 画像削除確認ダイアログ

**User Story:** As an Admin_User, I want to confirm before deleting an image, so that I can prevent accidental deletions.

#### Acceptance Criteria

1. WHEN an Admin_User clicks the delete button THEN the system SHALL display a confirmation dialog
2. THE confirmation dialog SHALL show the image thumbnail being deleted
3. THE confirmation dialog SHALL display a warning message about the irreversible nature of deletion
4. THE confirmation dialog SHALL provide "削除" (Delete) and "キャンセル" (Cancel) buttons
5. WHEN the Admin_User clicks "キャンセル" THEN the system SHALL close the dialog without deleting the image

### Requirement 3: 画像削除処理

**User Story:** As an Admin_User, I want to delete property images from Google Drive, so that unwanted images are permanently removed.

#### Acceptance Criteria

1. WHEN an Admin_User confirms deletion THEN the Image_Deletion_Service SHALL delete the image file from Google Drive
2. WHEN the deletion is successful THEN the system SHALL remove the image from the Property_Image_Gallery immediately
3. WHEN the deletion is successful THEN the system SHALL display a success notification
4. IF the deletion fails THEN the system SHALL display an error message with the reason
5. THE system SHALL clear the image cache after successful deletion to ensure consistency

### Requirement 4: 認証・認可

**User Story:** As a system administrator, I want to ensure only authorized users can delete images, so that the system remains secure.

#### Acceptance Criteria

1. THE Image_Deletion_Service SHALL require authentication for all delete requests
2. WHEN an unauthenticated request is received THEN the system SHALL return a 401 Unauthorized error
3. THE system SHALL log all deletion attempts with user information and timestamp
4. THE delete API endpoint SHALL validate that the image belongs to a valid property

### Requirement 5: ライトボックス内での削除

**User Story:** As an Admin_User, I want to delete images while viewing them in the lightbox, so that I can make informed decisions about which images to remove.

#### Acceptance Criteria

1. WHEN an Admin_User views an image in the lightbox THEN the system SHALL display a delete button
2. THE delete button in the lightbox SHALL trigger the same confirmation dialog as the thumbnail delete button
3. WHEN an image is deleted from the lightbox THEN the system SHALL navigate to the next image or close the lightbox if no images remain
