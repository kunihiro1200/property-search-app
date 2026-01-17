# Requirements Document

## Introduction

大分市の物件に対して、住所情報から配信エリアを自動的に計算するシステムを実装します。現在、別府市の物件には`BeppuAreaMappingService`が存在しますが、大分市の物件には対応していません。物件AA12449（大分市中津留２丁目）のような大分市の物件に対して、正確な配信エリアを自動計算できるようにします。

## Glossary

- **System**: 大分市住所ベースエリアマッピングシステム
- **OitaCityAreaMappingService**: 大分市の住所から配信エリアを計算するサービスクラス
- **PropertyDistributionAreaCalculator**: 物件の配信エリアを計算する既存のサービス
- **oita_city_area_mapping**: 大分市の地域名と配信エリアのマッピングを格納するデータベーステーブル
- **Region Name**: 大分市内の地域名（例: 中津留、大道町、新貝など）
- **Distribution Areas**: 配信エリアの識別子（例: ①, ②, ③, ④, ⑥）

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want the system to automatically calculate distribution areas for Oita City properties based on their addresses, so that property listings are correctly distributed to interested buyers.

#### Acceptance Criteria

1. WHEN a property address contains "大分市" THEN the System SHALL extract the region name from the address
2. WHEN the region name is extracted THEN the System SHALL query the oita_city_area_mapping table for matching distribution areas
3. WHEN a matching region is found THEN the System SHALL return the corresponding distribution areas
4. WHEN no matching region is found THEN the System SHALL return null
5. WHEN multiple regions match THEN the System SHALL return the most specific match

### Requirement 2

**User Story:** As a developer, I want a database table to store Oita City region-to-area mappings, so that the system can look up distribution areas efficiently.

#### Acceptance Criteria

1. WHEN the migration runs THEN the System SHALL create an oita_city_area_mapping table with region_name and distribution_areas columns
2. WHEN storing region mappings THEN the System SHALL ensure region_name is unique
3. WHEN querying mappings THEN the System SHALL support case-insensitive region name matching
4. WHEN the table is created THEN the System SHALL include appropriate indexes for query performance
5. WHEN the table is populated THEN the System SHALL contain all Oita City regions with their corresponding distribution areas

### Requirement 3

**User Story:** As a system administrator, I want to populate the mapping table with comprehensive Oita City area data, so that all properties can be correctly mapped.

#### Acceptance Criteria

1. WHEN populating area ① THEN the System SHALL include regions: 大道町, 要町, 新町, 末広町, 太平町, 田室町, 西大道, 東大道, 王子北町, 王子新町, 王子中町, 王子西町, 王子町, 王子港町, 王子南町, 王子山の手町, 新春日町, 勢家町, 中春日町, 西春日町, 東春日町, 南春日町, 南王子町, 上春日町, 季の坂, 椎迫, 志手, にじが丘, ほたるの杜団地
2. WHEN populating area ② THEN the System SHALL include regions: 新貝, 新栄町, 高城新町, 高城本町, 高松, 高松東, 花高松, 原川, 原新町, 日岡, 日吉町, 松原町, 向原沖, 向原西, 向原東, 岡, 岡新町, 乙津港町, 千歳, 千歳団地, 高城西町, 高城南町, 寺崎町, 仲西町, 三川上, 三川下, 三川新町, 桃園団地, 山津, 山津町, 小池原
3. WHEN populating area ③ THEN the System SHALL include regions: 久保山団地, 新明治, 横尾東町, パークヒルズ久保山, 大字猪野, 猪野南, 大字葛木, 大字森, 大字横尾, 法勝台, 公園通り, 京が丘, 大字大津留, 毛井, 松岡
4. WHEN populating area ④ THEN the System SHALL include regions: 鶴崎, コスモス団地, 金谷, 大字下徳丸, 下徳丸, 関園, 常行, 南関門, 迫, 堂園, 大字常行, 大字鶴瀬, 大字丸亀, 亀甲, 上徳丸, 大字南つるさき, 陽光台, 宮河内ハイランド, リバーサイド, 若葉台, 大字迫, 大字種具, 種具, 大字広内, 大字宮河内, 杵河内, 阿蘇, 入新田, 浄土寺, 宮谷
5. WHEN populating area ⑥ THEN the System SHALL include regions: 賀来北, 賀来西, 賀来南, 国分新町, 国分台, 国分団地, 東野台, 大字賀来, 大字国分, 大字東院, 大字中尾, カームタウン, 野田, 中尾, 森ノ木, 脇, 大字野田, 宮苑, 大字平横瀬, 大字宮苑, 餅田

### Requirement 4

**User Story:** As a developer, I want the OitaCityAreaMappingService to integrate with PropertyDistributionAreaCalculator, so that Oita City properties are automatically handled.

#### Acceptance Criteria

1. WHEN PropertyDistributionAreaCalculator processes an address containing "大分市" THEN the System SHALL delegate to OitaCityAreaMappingService
2. WHEN OitaCityAreaMappingService returns distribution areas THEN the System SHALL use those areas for the property
3. WHEN OitaCityAreaMappingService returns null THEN the System SHALL fall back to existing logic
4. WHEN calculating distribution areas THEN the System SHALL maintain backward compatibility with existing properties
5. WHEN the service is called THEN the System SHALL log the calculation process for debugging

### Requirement 5

**User Story:** As a system administrator, I want to backfill distribution areas for existing Oita City properties, so that all properties have correct area assignments.

#### Acceptance Criteria

1. WHEN running the backfill script THEN the System SHALL identify all properties with addresses containing "大分市"
2. WHEN processing each property THEN the System SHALL calculate distribution areas using OitaCityAreaMappingService
3. WHEN distribution areas are calculated THEN the System SHALL update the property_listings table
4. WHEN the backfill completes THEN the System SHALL report the number of properties updated
5. WHEN errors occur THEN the System SHALL log detailed error information and continue processing

### Requirement 6

**User Story:** As a developer, I want comprehensive test coverage for the Oita City mapping system, so that I can verify correct behavior.

#### Acceptance Criteria

1. WHEN testing with "大分市中津留２丁目" THEN the System SHALL return "③"
2. WHEN testing with "大分市大道町" THEN the System SHALL return "①"
3. WHEN testing with "大分市新貝" THEN the System SHALL return "②"
4. WHEN testing with "大分市鶴崎" THEN the System SHALL return "④"
5. WHEN testing with "大分市賀来北" THEN the System SHALL return "⑥"
6. WHEN testing with an unmapped region THEN the System SHALL return null
7. WHEN testing with丁目 variations THEN the System SHALL correctly match the base region name

### Requirement 7

**User Story:** As a system administrator, I want management scripts to add, update, and verify Oita City area mappings, so that I can maintain the mapping data.

#### Acceptance Criteria

1. WHEN running the populate script THEN the System SHALL insert all Oita City region mappings
2. WHEN running the verify script THEN the System SHALL check for missing or incorrect mappings
3. WHEN running the recalculate script THEN the System SHALL update distribution areas for all Oita City properties
4. WHEN duplicate mappings exist THEN the System SHALL detect and report them
5. WHEN running management scripts THEN the System SHALL provide clear progress and completion messages
