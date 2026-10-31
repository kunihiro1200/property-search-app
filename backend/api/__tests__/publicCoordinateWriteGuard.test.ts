/**
 * No-network and no-secrets tests for the public coordinate write guard.
 * No Supabase or production Express application is imported.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { isAnonymousCoordinateSaveDisabled, validatePublicCoordinateInput } from '../src/utils/publicCoordinateWriteGuard';

describe('anonymous coordinate cache input validation', () => {
  test.each([
    [{ latitude: 33.6, longitude: 130.4 }, { latitude: 33.6, longitude: 130.4 }],
    [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }],
    [{ latitude: -90, longitude: 180 }, { latitude: -90, longitude: 180 }],
    [{ latitude: 90, longitude: -180 }, { latitude: 90, longitude: -180 }],
  ])('accepts finite in-range numbers', (input, expected) => {
    expect(validatePublicCoordinateInput(input)).toEqual(expected);
  });

  test.each([
    null, undefined, false, '33,130', {}, [], { latitude: 33 }, { longitude: 130 },
    { latitude: '33.6', longitude: '130.4' },
    { latitude: true, longitude: false },
    { latitude: NaN, longitude: 130 }, { latitude: 33, longitude: NaN },
    { latitude: Infinity, longitude: 130 }, { latitude: 33, longitude: -Infinity },
    { latitude: 90.0001, longitude: 130 }, { latitude: -90.0001, longitude: 130 },
    { latitude: 33, longitude: 180.0001 }, { latitude: 33, longitude: -180.0001 },
  ])('rejects invalid anonymous request input', (input) => {
    expect(validatePublicCoordinateInput(input)).toBeNull();
  });
});

describe('public coordinate cache source contract', () => {
  const source = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const start = source.indexOf("app.post('/api/public/properties/:propertyNumber/save-coordinates', async (req, res) => {");
  const end = source.indexOf('// Error handling middleware', start);
  const route = source.slice(start, end);
  const publicPage = readFileSync(resolve(__dirname, '../../../frontend/src/pages/PublicPropertyDetailPage.tsx'), 'utf8');
  const kujiraPage = readFileSync(resolve(__dirname, '../../../frontend/src/pages/KujiraPropertyDetailPage.tsx'), 'utf8');

  test('preserves existing anonymous public pages and request payload format', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(publicPage).toContain('/save-coordinates');
    expect(kujiraPage).toContain('/save-coordinates');
    expect(publicPage).toContain('latitude: coords.lat, longitude: coords.lng');
    expect(kujiraPage).toContain('latitude: coords.lat, longitude: coords.lng');
  });

  test('updates only non-hidden rows with a saved Map URL and BOTH coordinates absent', () => {
    expect(route).toContain("validatePublicCoordinateInput(req.body)");
    expect(route).toContain(".eq('is_hidden', false)");
    expect(route).toContain(".not('google_map_url', 'is', null)");
    expect(route).toContain(".neq('google_map_url', '')");
    expect(route).toContain(".is('latitude', null)");
    expect(route).toContain(".is('longitude', null)");
    expect(route).toContain(".select('property_number')");
    expect(route).toContain(".maybeSingle()");
    expect(route).toContain('updated: updated !== null');
  });

  test('does not leak database error details, raw URL or original coordinates', () => {
    expect(route).not.toContain('error: error.message');
    expect(route).not.toContain('Saved coordinates for');
    expect(route).not.toContain('req.headers.authorization');
  });

  test('does not enable automatic coordinate backfill or change the legacy sync API', () => {
    expect(source).toContain("app.post('/api/sync/trigger', (req, res, next) => {");
    expect(source).not.toContain("app.post('/api/admin/properties/coordinate-backfill-batch'");
    expect(source).not.toContain('PROPERTY_COORDINATE_BACKFILL_ENABLED');
  });
});

describe('opt-in visitor coordinate write cutoff (offline regression)', () => {
  const api = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const ifu = readFileSync(resolve(__dirname, '../../../frontend/src/pages/PublicPropertyDetailPage.tsx'), 'utf8');
  const kujira = readFileSync(resolve(__dirname, '../../../frontend/src/pages/KujiraPropertyDetailPage.tsx'), 'utf8');

  test.each([
    [undefined, false], ['', false], ['false', false],
    ['TRUE', false], ['1', false], ['true', true],
  ])('server flag %s switches cutoff only for exact true', (flag, disabled) => {
    expect(isAnonymousCoordinateSaveDisabled(flag)).toBe(disabled);
  });

  test('backend rejects writes before input validation or DB access', () => {
    const start = api.indexOf("app.post('/api/public/properties/:propertyNumber/save-coordinates', async (req, res) => {");
    const end = api.indexOf('// Error handling middleware', start);
    const route = api.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(route).toContain('isAnonymousCoordinateSaveDisabled(process.env.PUBLIC_COORDINATE_SAVE_DISABLED)');
    expect(route).toContain("res.status(403).json({ success: false, error: 'Visitor coordinate saving is disabled' })");
    expect(route.indexOf('isAnonymousCoordinateSaveDisabled')).toBeLessThan(route.indexOf('validatePublicCoordinateInput(req.body)'));
    expect(route.indexOf('isAnonymousCoordinateSaveDisabled')).toBeLessThan(route.indexOf(".from('property_listings')"));
  });

  test('public property GET carries flag without removing property details', () => {
    const start = api.indexOf("app.get('/api/public/properties/:propertyIdentifier', async (req, res) => {");
    const end = api.indexOf('// 公開物件の完全な詳細情報取得', start);
    const route = api.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(route).toContain('visitorCoordinateSaveEnabled: !isAnonymousCoordinateSaveDisabled(process.env.PUBLIC_COORDINATE_SAVE_DISABLED)');
    expect(route).toContain('...property,');
    expect(route).toContain('images,');
  });

  test.each([['ifu', ifu], ['kujira', kujira]])('%s shows the map independently of visitor DB writes', (_, page) => {
    const display = page.indexOf('setMapCoordinates(coords);');
    const guard = page.indexOf('if (property.visitorCoordinateSaveEnabled !== false) {');
    const post = page.indexOf('/save-coordinates');
    expect(display).toBeGreaterThan(0);
    expect(guard).toBeGreaterThan(display);
    expect(post).toBeGreaterThan(guard);
    expect(page).toContain('latitude: coords.lat, longitude: coords.lng');
  });
});
