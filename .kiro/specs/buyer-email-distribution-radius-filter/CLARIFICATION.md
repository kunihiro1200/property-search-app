# Geographic Matching Clarification

## Updated Understanding (December 16, 2025)

### Previous (Incorrect) Approach
- Extract city/ward from the property's address field
- Match against buyer's preferred areas

### Current (Correct) Approach

#### Data Sources
1. **Property Location**: Google Map URL from the "GoogleMap" field in property details
2. **Area Definitions**: Predefined Google Map URLs for each area number (①-⑯, ㊵, ㊶)
3. **Buyer Preferences**: Area numbers in the buyer's "★エリア" field

#### Matching Algorithm

```
For each buyer:
  1. Extract area numbers from buyer's ★エリア field (e.g., "①②③")
  
  2. For each area number:
     a. Look up the area's Google Map URL from configuration
     b. Extract coordinates from area's Google Map URL
     c. Extract coordinates from property's Google Map URL
     d. Calculate distance between the two coordinates
     e. If distance ≤ 2KM, mark this area as matched
  
  3. Special handling for city-wide areas:
     - ㊵ (大分市全部): Match if property is in Oita City
     - ㊶ (別府市全部): Match if property is in Beppu City
  
  4. If any area matched, buyer is geographically eligible
```

#### Example Scenario

**Property:**
- Property Number: AA12345
- GoogleMap field: `https://maps.app.goo.gl/xyz123` → Coordinates: (33.2382, 131.6126)
- City: 大分市

**Area Configuration:**
- ① → `https://maps.app.goo.gl/6SUp2oApoATE4R336` → Coordinates: (33.2400, 131.6150)
- ② → `https://maps.app.goo.gl/3tXJJ3zPDhAXnxJk9` → Coordinates: (33.2500, 131.6300)
- ㊵ → City-wide match for 大分市

**Buyer A:**
- ★エリア: "①③"
- Distance from property to ①: 0.3km ✓ (within 2km)
- Distance from property to ③: 3.5km ✗ (outside 2km)
- **Result**: Geographically eligible (matched area ①)

**Buyer B:**
- ★エリア: "②④"
- Distance from property to ②: 2.5km ✗ (outside 2km)
- Distance from property to ④: 4.0km ✗ (outside 2km)
- **Result**: Not geographically eligible

**Buyer C:**
- ★エリア: "㊵"
- Property city: 大分市 ✓
- **Result**: Geographically eligible (city-wide match)

## Area Map Reference

The following area numbers correspond to specific Google Map URLs:

| Area Number | Google Map URL | Type |
|-------------|----------------|------|
| ① | https://maps.app.goo.gl/6SUp2oApoATE4R336 | Radius (2km) |
| ② | https://maps.app.goo.gl/3tXJJ3zPDhAXnxJk9 | Radius (2km) |
| ③ | https://maps.app.goo.gl/9CvuwKdgGCpM7kiT7 | Radius (2km) |
| ④ | https://maps.app.goo.gl/FAh59DdyR3Xrpn2d7 | Radius (2km) |
| ⑤ | (Not specified) | - |
| ⑥ | https://maps.app.goo.gl/LWcdvysji8MzrC4a6 | Radius (2km) |
| ⑦ | https://maps.app.goo.gl/UMvP5iD5ttYvpz9i8 | Radius (2km) |
| ⑧ | https://maps.app.goo.gl/4UJ6Dcfniv5HnJV67 | Radius (2km) |
| ⑨ | https://maps.app.goo.gl/RFxMmCWuqNBw1UR87 | Radius (2km) |
| ⑩ | https://maps.app.goo.gl/LQrdiaZjij6R69fx9 | Radius (2km) |
| ⑪ | https://maps.app.goo.gl/Lia3s1spu2giyaBJ9 | Radius (2km) |
| ⑫ | https://maps.app.goo.gl/qkaDsYW4HFpx9x8x9 | Radius (2km) |
| ⑬ | https://maps.app.goo.gl/hPndBk6HxPvdfFBz9 | Radius (2km) |
| ⑭ | https://maps.app.goo.gl/ZWYbTxb2Dnq6B6ka8 | Radius (2km) |
| ⑮ | https://maps.app.goo.gl/rAMak435w8Q33qJo8 | Radius (2km) |
| ㊵ | N/A | City-wide: 大分市全部 |
| ㊶ | N/A | City-wide: 別府市全部 |

## Implementation Notes

### Coordinate Extraction
Google Maps shortened URLs (maps.app.goo.gl) need to be resolved to get coordinates. Options:
1. Follow the redirect to get the full URL with embedded coordinates
2. Use Google Maps API to geocode the location
3. Cache extracted coordinates to avoid repeated lookups

### Distance Calculation
Use the Haversine formula to calculate great-circle distance between two coordinate pairs:
```
d = 2r × arcsin(√(sin²((lat2-lat1)/2) + cos(lat1) × cos(lat2) × sin²((lon2-lon1)/2)))
```
Where r = Earth's radius (6371 km)

### Performance Optimization
- Cache area map coordinates (they rarely change)
- Cache property coordinates (per session)
- Pre-calculate distances for frequently accessed properties
