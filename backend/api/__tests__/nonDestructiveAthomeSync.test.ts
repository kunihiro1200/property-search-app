/**
 * Offline-only regression tests. No Supabase client, Google Sheets, or Express
 * service is imported, and no production database request is issued.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createNonDestructiveAthomePatch, AthomeSourceSnapshot } from '../src/utils/nonDestructiveAthomeSync';

const source = (favoriteComment: string | null, recommendedComments: string[], panoramaUrl: string | null): AthomeSourceSnapshot => ({
  favoriteComment, recommendedComments, panoramaUrl,
});
const drive = 'https://drive.google.com/drive/folders/test123';
const panorama = 'https://vrpanorama.athome.jp/test123';
const otherPanorama = 'https://vrpanorama.athome.jp/test456';

describe('blank Athome source values do not destroy existing records', () => {
  test.each([
    [null, [], null],
    ['', [], ''],
    ['   ', ['  ', ''], null],
  ])('empty optional cells yield no write patch (%s, %j, %s)', (favorite, recommended, pan) => {
    expect(createNonDestructiveAthomePatch(source(favorite, recommended, pan), [drive, panorama])).toEqual({});
  });

  test('a valid favorite alone only updates the favorite column', () => {
    expect(createNonDestructiveAthomePatch(source('New favorite', [], null), [drive, panorama]))
      .toEqual({ favorite_comment: 'New favorite' });
  });

  test('valid recommendations alone do not clear favorite, panorama, or Drive URL', () => {
    expect(createNonDestructiveAthomePatch(source(null, ['New comment'], null), [drive, panorama]))
      .toEqual({ recommended_comments: ['New comment'] });
  });

  test('ignores empty recommendation entries without clearing other fields', () => {
    expect(createNonDestructiveAthomePatch(source('', ['Good location', '', '   '], ''), []))
      .toEqual({ recommended_comments: ['Good location'] });
  });

  test('writes populated favorite and recommended comments', () => {
    expect(createNonDestructiveAthomePatch(source('New favorite', ['New comment'], null), [drive]))
      .toEqual({ favorite_comment: 'New favorite', recommended_comments: ['New comment'] });
  });
});

describe('panorama update never removes unknown legacy metadata', () => {
  test('writes panorama to previously empty data', () => {
    expect(createNonDestructiveAthomePatch(source(null, [], panorama), null))
      .toEqual({ athome_data: [panorama] });
  });

  test('keeps the existing Drive folder while adding panorama', () => {
    expect(createNonDestructiveAthomePatch(source(null, [], panorama), [drive]))
      .toEqual({ athome_data: [drive, panorama] });
  });

  test('does not update already-stored panorama URL', () => {
    expect(createNonDestructiveAthomePatch(source(null, [], panorama), [drive, panorama]))
      .toEqual({});
  });

  test('replaces only a recognized panorama while retaining all other values', () => {
    const metadata = 'opaque-internal-metadata';
    expect(createNonDestructiveAthomePatch(source(null, [], otherPanorama), [drive, panorama, metadata]))
      .toEqual({ athome_data: [drive, otherPanorama, metadata] });
  });

  test('replaces a single recognized panorama', () => {
    expect(createNonDestructiveAthomePatch(source(null, [], otherPanorama), [panorama]))
      .toEqual({ athome_data: [otherPanorama] });
  });

  test.each([
    [[drive, 'unknown-link']],
    [['unknown-legacy-record']],
    [['unknown', 'opaque', panorama]],
    [{ custom: 'old value' }],
  ])('does not alter an unknown existing shape (%j)', (existing) => {
    expect(createNonDestructiveAthomePatch(source(null, ['New public comment'], panorama), existing))
      .toEqual({ recommended_comments: ['New public comment'] });
  });

  test('a blank source panorama never erases a stored Drive link or legacy array', () => {
    expect(createNonDestructiveAthomePatch(source(null, [], null), [drive, 'opaque']))
      .toEqual({});
  });
});

describe('Athome sync DB write contract', () => {
  const service = readFileSync(resolve(__dirname, '../src/services/AthomeSheetSyncService.ts'), 'utf8');
  const details = readFileSync(resolve(__dirname, '../src/services/PropertyDetailsService.ts'), 'utf8');
  const start = details.indexOf('async syncAthomeSnapshotNonDestructively(');
  const end = details.indexOf('async upsertPropertyDetails(', start);
  const method = details.slice(start, end);
  const index = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');

  test('Google Sheets sync uses the fail-closed partial-write method', () => {
    expect(service).toContain('this.propertyDetailsService.syncAthomeSnapshotNonDestructively(');
    expect(service).not.toContain('athome_data: athomeData,');
    expect(service).not.toContain('const athomeData = comments.panoramaUrl ? [comments.panoramaUrl] : [];');
  });

  test('DB read errors stop the sync before any update', () => {
    expect(start).toBeGreaterThan(0);
    expect(method).toContain('.select(\'property_number, athome_data\')');
    expect(method).toContain('if (readError)');
    expect(method).toContain('return false;');
    expect(method.indexOf('if (readError)')).toBeLessThan(method.indexOf('.update(patch)'));
  });

  test('existing DB rows are changed with partial UPDATE rather than upsert', () => {
    expect(method).toContain('.update(patch)');
    expect(method).toContain('.eq(\'property_number\', propertyNumber)');
    expect(method).toContain('insert({ property_number: propertyNumber, ...patch })');
    expect(method).not.toContain('this.upsertPropertyDetails(');
    expect(method).not.toContain('.upsert(');
    expect(method).toContain('if (Object.keys(patch).length === 0)');
  });

  test('the public detail needsSync check shares the same helper as POST', () => {
    expect(index).toContain('const needsSync = needsPublicCommentSync(');
    expect(index).toContain('if (!needsPublicCommentSync(property.favorite_comment, property.recommended_comments))');
  });

  test('only source fields are updated and other content is not changed', () => {
    expect(method).not.toContain('property_about:');
    expect(method).not.toContain('console.log(req.body)');
  });
});
