/**
 * No-Sheets / no-Supabase / no-secret tests for a staged private comment
 * backfill API. The real Express entrypoint is NEVER imported or executed.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parseCommentBackfillOptions,
  isCommentBackfillWriteEnabled,
  propertyNeedsCommentBackfill,
  PUBLIC_COMMENT_BACKFILL_STATUSES,
} from '../src/utils/commentBackfillPolicy';

describe('private comment backfill request policy', () => {
  it('defaults to a two-item read-only preview', () => {
    expect(parseCommentBackfillOptions({})).toEqual({ mode: 'preview', limit: 2, after: null });
    expect(parseCommentBackfillOptions({ dryRun: false })).toEqual({ mode: 'preview', limit: 2, after: null });
    expect(parseCommentBackfillOptions({ execute: true })).toEqual({ mode: 'preview', limit: 2, after: null });
    expect(parseCommentBackfillOptions({ execute: true, dryRun: true })).toEqual({ mode: 'preview', limit: 2, after: null });
    expect(parseCommentBackfillOptions({ execute: false, dryRun: false })).toEqual({ mode: 'preview', limit: 2, after: null });
  });

  it('only permits write-mode for two unambiguous flags', () => {
    expect(parseCommentBackfillOptions({ execute: true, dryRun: false })).toEqual({
      mode: 'execute', limit: 2, after: null,
    });
    expect(parseCommentBackfillOptions({
      execute: true, dryRun: false, limit: 1, after: 'FI1381',
    })).toEqual({ mode: 'execute', limit: 1, after: 'FI1381' });
  });

  test.each([
    null, undefined, 5, [], 'hi',
    { limit: 0 }, { limit: 3 }, { limit: 500 }, { limit: '2' }, { limit: 1.5 }, { limit: NaN },
    { after: '' }, { after: '../secrets' }, { after: 'AA 102' },
    { execute: 'true' }, { dryRun: 'false' }, { execute: 1, dryRun: false },
  ])('rejects malformed input without falling into execute mode', (invalid) => {
    expect(parseCommentBackfillOptions(invalid)).toBeNull();
  });

  test.each([
    [undefined, false], ['', false], ['false', false],
    ['TRUE', false], ['1', false], ['true', true],
  ])('only exact server-side flag %s enables writing', (raw, expected) => {
    expect(isCommentBackfillWriteEnabled(raw)).toBe(expected);
  });
});

describe('backfill candidacy', () => {
  it('matches the existing frontend missing-comments definition', () => {
    expect(propertyNeedsCommentBackfill(null)).toBe(true);
    expect(propertyNeedsCommentBackfill(undefined)).toBe(true);
    expect(propertyNeedsCommentBackfill({ favorite_comment: null, recommended_comments: null })).toBe(true);
    expect(propertyNeedsCommentBackfill({ favorite_comment: 'Text', recommended_comments: [] })).toBe(true);
    expect(propertyNeedsCommentBackfill({ favorite_comment: '', recommended_comments: ['One'] })).toBe(true);
    expect(propertyNeedsCommentBackfill({ favorite_comment: 'Ready', recommended_comments: ['One'] })).toBe(false);
  });

  it('scans only explicitly public listing statuses', () => {
    expect(PUBLIC_COMMENT_BACKFILL_STATUSES).toEqual(['専任・公開中', '一般・公開中', '公開中']);
  });
});

describe('private backfill implementation contract', () => {
  const index = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const routeStart = index.indexOf("app.post('/api/internal/comment-backfill-batch', requireStaffOrMachine");
  const routeEnd = index.indexOf('// コメントデータをAthomeシートから同期（非同期トリガー用）', routeStart);
  const route = index.slice(routeStart, routeEnd);

  it('requires staff or machine auth and scans at most two public non-hidden properties', () => {
    expect(routeStart).toBeGreaterThan(0);
    expect(routeEnd).toBeGreaterThan(routeStart);
    expect(route).toContain("parseCommentBackfillOptions(req.body)");
    expect(route).toContain(".eq('is_hidden', false)");
    expect(route).toContain(".in('atbb_status', PUBLIC_COMMENT_BACKFILL_STATUSES)");
    expect(route).toContain(".limit(options.limit + 1)");
    expect(route).toContain(".order('property_number', { ascending: true })");
  });

  it('never synchronizes comments in preview and requires an explicit server toggle for execution', () => {
    expect(route).toContain('options.mode === \'execute\' && !mayExecute');
    expect(route).toContain("process.env.COMMENT_BACKFILL_EXECUTION_ENABLED");
    expect(route).toContain("if (options.mode === 'preview') continue;");
    expect(route.indexOf("if (options.mode === 'preview') continue;")).toBeLessThan(route.indexOf('new AthomeSheetSyncService()'));
    expect(route).toContain("return res.status(failed ? 502 : 200)");
  });

  it('returns counts and cursor only, never comment texts or storage URLs', () => {
    expect(route).toContain(".select('favorite_comment, recommended_comments')");
    expect(route).not.toContain('res.json({ candidateRows');
    expect(route).not.toContain('recommendedComments: ');
    expect(route).not.toContain('athomeData: ');
    expect(route).not.toContain('propertyAbout: ');
    expect(route).toContain('nextCursor');
  });

  it('does not change the legacy anonymous comment endpoint before its replacement is proven', () => {
    expect(index).toContain("app.post('/api/public/properties/:id/sync-comments', async (req, res) => {");
    expect(index).toContain("app.get('/api/public/properties/:id/complete', async (req, res) => {");
  });
});
