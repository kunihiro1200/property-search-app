/**
 * Pure, no-network tests. No Supabase client is imported and no external
 * application endpoint is called. These tests cannot modify production data.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  classifyStoredMapUrl,
  isCoordinateBackfillWriteEnabled,
  parseBackfillBatchOptions,
} from '../src/utils/coordinateBackfillBatch';

describe('fail-closed batch options', () => {
  test('default is an authenticated, read-only preview of five', () => {
    expect(parseBackfillBatchOptions({})).toEqual({ mode: 'preview', limit: 5, after: null });
    expect(parseBackfillBatchOptions({ dryRun: true, execute: true })).toEqual({ mode: 'preview', limit: 5, after: null });
    expect(parseBackfillBatchOptions({ dryRun: false })).toEqual({ mode: 'preview', limit: 5, after: null });
    expect(parseBackfillBatchOptions({ execute: true })).toEqual({ mode: 'preview', limit: 5, after: null });
  });

  test('execution requires two explicit flags', () => {
    expect(parseBackfillBatchOptions({
      execute: true,
      dryRun: false,
      limit: 3,
      after: 'AA100',
    })).toEqual({ mode: 'execute', limit: 3, after: 'AA100' });
  });

  test.each([
    null, [], true, 5,
    { limit: 0 }, { limit: 6 }, { limit: -1 }, { limit: '5' },
    { limit: 1.5 }, { dryRun: 'false' }, { execute: 'true' },
    { after: 'AA 100' }, { after: '../AA100' }, { after: '' },
  ])('invalid options must be rejected', (bad) => {
    expect(parseBackfillBatchOptions(bad)).toBeNull();
  });

  test('mutating mode requires an exact server-only opt-in', () => {
    expect(isCoordinateBackfillWriteEnabled(undefined)).toBe(false);
    expect(isCoordinateBackfillWriteEnabled('false')).toBe(false);
    expect(isCoordinateBackfillWriteEnabled('TRUE')).toBe(false);
    expect(isCoordinateBackfillWriteEnabled('true')).toBe(true);
  });
});

describe('offline-only inspection of saved Google Map URLs', () => {
  test('recognizes URLs with valid coordinates', () => {
    expect(classifyStoredMapUrl('https://www.google.com/maps?q=33.2,131.4')).toBe('direct_coordinates');
    expect(classifyStoredMapUrl('https://www.google.com/maps?q=0,0')).toBe('direct_coordinates');
  });

  test('recognizes only allowlisted short Google Maps links', () => {
    expect(classifyStoredMapUrl('https://maps.app.goo.gl/someCode')).toBe('google_shortlink');
    expect(classifyStoredMapUrl('https://goo.gl/maps/someCode')).toBe('google_shortlink');
  });

  test.each([
    'https://maps.app.goo.gl.evil.test/hijack',
    'https://evil.test/maps?q=33,131',
    'http://maps.app.goo.gl/code',
    'https://maps.app.goo.gl:8443/code',
    'https://goo.gl/not-a-map',
    'https://www.google.com/maps?q=91,131',
    '',
    null,
    undefined,
  ])('rejects untrusted map URL', (input) => {
    expect(classifyStoredMapUrl(input)).toBe('unsupported');
  });
});

describe('authenticated batch implementation contract', () => {
  const source = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const routeStart = source.indexOf("app.post('/api/admin/properties/coordinate-backfill-batch', requireStaffOrMachine");
  const routeEnd = source.indexOf('// 公開物件の座標を保存', routeStart);
  const route = source.slice(routeStart, routeEnd);
  const singleStart = source.indexOf("app.post('/api/admin/properties/:propertyNumber/derive-coordinates', requireStaffOrMachine");
  const singleRoute = source.slice(singleStart, routeStart);

  test('batch is authenticated, cursor bounded and dry-run is default', () => {
    expect(routeStart).toBeGreaterThan(0);
    expect(route).toContain('parseBackfillBatchOptions(req.body)');
    expect(route).toContain('.limit(options.limit + 1)');
    expect(route).toContain('.order(\'property_number\', { ascending: true })');
    expect(route).toContain("if (options.mode === 'preview' || kind === 'unsupported') continue;");
    expect(route).toContain('classifyStoredMapUrl(property.google_map_url)');
    expect(route).not.toContain('req.body.latitude');
    expect(route).not.toContain('req.body.longitude');
  });

  test('writes are off by default in both staff-only routes', () => {
    expect(singleRoute).toContain("process.env.PROPERTY_COORDINATE_BACKFILL_ENABLED");
    expect(route).toContain("process.env.PROPERTY_COORDINATE_BACKFILL_ENABLED");
    expect(route).toContain("if (options.mode === 'execute' && !writeEnabled)");
  });

  test('an atomic update checks saved URL and both empty coordinates', () => {
    expect(route).toContain("deriveTrustedPropertyCoordinates(property.google_map_url)");
    expect(route).toContain(".eq('google_map_url', property.google_map_url)");
    expect(route).toContain(".is('latitude', null)");
    expect(route).toContain(".is('longitude', null)");
  });

  test('anonymous public coordinate-saving route remains unmodified during migration', () => {
    expect(source).toContain("app.post('/api/public/properties/:propertyNumber/save-coordinates', async (req, res) => {");
  });
});
