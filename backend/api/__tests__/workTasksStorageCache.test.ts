/**
 * No-network, no-secrets cache tests. The GoogleSheetsClient is NOT imported
 * or invoked. Tests use only fake snapshot loading functions.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { WorkTasksStorageCache } from '../src/utils/WorkTasksStorageCache';

describe('work-tasks storage URL cache', () => {
  test('coalesces different and same property lookups on a cold instance', async () => {
    let resolveLoad: (map: Map<string, string>) => void = () => undefined;
    const pendingLoad = new Promise<Map<string, string>>((resolve) => { resolveLoad = resolve; });
    const loader = jest.fn(() => pendingLoad);
    const cache = new WorkTasksStorageCache();

    const a = cache.lookup('AA101', loader);
    const b = cache.lookup('AA102', loader);
    const c = cache.lookup('AA101', loader);
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(1);

    resolveLoad(new Map([['AA101', 'https://example.test/a'], ['AA102', 'https://example.test/b']]));
    expect(await Promise.all([a, b, c])).toEqual([
      'https://example.test/a',
      'https://example.test/b',
      'https://example.test/a',
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test('preserves the existing 5-minute freshness TTL and caches misses', async () => {
    let tick = 1000;
    const now = () => tick;
    const cache = new WorkTasksStorageCache(300000, 60000, now);
    const loader = jest.fn(async () => new Map([['AA101', 'https://example.test/a']]));
    expect(await cache.lookup('AA101', loader)).toBe('https://example.test/a');
    expect(await cache.lookup('MISSING', loader)).toBeNull();
    tick += 299999;
    expect(await cache.lookup('AA101', loader)).toBe('https://example.test/a');
    expect(loader).toHaveBeenCalledTimes(1);
    tick += 2;
    expect(await cache.lookup('AA101', loader)).toBe('https://example.test/a');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test('suppresses retries for 60 seconds after an initial HTTP 429-like failure', async () => {
    let tick = 1000;
    const cache = new WorkTasksStorageCache(300000, 60000, () => tick);
    let calls = 0;
    const failing = jest.fn(async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error('fake quota exceeded'), { code: 429 });
      return new Map([['AA101', 'https://example.test/a']]);
    });

    expect(await cache.lookup('AA101', failing)).toBeNull();
    tick += 59999;
    expect(await cache.lookup('AA101', failing)).toBeNull();
    expect(failing).toHaveBeenCalledTimes(1);
    tick += 2;
    expect(await cache.lookup('AA101', failing)).toBe('https://example.test/a');
    expect(failing).toHaveBeenCalledTimes(2);
  });

  test('uses last good snapshot if a refresh encounters a quota failure', async () => {
    let tick = 1000;
    const cache = new WorkTasksStorageCache(300000, 60000, () => tick);
    let calls = 0;
    const loader = jest.fn(async () => {
      calls++;
      if (calls > 1) throw new Error('test-only failure');
      return new Map([['AA101', 'https://example.test/good']]);
    });

    expect(await cache.lookup('AA101', loader)).toBe('https://example.test/good');
    tick += 300001;
    expect(await cache.lookup('AA101', loader)).toBe('https://example.test/good');
    expect(await cache.lookup('MISSING', loader)).toBeNull();
    expect(loader).toHaveBeenCalledTimes(2);
    tick += 59999;
    expect(await cache.lookup('AA101', loader)).toBe('https://example.test/good');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test('concurrent failed loads produce a single attempt and one cooldown', async () => {
    const cache = new WorkTasksStorageCache();
    const loader = jest.fn(async (): Promise<Map<string, string>> => { throw Error('simulated'); });
    const results = await Promise.all([
      cache.lookup('AA101', loader),
      cache.lookup('AA102', loader),
      cache.lookup('AA103', loader),
    ]);
    expect(results).toEqual([null, null, null]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(await cache.lookup('AA101', loader)).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe('PropertyListingService integration contract', () => {
  const service = readFileSync(resolve(__dirname, '../src/services/PropertyListingService.ts'), 'utf8');
  const start = service.indexOf('private async getStorageUrlFromWorkTasks(propertyNumber: string): Promise<string | null>');
  const end = service.indexOf('  /**\n   * 物件の追加詳細情報を取得（property_detailsテーブルから）', start);
  const fn = service.slice(start, end);

  test('one cache per service instance wraps the existing Sheet lookup', () => {
    expect(service).toContain("import { WorkTasksStorageCache } from '../utils/WorkTasksStorageCache.js';");
    expect(service).toContain('private readonly workTasksStorageCache = new WorkTasksStorageCache();');
    expect(fn).toContain('return this.workTasksStorageCache.lookup(propertyNumber, async () => {');
    expect(fn).toContain('await client.authenticate()');
    expect(fn).toContain('const rows = await client.readAll()');
    expect(fn).toContain("row['物件番号']");
    expect(fn).toContain("row['格納先URL']");
  });

  test('no property data mutation, storage URL or raw Sheets error logged', () => {
    expect(start).toBeGreaterThan(0);
    expect(fn).not.toContain("supabase.from(");
    expect(fn).not.toContain('.update(');
    expect(fn).not.toContain('console.error(');
    expect(fn).not.toContain('console.log(');
    expect(fn).toContain('return urls;');
  });
});
