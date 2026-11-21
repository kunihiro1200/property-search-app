/** Offline checks only: no customer data or external calls. */
import { readFileSync } from 'fs';
import { resolve } from 'path';
const api = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
const service = readFileSync(resolve(__dirname, '../src/services/PropertyListingService.ts'), 'utf8');
const section = (a: string, b: string) => api.slice(api.indexOf(a), api.indexOf(b, api.indexOf(a)));
describe('public AA and FI partition', () => {
  test('site prefix remains mandatory even with exact property search', () => {
    expect(service).toContain("sitePrefix?: 'AA' | 'FI'");
    expect(service).toContain("query = query.ilike('property_number', `${sitePrefix}%`);");
  });
  test('listing APIs filter different brands at database', () => {
    expect(section("app.get('/api/public/properties',", "app.get('/api/public/properties/:")).toContain("sitePrefix: 'AA'");
    expect(section("app.get('/api/kujira/properties',", "app.get('/api/kujira/map-properties',")).toContain("sitePrefix: 'FI'");
  });
  test('map APIs keep sold home address obscured', () => {
    const fi = section("app.get('/api/kujira/map-properties',", "// 地図表示専用エンドポイント");
    const aa = section("app.get('/api/public/map-properties',", "// Vercel用のハンドラー");
    expect(fi).toContain(".ilike('property_number', 'FI%')");
    expect(aa).toContain(".ilike('property_number', 'AA%')");
    for(const body of [fi, aa]) {
      expect(body).toContain('const coarseGrid');
      expect(body).toContain('soldAreas');
      expect(body).toContain('is_clickable: false');
    }
  });
});
