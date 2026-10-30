/**
 * No-network, no-credential regression tests for trusted-source coordinate
 * backfill. These tests never import the production Express entrypoint.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  deriveTrustedPropertyCoordinates,
  parseTrustedGoogleMapCoordinates,
} from '../src/utils/trustedPropertyCoordinates';

describe('direct trusted Google Maps coordinate parsing', () => {
  test.each([
    ['https://maps.google.com/maps?q=33.2820604,131.4869034', 33.2820604, 131.4869034],
    ['https://www.google.com/maps/search/33.231233,+131.576897', 33.231233, 131.576897],
    ['https://www.google.com/maps/place/33.2820604,131.4869034', 33.2820604, 131.4869034],
    ['https://www.google.com/maps/place/Example/@33.2820604,131.4869034,15z', 33.2820604, 131.4869034],
    ['https://www.google.com/maps/@33.2820604,131.4869034,15z', 33.2820604, 131.4869034],
    ['https://www.google.com/maps?q=33.2%2C131.4', 33.2, 131.4],
    ['https://www.google.co.jp/maps?q=0,0', 0, 0],
  ])('parses genuine Google Maps URL', (url, lat, lng) => {
    expect(parseTrustedGoogleMapCoordinates(String(url))).toEqual({ lat: Number(lat), lng: Number(lng) });
  });

  test.each([
    'http://www.google.com/maps?q=33,131',
    'https://www.google.com.attacker.test/maps?q=33,131',
    'https://maps.app.goo.gl.attacker.test/maps?q=33,131',
    'https://evil.test/maps?q=33,131',
    'https://www.google.com.evil.org/maps?q=33,131',
    'https://www.google.com:8443/maps?q=33,131',
    'https://user:pass@www.google.com/maps?q=33,131',
    'https://www.google.com/search?q=33,131',
    'https://www.google.com/maps?q=91,131',
    'https://www.google.com/maps?q=33,181',
    'https://www.google.com/maps?q=NaN,131',
    'https://www.google.com/maps/place/Fukuoka',
    'not a URL',
  ])('rejects untrusted or unusable input: %s', (url) => {
    expect(parseTrustedGoogleMapCoordinates(url)).toBeNull();
  });
});

describe('shortlink derivation', () => {
  test('resolves one trusted shortlink without fetching the redirect in the utility', async () => {
    let called = 0;
    const result = await deriveTrustedPropertyCoordinates(
      'https://maps.app.goo.gl/aBcDeF',
      async (url) => {
        called++;
        expect(url.hostname).toBe('maps.app.goo.gl');
        return 'https://www.google.com/maps/@33.2,131.4,15z';
      },
    );
    expect(result).toEqual({ lat: 33.2, lng: 131.4 });
    expect(called).toBe(1);
  });

  test('never calls the expander on spoofed or non-map shortlinks', async () => {
    const expander = jest.fn(async () => 'https://www.google.com/maps?q=33,131');
    await expect(deriveTrustedPropertyCoordinates(
      'https://maps.app.goo.gl.evil.test/link', expander,
    )).resolves.toBeNull();
    await expect(deriveTrustedPropertyCoordinates(
      'https://goo.gl/other-short-url', expander,
    )).resolves.toBeNull();
    expect(expander).not.toHaveBeenCalled();
  });

  test('rejects redirect to a non-Google destination', async () => {
    const result = await deriveTrustedPropertyCoordinates(
      'https://maps.app.goo.gl/aBcDeF',
      async () => 'https://attacker.test/maps/@33,131,15z',
    );
    expect(result).toBeNull();
  });

  test('rejects repeated shortlinks and missing coordinates', async () => {
    await expect(deriveTrustedPropertyCoordinates(
      'https://maps.app.goo.gl/aBcDeF',
      async () => 'https://maps.app.goo.gl/another',
    )).resolves.toBeNull();
    await expect(deriveTrustedPropertyCoordinates(
      'https://maps.app.goo.gl/aBcDeF',
      async () => null,
    )).resolves.toBeNull();
  });

  test('direct URL never triggers network expansion', async () => {
    const expander = jest.fn(async () => null);
    await expect(deriveTrustedPropertyCoordinates(
      'https://www.google.com/maps?q=33,131',
      expander,
    )).resolves.toEqual({ lat: 33, lng: 131 });
    expect(expander).not.toHaveBeenCalled();
  });
});

describe('backfill route safety contract (source only)', () => {
  const source = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const routeStart = source.indexOf("app.post('/api/admin/properties/:propertyNumber/derive-coordinates'");
  const routeEnd = source.indexOf("// 公開物件の座標を保存", routeStart);
  const route = source.slice(routeStart, routeEnd);

  test('authenticated and separate from the anonymous public route', () => {
    expect(routeStart).toBeGreaterThan(0);
    expect(routeEnd).toBeGreaterThan(routeStart);
    expect(route).toContain('requireStaffOrMachine, async (req, res)');
    expect(source).toContain("app.post('/api/public/properties/:propertyNumber/save-coordinates', async (req, res)");
  });

  test('derives from persisted URL and rejects overwrites and races', () => {
    expect(route).toContain('.select(\'property_number, google_map_url, latitude, longitude\')');
    expect(route).toContain('deriveTrustedPropertyCoordinates(property.google_map_url)');
    expect(route).toContain('.eq(\'google_map_url\', property.google_map_url)');
    expect(route).toContain('.is(\'latitude\', null)');
    expect(route).toContain('.is(\'longitude\', null)');
    expect(route).toContain('.maybeSingle()');
    expect(route).not.toContain('req.body.latitude');
    expect(route).not.toContain('req.body.longitude');
    expect(route).not.toContain('req.body.coordinates');
  });
});
