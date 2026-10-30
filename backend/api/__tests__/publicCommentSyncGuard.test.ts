/**
 * No-network, no-credentials regression tests for anonymous public comment
 * refresh. The Express application, Supabase and Google APIs are not imported.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createPublicCommentSyncLimiter,
  filterPublicRecommendedComments,
  needsPublicCommentSync,
} from '../src/utils/publicCommentSyncGuard';

describe('compatibility with GET /complete missing-comments detection', () => {
  test.each([
    [null, null, true],
    ['', [], true],
    ['Saved favorite', [], true],
    ['', ['Comment'], false],
    ['Saved favorite', ['Comment'], false],
    ['Saved favorite', [['Comment']], false],
  ])('only considers non-empty source data complete', (favorite, recommended, expected) => {
    expect(needsPublicCommentSync(favorite, recommended)).toBe(expected);
  });
});

describe('public recommended comment redaction', () => {
  test('removes internal notes but retains normal public comments', () => {
    expect(filterPublicRecommendedComments([
      ' 駅近の土地です ',
      '←担当者向け',
      ['←', '社内用'],
      '一般媒介で、担当もついている場合は確認',
      '＼内覧前伝達事項／',
      ['日当たり', '良好'],
    ])).toEqual([
      ' 駅近の土地です ',
      ['日当たり', '良好'],
    ]);
  });

  test.each([null, undefined, {}, '', false])('rejects non-array payloads', (input) => {
    expect(filterPublicRecommendedComments(input)).toEqual([]);
  });
});

describe('per-instance repeated-sync protection', () => {
  test('shares an in-flight sync and prevents a duplicate Sheets read', async () => {
    const limiter = createPublicCommentSyncLimiter();
    let release: (value: boolean) => void = () => undefined;
    const inFlight = new Promise<boolean>((resolve) => { release = resolve; });
    let calls = 0;
    const first = limiter('AA-101', () => { calls++; return inFlight; });
    const second = limiter('AA-101', async () => { calls++; return false; });
    await Promise.resolve();
    expect(calls).toBe(1);
    release(true);
    expect(await first).toEqual({ status: 'completed', success: true });
    expect(await second).toEqual({ status: 'shared', success: true });
    expect(calls).toBe(1);
  });

  test('throttles repeated calls for five minutes after success', async () => {
    let tick = 100_000;
    const now = () => tick;
    const limiter = createPublicCommentSyncLimiter();
    let calls = 0;
    const sync = async () => { calls++; return true; };
    expect(await limiter('AA-102', sync, now)).toEqual({ status: 'completed', success: true });
    tick += 1_000;
    expect(await limiter('AA-102', sync, now)).toEqual({ status: 'throttled', success: false });
    tick += 300_000;
    expect(await limiter('AA-102', sync, now)).toEqual({ status: 'completed', success: true });
    expect(calls).toBe(2);
  });

  test('fails closed for rejected syncs with a short cooldown', async () => {
    let tick = 100_000;
    const limiter = createPublicCommentSyncLimiter();
    const now = () => tick;
    const result = await limiter('AA-103', async () => { throw Error('test error'); }, now);
    expect(result).toEqual({ status: 'completed', success: false });
    expect(await limiter('AA-103', async () => true, now)).toEqual({ status: 'throttled', success: false });
    tick += 60_001;
    expect(await limiter('AA-103', async () => true, now)).toEqual({ status: 'completed', success: true });
  });

  test('keeps independent property IDs separate', async () => {
    const limiter = createPublicCommentSyncLimiter();
    expect(await limiter('AA-104', async () => true)).toEqual({ status: 'completed', success: true });
    expect(await limiter('FI-104', async () => true)).toEqual({ status: 'completed', success: true });
  });

  test('bounds map size and refuses new jobs when all slots are occupied', async () => {
    const limiter = createPublicCommentSyncLimiter(300_000, 60_000, 1);
    let release: (value: boolean) => void = () => undefined;
    const first = limiter('AA-105', () => new Promise<boolean>((resolve) => { release = resolve; }));
    const second = await limiter('AA-106', async () => true);
    expect(second).toEqual({ status: 'throttled', success: false });
    release(true);
    expect(await first).toEqual({ status: 'completed', success: true });
  });
});

describe('anonymous comment route source contract', () => {
  const index = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const begin = index.indexOf("app.post('/api/public/properties/:id/sync-comments', (req, res, next) => {");
  const end = index.indexOf('// 物件番号ベースの画像一覧取得エンドポイント', begin);
  const route = index.slice(begin, end);
  const oita = readFileSync(resolve(__dirname, '../../../frontend/src/pages/PublicPropertyDetailPage.tsx'), 'utf8');
  const kujira = readFileSync(resolve(__dirname, '../../../frontend/src/pages/KujiraPropertyDetailPage.tsx'), 'utf8');

  test('skips Sheets and DB writes for comments that are already present', () => {
    expect(begin).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(begin);
    expect(route.indexOf('if (!needsPublicCommentSync(')).toBeLessThan(route.indexOf('new AthomeSheetSyncService()'));
    expect(route).toContain('runLimitedPublicCommentSync(');
    expect(route).toContain("attempt.status === 'throttled'");
  });

  test('applies redaction for both cache hits and fresh sync results', () => {
    expect((route.match(/recommendedComments: filterPublicRecommendedComments\(/g) || []).length).toBe(2);
    expect((route.match(/propertyAbout: null/g) || []).length).toBe(2);
    expect(route).not.toContain('recommendedComments: updatedDetails.recommended_comments,');
    expect(route).not.toContain('error.message');
  });

  test('GET /complete redacts nested raw property_details as well as top-level comments', () => {
    const getBegin = index.indexOf("app.get('/api/public/properties/:id/complete', async (req, res) => {");
    const getEnd = index.indexOf("app.post('/api/public/properties/:id/sync-comments'", getBegin);
    expect(getBegin).toBeGreaterThan(0);
    expect(getEnd).toBeGreaterThan(getBegin);
    const getComplete = index.slice(getBegin, getEnd);
    expect(getComplete).toContain('property_about: null,');
    expect(getComplete).toContain('recommended_comments: filterPublicRecommendedComments(property.recommended_comments)');
    expect(getComplete).toContain('recommendedComments: filterPublicRecommendedComments(dbDetails.recommended_comments)');
    expect(getComplete).toContain('propertyAbout: null');
    expect(getComplete).not.toContain('recommendedComments: dbDetails.recommended_comments,');
  });

  test('preserves both public pages and panorama synchronization', () => {
    expect(oita).toContain("publicApi.post(\`/api/public/properties/\${id}/sync-comments\`)");
    expect(kujira).toContain("publicApi.post(\`/api/public/properties/\${id}/sync-comments\`)");
    expect(route).toContain('athomeData: updatedDetails.athome_data');
    expect(route).toContain('athomeData: property.athome_data');
    expect(index).toContain("app.get('/api/public/properties/:id/complete', async (req, res) => {");
  });
});
