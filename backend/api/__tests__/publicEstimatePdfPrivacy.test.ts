/**
 * Offline regression tests: synthetic property data only.
 * Do not import the production API, access Sheets, or call Supabase.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { toPublicEstimateData } from '../src/utils/publicEstimateData';

const apiSource = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
const routeStart = apiSource.indexOf("app.post('/api/public/properties/:propertyNumber/estimate-pdf',");
const routeEnd = apiSource.indexOf('// パノラマURL取得（物件番号で取得）', routeStart);
if (routeStart < 0 || routeEnd <= routeStart) {
  throw new Error('Estimate PDF route not found');
}
const route = apiSource.slice(routeStart, routeEnd);
const pdfService = readFileSync(
  resolve(__dirname, '../src/services/EstimatePdfService.ts'), 'utf8'
);

describe('public estimate PDF data minimization', () => {
  test('prefers masked display address over the real location', () => {
    expect(toPublicEstimateData({
      property_number: 'FI100',
      display_address: '福岡市中央区（詳細非公開）',
      address: '非公開の具体的な住所',
      property_type: 'apartment',
      sales_price: 35000000,
    })).toEqual({
      propertyNumber: 'FI100',
      propertyName: '福岡市中央区（詳細非公開）',
      propertyType: 'マンション',
      price: 35000000,
    });
  });

  test('uses the same public-detail address fallback when display address is absent', () => {
    expect(toPublicEstimateData({
      property_number: 'AA100', address: '大分市内の公開住所',
      property_type: 'land', listing_price: 12000000,
    }).propertyName).toBe('大分市内の公開住所');
  });

  test('uses a generic identifier if neither address is present', () => {
    expect(toPublicEstimateData({ property_number: 'AA100' }).propertyName).toBe('AA100');
  });

  test('prefers the public detail sales price when populated', () => {
    expect(toPublicEstimateData({
      property_number: 'FI200', sales_price: 39000000, listing_price: 41000000,
    }).price).toBe(39000000);
  });

  test('falls back to listing price when sales price is absent or zero', () => {
    for (const sales_price of [null, undefined, 0]) {
      expect(toPublicEstimateData({
        property_number: 'AA200', sales_price, listing_price: 25000000,
      }).price).toBe(25000000);
    }
  });

  test('does not generate invalid or negative loan calculation inputs', () => {
    for (const bad of ['NaN', 'Infinity', -15000000]) {
      expect(toPublicEstimateData({ property_number: 'AA300', sales_price: bad }).price).toBe(0);
    }
    expect(toPublicEstimateData({ property_number: 'AA301' }).price).toBe(0);
  });

  test.each([
    ['apartment', 'マンション'],
    ['detached_house', '戸建'],
    ['land', '土地'],
    ['income', '収益物件'],
    ['commercial', '事業用'],
    ['マンション', 'マンション'],
  ])('keeps the expected PDF property type for %s', (input, expected) => {
    expect(toPublicEstimateData({ property_number: 'AA123', property_type: input }).propertyType)
      .toBe(expected);
  });

  test('only uses public-detail listing fields and excludes hidden rows', () => {
    expect(route).toContain(".from('property_listings')");
    expect(route).toContain(".eq('property_number', propertyNumber)");
    expect(route).toContain(".eq('is_hidden', false)");
    expect(route).toContain(".maybeSingle()");
    expect(route).toContain("display_address, address, property_type, sales_price, listing_price");
    expect(route).not.toContain('GoogleSheetsClient');
    expect(route).not.toContain('readRange(');
    expect(route).not.toContain('findRowByColumn(');
    expect(route).not.toContain("atbb_status',");
  });

  test('does not expose raw error details or unvalidated filenames', () => {
    expect(route).toContain("if (!/^[A-Za-z0-9_-]{1,64}$/.test(propertyNumber))");
    expect(route).toContain("res.status(400)");
    expect(route).toContain("res.status(404)");
    expect(route).toContain("console.error('[Estimate PDF] Generation failed')");
    expect(route).not.toContain('details: error');
    expect(route).not.toContain('error.message');
    expect(route).not.toContain('Object.keys(');
  });

  test('preserves public button response contract and disables caching', () => {
    expect(route).toContain("res.setHeader('Content-Type', 'application/pdf')");
    expect(route).toContain("res.setHeader('Content-Disposition'");
    expect(route).toContain("res.setHeader('Cache-Control', 'no-store')");
    expect(route).toContain('res.send(pdfBuffer)');
    expect(route).toContain('generateEstimatePdfBuffer(toPublicEstimateData(property))');
    expect(pdfService).toContain('export async function generateEstimatePdfBuffer(');
    expect(pdfService).toContain("const isFiProperty = isFI(propertyNumber)");
  });
});
