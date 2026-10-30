/**
 * Zero-network / zero-credential regression tests for the incremental
 * comment-sync cutover. The production app is never imported or started.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parseCommentBackfillOptions,
  isAnonymousCommentSyncDisabled,
  isCommentBackfillWriteEnabled,
  isTrustedCommentSourceLink,
  propertyNeedsCommentBackfill,
  PUBLIC_COMMENT_BACKFILL_STATUSES,
} from '../src/utils/commentBackfillPolicy';

const preview = { mode: 'preview', limit: 2, after: null, propertyNumbers: null };

describe('private comment backfill request policy', () => {
  test.each([
    [{}],
    [{ dryRun: false }],
    [{ execute: true }],
    [{ execute: true, dryRun: true }],
    [{ execute: false, dryRun: false }],
  ])('defaults to read-only preview (input %o)', (input) => {
    expect(parseCommentBackfillOptions(input)).toEqual(preview);
  });

  test('only permits explicit selected public IDs in write-mode', () => {
    expect(parseCommentBackfillOptions({
      execute: true, dryRun: false, propertyNumbers: ['FI1381'],
    })).toEqual({ mode: 'execute', limit: 2, after: null, propertyNumbers: ['FI1381'] });
    expect(parseCommentBackfillOptions({
      execute: true, dryRun: false, limit: 2, propertyNumbers: ['AA13840', 'FI1381'],
    })).toEqual({
      mode: 'execute', limit: 2, after: null, propertyNumbers: ['AA13840', 'FI1381'],
    });
    expect(parseCommentBackfillOptions({
      propertyNumbers: ['FI1381'], after: null, limit: 1,
    })).toEqual({ mode: 'preview', limit: 1, after: null, propertyNumbers: ['FI1381'] });
  });

  test.each([
    null, undefined, 5, [], 'hi',
    { limit: 0 }, { limit: 3 }, { limit: 500 }, { limit: '2' },
    { limit: 1.5 }, { limit: NaN },
    { after: '' }, { after: '../secrets' }, { after: 'AA 102' },
    { execute: 'true' }, { dryRun: 'false' }, { execute: 1, dryRun: false },
    { execute: true, dryRun: false },
    { execute: true, dryRun: false, propertyNumbers: [] },
    { execute: true, dryRun: false, propertyNumbers: ['FI1381', 'FI1381'] },
    { execute: true, dryRun: false, propertyNumbers: ['FI1381', 'FI1298', 'FI1247'] },
    { execute: true, dryRun: false, limit: 1, propertyNumbers: ['FI1381', 'FI1298'] },
    { execute: true, dryRun: false, propertyNumbers: ['FI1381'], after: 'AA13840' },
    { execute: true, dryRun: false, propertyNumbers: ['/etc/passwd'] },
    { execute: true, dryRun: false, propertyNumbers: ['FI 1381'] },
    { execute: true, dryRun: false, propertyNumbers: 123 },
  ])('rejects malformed or unbounded requests %o', (input) => {
    expect(parseCommentBackfillOptions(input)).toBeNull();
  });

  test.each([
    [undefined, false], ['', false], ['false', false], ['TRUE', false],
    ['1', false], ['true', true],
  ])('write flag only true for exact %s', (raw, expected) => {
    expect(isCommentBackfillWriteEnabled(raw)).toBe(expected);
  });

  test.each([
    [undefined, false], ['', false], ['false', false], ['TRUE', false],
    ['1', false], ['true', true],
  ])('anonymous sync cutoff only true for exact %s', (raw, expected) => {
    expect(isAnonymousCommentSyncDisabled(raw)).toBe(expected);
  });
});

describe('trusted individual comment source URL', () => {
  test.each([
    'https://docs.google.com/spreadsheets/d/1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g/edit',
    'https://docs.google.com/spreadsheets/d/1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
    ' https://docs.google.com/spreadsheets/d/1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g/edit#gid=5 ',
  ])('recognizes a Google spreadsheet source', (url) => {
    expect(isTrustedCommentSourceLink(url)).toBe(true);
  });
  test.each([
    undefined, null, 123, '', 'http://docs.google.com/spreadsheets/d/abcde12345',
    'https://docs.google.com.evil.test/spreadsheets/d/abcde12345',
    'https://evil.test/spreadsheets/d/abcde12345',
    'https://user:pass@docs.google.com/spreadsheets/d/abcde12345',
    'https://docs.google.com:8080/spreadsheets/d/abcde12345',
    'https://docs.google.com/spreadsheets/d/short',
    'https://docs.google.com/document/d/abcde12345/edit',
    'https://docs.google.com/spreadsheets/d/abcde12345.bad/edit',
    'javascript:alert(1)',
  ])('rejects untrusted non-sheet sources %o', (value) => {
    expect(isTrustedCommentSourceLink(value)).toBe(false);
  });
});

describe('comment backfill candidacy', () => {
  it('internal staff backfill still detects missing favorite while public auto-sync does not', () => {
    expect(propertyNeedsCommentBackfill(null)).toBe(true);
    expect(propertyNeedsCommentBackfill(undefined)).toBe(true);
    expect(propertyNeedsCommentBackfill({ favorite_comment: null, recommended_comments: null })).toBe(true);
    expect(propertyNeedsCommentBackfill({ favorite_comment: 'Text', recommended_comments: [] })).toBe(true);
    expect(propertyNeedsCommentBackfill({ favorite_comment: '', recommended_comments: ['One'] })).toBe(true);
    expect(propertyNeedsCommentBackfill({ favorite_comment: 'Ready', recommended_comments: ['One'] })).toBe(false);
  });
  it('scans only explicitly public statuses', () => {
    expect(PUBLIC_COMMENT_BACKFILL_STATUSES).toEqual(['専任・公開中', '一般・公開中', '公開中']);
  });
});

describe('private internal API and anonymous cutoff contracts', () => {
  const index = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const routeStart = index.indexOf("app.post('/api/internal/comment-backfill-batch', requireStaffOrMachine");
  const routeEnd = index.indexOf('// コメントデータをAthomeシートから同期（非同期トリガー用）', routeStart);
  const internal = index.slice(routeStart, routeEnd);
  const publicStart = index.indexOf("app.post('/api/public/properties/:id/sync-comments', (req, res, next) => {");
  const publicEnd = index.indexOf('// 物件番号ベースの画像一覧取得エンドポイント', publicStart);
  const publicRoute = index.slice(publicStart, publicEnd);

  it('requires staff or machine auth and a public property filter', () => {
    expect(routeStart).toBeGreaterThan(0);
    expect(routeEnd).toBeGreaterThan(routeStart);
    expect(internal).toContain("parseCommentBackfillOptions(req.body)");
    expect(internal).toContain(".eq('is_hidden', false)");
    expect(internal).toContain(".in('atbb_status', PUBLIC_COMMENT_BACKFILL_STATUSES)");
    expect(internal).toContain(".limit(options.limit + 1)");
    expect(internal).toContain(".in('property_number', options.propertyNumbers)");
  });

  it('requires server opt-in, explicit IDs and a recognized per-property source before writes', () => {
    expect(internal).toContain("process.env.COMMENT_BACKFILL_EXECUTION_ENABLED");
    expect(internal).toContain("if (options.mode === 'execute' && !mayExecute)");
    expect(internal).toContain(".from('work_tasks')");
    expect(internal).toContain(".select('spreadsheet_url')");
    expect(internal).toContain("isTrustedCommentSourceLink(workTask?.spreadsheet_url)");
    expect(internal).toContain("if (options.mode === 'preview') continue;");
    expect(internal.indexOf("if (options.mode === 'preview') continue;")).toBeLessThan(internal.indexOf("new AthomeSheetSyncService()"));
    expect(internal).toContain('return service.syncPropertyCommentsFromTrustedSource(');
  });

  it('returns counts only and never confidential URLs or comments', () => {
    expect(internal).toContain("nextCursor");
    expect(internal).toContain("missingTrustedSource");
    expect(internal).toContain("notPublicOrNotFound");
    expect(internal).not.toContain('recommendedComments: ');
    expect(internal).not.toContain('athomeData: ');
    expect(internal).not.toContain('propertyAbout: ');
  });

  it('keeps anonymous public page behavior unchanged until cutover explicitly enabled', () => {
    expect(publicStart).toBeGreaterThan(0);
    expect(publicEnd).toBeGreaterThan(publicStart);
    expect(publicRoute).toContain("isAnonymousCommentSyncDisabled(process.env.PUBLIC_COMMENT_SYNC_DISABLED)");
    expect(publicRoute).toContain("return res.status(403)");
    expect(publicRoute).toContain("next();");
    expect(publicRoute).toContain("app.post('/api/public/properties/:id/sync-comments', (req, res, next) => {");
    expect(publicRoute).toContain('return athomeSheetSyncService.syncPropertyCommentsFromTrustedSource(');
    expect(index).toContain("app.get('/api/public/properties/:id/complete', async (req, res) => {");
  });
});
