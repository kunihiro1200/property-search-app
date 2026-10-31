/**
 * Offline regression: no production Express import, DB, HTTP, secret, or property data.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { classifyStoredMapUrl, isBackfillWriteEnabled, parseBackfillOptions } from '../src/utils/coordinateBackfillPolicy';
import { deriveTrustedPropertyCoordinates, parseTrustedGoogleMapCoordinates } from '../src/utils/trustedPropertyCoordinates';

describe('strict source validation', () => {
  test.each([
    ['https://maps.google.com/maps?q=33.2,131.4', 33.2, 131.4],
    ['https://www.google.com/maps/search/33.3,+131.5', 33.3, 131.5],
    ['https://www.google.com/maps/place/33.1,131.2', 33.1, 131.2],
    ['https://www.google.com/maps/place/example/data=!4m2!3d33.44!4d131.55', 33.44, 131.55],
  ])('accepts unambiguous Google Maps coordinates', (url, lat, lng) => {
    expect(parseTrustedGoogleMapCoordinates(url)).toEqual({ lat, lng });
  });
  test.each([
    'https://www.google.com/maps/@33.2,131.4,15z',
    'https://www.google.com/maps/place/example/@33.2,131.4,15z',
    'https://www.google.com/maps?q=92,130',
    'https://www.google.com/maps?q=33,181',
    'https://attacker.test/maps?q=33,131',
    'https://www.google.com.evil.test/maps?q=33,131',
    'http://www.google.com/maps?q=33,131',
    'https://www.google.com:8443/maps?q=33,131',
    'https://username:password@www.google.com/maps?q=33,131',
    'https://www.google.com/search?q=33,131',
  ])('rejects viewport-only, invalid or untrusted URLs', url => {
    expect(parseTrustedGoogleMapCoordinates(url)).toBeNull();
  });
  test('allows one mocked Google shortlink hop, not an arbitrary destination', async () => {
    const expander = jest.fn(async () => 'https://www.google.com/maps/place/test/data=!3d33.2!4d131.4');
    await expect(deriveTrustedPropertyCoordinates('https://maps.app.goo.gl/AbCdE12',expander))
      .resolves.toEqual({ lat:33.2,lng:131.4 });
    expect(expander).toHaveBeenCalledTimes(1);
    const bad = jest.fn(async () => 'https://attacker.test/maps?q=33,131');
    await expect(deriveTrustedPropertyCoordinates('https://maps.app.goo.gl/AbCdE12',bad)).resolves.toBeNull();
  });
  test('rejects shortlink host spoofing, invalid paths, and repeated links', async () => {
    const hop = jest.fn(async () => 'https://www.google.com/maps?q=33,131');
    for (const url of [
      'https://maps.app.goo.gl.evil.test/AbCd12',
      'http://maps.app.goo.gl/AbCd12',
      'https://maps.app.goo.gl:8443/AbCd12',
      'https://maps.app.goo.gl/AbCd12?tracking=1',
      'https://maps.app.goo.gl/AbCd12/extra',
    ]) {
      await expect(deriveTrustedPropertyCoordinates(url, hop)).resolves.toBeNull();
    }
    expect(hop).not.toHaveBeenCalled();
    await expect(deriveTrustedPropertyCoordinates('https://maps.app.goo.gl/AbCd12',
      async () => 'https://maps.app.goo.gl/Other12')).resolves.toBeNull();
  });
});

describe('preview-first policy', () => {
  test('default is read-only, no selected property', () => {
    expect(parseBackfillOptions({})).toEqual({ mode:'preview', limit:5, after:null, propertyNumbers:null });
  });
  test('writes require both deliberate request flags and exact IDs', () => {
    expect(parseBackfillOptions({execute:true})).toMatchObject({mode:'preview'});
    expect(parseBackfillOptions({execute:true,dryRun:true,propertyNumbers:['AA100']})).toMatchObject({mode:'preview'});
    expect(parseBackfillOptions({execute:true,dryRun:false,propertyNumbers:['AA100']}))
      .toEqual({mode:'execute',limit:1,after:null,propertyNumbers:['AA100']});
    expect(parseBackfillOptions({execute:true,dryRun:false})).toBeNull();
    expect(parseBackfillOptions({execute:true,dryRun:false,propertyNumbers:['AA100','AA101','AA102']})).toBeNull();
  });
  test.each([null,[],true,{limit:0},{limit:6},{limit:'2'},{after:'../etc'},{execute:'true'},{dryRun:'false'},
    {propertyNumbers:['../bad']},{propertyNumbers:['AA100','AA100']},{propertyNumbers:['AA100'],after:'AA2'},
    {execute:true,dryRun:false,propertyNumbers:['AA1'],limit:2}])
    ('rejects invalid options', value => expect(parseBackfillOptions(value)).toBeNull());
  test.each([[undefined,false],['false',false],['TRUE',false],['true',true]])
    ('write switch %s requires exact true', (value,expected) => {
      expect(isBackfillWriteEnabled(value)).toBe(expected);
    });
  test('classifies safe URLs without network', () => {
    expect(classifyStoredMapUrl('https://maps.app.goo.gl/AbCd12')).toBe('google_shortlink');
    expect(classifyStoredMapUrl('https://www.google.com/maps?q=33,131')).toBe('direct_coordinates');
    expect(classifyStoredMapUrl('https://www.google.com/maps/@33,131,15z')).toBe('unsupported');
    expect(classifyStoredMapUrl('https://maps.app.goo.gl.attacker.test/AbCd12')).toBe('unsupported');
    expect(classifyStoredMapUrl('https://maps.app.goo.gl/AbCd12?q=5')).toBe('unsupported');
  });
});
describe('route safety contract', () => {
  const api=readFileSync(resolve(__dirname,'../index.ts'),'utf8');
  const start=api.indexOf("app.post('/api/internal/coordinate-backfill', requireStaffOrMachine, async (req, res) => {");
  const end=api.indexOf('// 公開物件ページの座標キャッシュ',start);
  const route=api.slice(start,end);
  test('protected preview and distinct from public write route',()=>{
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(route).toContain('parseBackfillOptions(req.body)');
    expect(route).toContain("isBackfillWriteEnabled(process.env.PROPERTY_COORDINATE_BACKFILL_ENABLED)");
    expect(route).toContain("if (options.mode === 'preview') continue");
    expect(route).toContain('classifyStoredMapUrl(property.google_map_url)');
    expect(api).toContain("app.post('/api/public/properties/:propertyNumber/save-coordinates', async (req, res) => {");
  });
  test('writes only selected published property rows with unchanged trusted URL and empty coordinates',()=>{
    expect(route).toContain("query.in('property_number', options.propertyNumbers)");
    expect(route).toContain("COORDINATE_PUBLIC_STATUSES");
    expect(route).toContain(".eq('google_map_url', property.google_map_url)");
    expect(route).toContain(".is('latitude', null)");
    expect(route).toContain(".is('longitude', null)");
    expect(route).toContain(".maybeSingle()");
    expect(route).not.toContain('req.body.latitude');
    expect(route).not.toContain('req.body.longitude');
  });
});
