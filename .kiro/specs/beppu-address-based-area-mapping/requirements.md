# Requirements Document

## Introduction

別府市内の物件に対して、住所情報から学校区や地域情報に基づいた詳細な配信エリア番号を自動的に振り分けるシステムを実装する。現在は別府市全体に対して㊶が設定されるが、より細かいエリア分け(⑨、⑩、⑪、⑫、⑬、⑭、⑮、㊷、㊸)を住所から自動判定できるようにする。

## Glossary

- **System**: 不動産売主・買主管理システム
- **Property**: 物件情報
- **Distribution Area**: 配信エリア番号(⑨-⑮、㊷、㊸など)
- **School District**: 学校区(青山中学校、中部中学校、北部中学校など)
- **Region Name**: 地域名(南立石一区、荘園北町など)
- **Beppu Area Mapping**: 別府市内の住所と配信エリア番号のマッピングテーブル
- **Address Extraction**: 住所から地域名を抽出する処理

## Background

### 現状の課題

現在のシステムでは:
- 別府市の物件は一律に㊶(別府市全部)が設定される
- 別府市内の詳細なエリア分けができない
- 学校区や地域による細かい配信ができない

### 提供されたデータ構造

別府市には以下のような詳細なエリア分けが存在する:

**学校区ベースのエリア:**
- ⑨ 青山中学校区
- ⑩ 中部中学校区
- ⑪ 北部中学校区
- ⑫ 朝日中学校区
- ⑬ 東山中学校区
- ⑭ 鶴見台中学校区
- ⑮ 別府西中学校区

**特別エリア:**
- ㊷ 別府駅周辺
- ㊸ 鉄輪線より下

**地域名の例:**
- 南立石一区、南立石二区、南立石生目町、板地町、本町、八幡町
- 荘園北町、緑丘町、東荘園1-9丁目
- 亀川四の湯町、亀川中央町、亀川東町
- 石垣東1-10丁目、石垣西1-10丁目
- など多数

## Requirements

### Requirement 1: 別府市エリアマッピングデータベース

**User Story:** As a system administrator, I want to store detailed area mapping data for Beppu City, so that properties can be automatically assigned to the correct distribution areas based on their addresses.

#### Acceptance Criteria

1. WHEN the system initializes THEN the system SHALL create a beppu_area_mapping table in the database
2. WHEN storing area mapping data THEN the system SHALL include school district name, region name, and distribution area numbers
3. WHEN storing area mapping data THEN the system SHALL support multiple distribution area numbers per region
4. WHEN querying area mapping data THEN the system SHALL support partial matching on region names
5. WHEN the mapping table is created THEN the system SHALL populate it with all provided Beppu City area data

### Requirement 2: 住所からの地域名抽出

**User Story:** As a system, I want to extract region names from property addresses, so that I can match them against the area mapping database.

#### Acceptance Criteria

1. WHEN a property address contains a Beppu City region name THEN the system SHALL extract the region name
2. WHEN extracting region names THEN the system SHALL handle variations in formatting (with/without 丁目, 区, 町)
3. WHEN extracting region names THEN the system SHALL prioritize longer matches over shorter matches
4. WHEN multiple region names match THEN the system SHALL return the most specific match
5. WHEN no region name is found THEN the system SHALL return null and log a warning

### Requirement 3: 配信エリア番号の自動設定

**User Story:** As a real estate agent, I want properties in Beppu City to automatically receive detailed distribution area numbers, so that I can target buyers more precisely.

#### Acceptance Criteria

1. WHEN a property address is in Beppu City THEN the system SHALL look up the region in the area mapping table
2. WHEN a matching region is found THEN the system SHALL set the distribution_areas field with all matching area numbers
3. WHEN multiple area numbers apply THEN the system SHALL combine them (e.g., "⑨㊷")
4. WHEN no specific region match is found THEN the system SHALL fall back to ㊶ (別府市全部)
5. WHEN distribution areas are set THEN the system SHALL log which region was matched

### Requirement 4: 既存物件の一括更新

**User Story:** As a system administrator, I want to update distribution areas for all existing Beppu City properties, so that the detailed area mapping applies to historical data.

#### Acceptance Criteria

1. WHEN running a backfill script THEN the system SHALL identify all properties with address containing "別府市"
2. WHEN processing each property THEN the system SHALL extract the region name and look up area numbers
3. WHEN updating properties THEN the system SHALL preserve manually edited distribution_areas if they exist
4. WHEN the backfill completes THEN the system SHALL report how many properties were updated
5. WHEN errors occur during backfill THEN the system SHALL log the property number and continue processing

### Requirement 5: 新規物件への自動適用

**User Story:** As a real estate agent, I want new Beppu City properties to automatically receive detailed distribution areas, so that I don't have to manually set them.

#### Acceptance Criteria

1. WHEN a new property is created with a Beppu City address THEN the system SHALL automatically calculate distribution areas
2. WHEN a property address is updated THEN the system SHALL recalculate distribution areas
3. WHEN the PropertyDistributionAreaCalculator runs THEN the system SHALL use the Beppu area mapping for Beppu addresses
4. WHEN distribution areas are auto-calculated THEN the system SHALL include both school district and special area numbers
5. WHEN the calculation completes THEN the system SHALL save the result to the distribution_areas field

### Requirement 6: マッピングデータの管理

**User Story:** As a system administrator, I want to be able to update area mapping data, so that I can adjust the mappings as boundaries or school districts change.

#### Acceptance Criteria

1. WHEN area mapping data needs to be updated THEN the system SHALL provide a migration script
2. WHEN adding new regions THEN the system SHALL support inserting new rows into the mapping table
3. WHEN updating existing regions THEN the system SHALL support modifying area number assignments
4. WHEN deleting obsolete regions THEN the system SHALL support removing rows from the mapping table
5. WHEN mapping data changes THEN the system SHALL provide a way to re-run distribution area calculation

### Requirement 7: 検証とログ

**User Story:** As a system administrator, I want detailed logging of area mapping operations, so that I can debug issues and verify correct behavior.

#### Acceptance Criteria

1. WHEN extracting region names THEN the system SHALL log the original address and extracted region
2. WHEN looking up area mappings THEN the system SHALL log the search query and results
3. WHEN setting distribution areas THEN the system SHALL log the property number and assigned areas
4. WHEN no match is found THEN the system SHALL log a warning with the address details
5. WHEN errors occur THEN the system SHALL log the full error with context information

## Data Structure

### beppu_area_mapping Table Schema

```sql
CREATE TABLE beppu_area_mapping (
  id SERIAL PRIMARY KEY,
  school_district TEXT NOT NULL,           -- 学校名 (例: 青山中学校)
  region_name TEXT NOT NULL,               -- 地域名 (例: 南立石一区)
  distribution_areas TEXT NOT NULL,        -- 配信エリア番号 (例: ⑨㊷)
  other_region TEXT,                       -- その他地域 (例: 別府駅周辺)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_beppu_region_name ON beppu_area_mapping(region_name);
CREATE INDEX idx_beppu_school_district ON beppu_area_mapping(school_district);
```

### Sample Data

| school_district | region_name | distribution_areas | other_region |
|----------------|-------------|-------------------|--------------|
| 青山中学校 | 南立石一区 | ⑨㊷ | 別府駅周辺 |
| 青山中学校 | 南立石二区 | ⑨㊷ | 別府駅周辺 |
| 青山中学校 | 南立石生目町 | ⑨㊸ | 鉄輪線より下 |
| 中部中学校 | 荘園北町 | ⑩㊸ | 鉄輪線より下 |
| 中部中学校 | 緑丘町 | ⑩㊸ | 鉄輪線より下 |
| 北部中学校 | 亀川四の湯町１区 | ⑪㊸ | 鉄輪線より下 |

## Implementation Notes

### Address Matching Strategy

1. **完全一致**: 住所に地域名が完全に含まれる場合
   - 例: "別府市南立石一区1-2-3" → "南立石一区"

2. **部分一致**: 住所に地域名の一部が含まれる場合
   - 例: "別府市荘園北町5-10" → "荘園北町"
   - 例: "別府市東荘園4丁目3-5" → "東荘園4丁目"

3. **優先順位**: より具体的な地域名を優先
   - "東荘園4丁目" > "東荘園"
   - "石垣東１丁目" > "石垣東"

### Integration Points

- `PropertyDistributionAreaCalculator.ts` を拡張
- `CityNameExtractor.ts` に別府市の地域名抽出ロジックを追加
- 新しいサービス `BeppuAreaMappingService.ts` を作成

## Success Criteria

1. 別府市の全ての地域データがデータベースに格納されている
2. 別府市の住所を持つ物件が正しい配信エリア番号を自動的に取得する
3. 既存の別府市物件の配信エリアが一括更新される
4. 新規物件作成時に自動的に詳細エリアが設定される
5. マッピングが見つからない場合は㊶にフォールバックする
