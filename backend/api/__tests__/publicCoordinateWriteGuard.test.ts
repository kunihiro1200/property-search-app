/**
 * No-network and no-secrets tests for the public coordinate write guard.
 * No Supabase or production Express application is imported.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validatePublicCoordinateInput } from '../src/utils/publicCoordinateWriteGuard';

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
