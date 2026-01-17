# Requirements Document

## Introduction

公開物件サイトにおいて、詳細画面では画像が正常に表示されるが、一覧画面では画像が表示されない問題を解決する。詳細画面と一覧画面で同じ画像取得ロジックを使用しているはずだが、一覧画面でのみ画像が表示されない状況が発生している。

## Glossary

- **Public_Property_List**: 公開物件一覧ページ
- **Pagination**: ページネーション機能（前へ・次へボタン）
- **Image_Service**: PropertyImageServiceクラス
- **Storage_Location**: 物件の画像格納先URL（Google DriveフォルダURL）
- **Property_Listing_Service**: PropertyListingServiceクラス
- **Scroll_Position**: ページ内のスクロール位置（Y座標）
- **Navigation_State**: ページ番号、フィルター設定、スクロール位置を含む状態

## Requirements

### Requirement 1: ページネーション速度の維持

**User Story:** As a user, I want pagination to respond immediately, so that I can browse properties quickly.

#### Acceptance Criteria

1. WHEN a user clicks the "前へ" or "次へ" button, THE Public_Property_List SHALL respond within 1 second
2. WHEN a user navigates to a different page, THE Public_Property_List SHALL NOT fetch all properties again
3. WHEN a user changes filters, THE Public_Property_List SHALL fetch all properties for the map view

### Requirement 2: 一覧画面での画像表示

**User Story:** As a user, I want to see property images on the list page, so that I can visually identify properties before clicking.

#### Acceptance Criteria

1. WHEN a user views the property list page 1, THE Public_Property_List SHALL display images for all properties with storage_location
2. WHEN a user views page 2 or later, THE Public_Property_List SHALL display images for all properties with storage_location
3. WHEN a property has storage_location, THE Image_Service SHALL fetch the first image from Google Drive
4. WHEN a property does not have storage_location, THE Public_Property_List SHALL display a placeholder image
5. WHEN a user views the same property on both list and detail pages, THE Public_Property_List SHALL display the same image on both pages

### Requirement 3: 画像取得処理の最適化

**User Story:** As a developer, I want image fetching to be efficient, so that page load times remain fast.

#### Acceptance Criteria

1. WHEN fetching images for a page, THE Property_Listing_Service SHALL only fetch images for properties on that page (not all properties)
2. WHEN a property has storage_location, THE Image_Service SHALL use the existing storage_location value
3. WHEN a property does not have storage_location, THE Property_Listing_Service SHALL NOT attempt to search Google Drive (to avoid slowdown)
4. WHEN images are fetched, THE Image_Service SHALL cache results for 5 minutes

### Requirement 4: エラーハンドリング

**User Story:** As a user, I want the page to load even if some images fail to load, so that I can still browse properties.

#### Acceptance Criteria

1. WHEN an image fails to load, THE Public_Property_List SHALL display a placeholder image
2. WHEN an image fails to load, THE Public_Property_List SHALL log the error but continue rendering other properties
3. WHEN Google Drive API fails, THE Public_Property_List SHALL display all properties with placeholder images

### Requirement 5: 詳細画面との一貫性

**User Story:** As a user, I want the list page and detail page to show the same images, so that I have a consistent experience.

#### Acceptance Criteria

1. WHEN a property is displayed on the list page, THE Image_Service SHALL use the same image retrieval logic as the detail page
2. WHEN a user clicks on a property from the list page, THE detail page SHALL display the same first image that was shown on the list page
3. WHEN both pages fetch images, THE Image_Service SHALL use the same storage_location value
4. WHEN storage_location is empty on both pages, THE Image_Service SHALL attempt to fetch from work_tasks table in the same way

### Requirement 6: スクロール位置の復元

**User Story:** As a user, I want to return to the same scroll position when navigating back from the detail page, so that I can continue browsing from where I left off.

#### Acceptance Criteria

1. WHEN a user clicks on a property from the list page, THE Public_Property_List SHALL save the current scroll position
2. WHEN a user navigates back from the detail page to the list page, THE Public_Property_List SHALL restore the saved scroll position
3. WHEN a user navigates back to the list page, THE Public_Property_List SHALL restore the same page number
4. WHEN a user navigates back to the list page, THE Public_Property_List SHALL restore the same filter settings
5. WHEN a user refreshes the list page, THE Public_Property_List SHALL start from the top (scroll position 0)
