/**
 * Source-only/no-network regression tests for distribution_date conversion.
 * These tests must never call Supabase, Google Sheets or production APIs.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseDistributionDate } from '../src/utils/parseDistributionDate';

describe('parseDistributionDate - valid PostgreSQL DATE strings', () => {
  const cases: Array<[unknown, string]> = [
    ['2024/9/19（配信のみ）', '2024-09-19'],
    ['2024/3/21以降月イチ配信のみ', '2024-03-21'],
    ['2024/9/15予定', '2024-09-15'],
    ['2026/2/28', '2026-02-28'],
    ['2024/2/29', '2024-02-29'],
    ['2024-09-19', '2024-09-19'],
    ['2026/9/1', '2026-09-01'],
    ['2024/09/19 12:00', '2024-09-19'],
    ['  2024/09/19  ', '2024-09-19'],
    ['2025-12-31', '2025-12-31'],
    ['2000/2/29', '2000-02-29'],
  ];

  test.each(cases)('normalizes %s to %s', (input, expected) => {
    expect(parseDistributionDate(input)).toBe(expected);
  });
});

describe('parseDistributionDate - no invalid dates reach PostgreSQL', () => {
  const bad: unknown[] = [
    null, undefined, '', '   ', 0,
    'なし', '不要', '非公開', '未定（買付入る？）', '--',
    '8/9媒介作成済', '10/28媒介作成済', '6/16', '9/16',
    '2024/13/1', '2024/0/1', '2024/2/30',
    '2023/2/29', '2024/9/31', '2024/9/190',
    '2024/9/0', '0000/1/1', '2024/1/999',
    'abc 2024/9/19', '2024/09/1900abc',
  ];

  test.each(bad)('rejects invalid input %s', (input) => {
    expect(parseDistributionDate(input)).toBeNull();
  });
});

describe('PropertyListingSyncService uses the normalized date consistently', () => {
  const source = readFileSync(
    resolve(__dirname, '../src/services/PropertyListingSyncService.ts'), 'utf8'
  );
  test('all three scheduled/full-sync paths use the shared normalized parser', () => {
    expect(source).toContain("import { parseDistributionDate } from '../utils/parseDistributionDate';");
    expect((source.match(/parseDistributionDate\(/g) || []).length).toBe(3);
    expect(source).not.toContain('function parseDistributionDate(');
    expect(source).not.toContain('const datePattern =');
  });
});
