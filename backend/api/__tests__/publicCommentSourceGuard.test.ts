/**
 * Source-only, offline checks for visitor-triggered Athome sync.
 * The Express app, DB, Google Sheets and any credentials are never imported.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { isTrustedCommentSourceLink } from '../src/utils/commentBackfillPolicy';

describe('trusted public comment source predicate', () => {
  test.each([
    ['https://docs.google.com/spreadsheets/d/abcde12345/edit', true],
    ['https://docs.google.com/spreadsheets/d/abcde12345', true],
    [' https://docs.google.com/spreadsheets/d/abcde12345/edit#gid=0 ', true],
    [null, false],
    [undefined, false],
    ['', false],
    ['https://drive.google.com/drive/folders/abcde12345', false],
    ['http://docs.google.com/spreadsheets/d/abcde12345/edit', false],
    ['https://docs.google.com.evil.com/spreadsheets/d/abcde12345', false],
    ['https://docs.google.com/spreadsheets/d/abc', false],
    ['javascript:alert(1)', false],
    ['https://user:password@docs.google.com/spreadsheets/d/abcde12345', false],
  ])('only canonical individual Google spreadsheet URLs pass (%s)', (value, accepted) => {
    expect(isTrustedCommentSourceLink(value)).toBe(accepted);
  });
});

describe('anonymous public sync route contract', () => {
  const source = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const begin = source.indexOf("app.post('/api/public/properties/:id/sync-comments', (req, res, next) => {");
  const end = source.indexOf('// 物件番号ベースの画像一覧取得エンドポイント', begin);
  const publicRoute = source.slice(begin, end);
  const privateRouteStart = source.indexOf("app.post('/api/internal/comment-backfill-batch', requireStaffOrMachine");
  const privateRouteEnd = source.indexOf('// コメントデータをAthomeシートから同期（非同期トリガー用）', privateRouteStart);
  const privateRoute = source.slice(privateRouteStart, privateRouteEnd);
  const oita = readFileSync(resolve(__dirname, '../../../frontend/src/pages/PublicPropertyDetailPage.tsx'), 'utf8');
  const kujira = readFileSync(resolve(__dirname, '../../../frontend/src/pages/KujiraPropertyDetailPage.tsx'), 'utf8');

  test('no public Sheet sync for completed comments or missing/untrusted source', () => {
    expect(begin).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(begin);
    expect(publicRoute).toContain('if (!needsPublicCommentSync(property.favorite_comment, property.recommended_comments))');
    expect(publicRoute).toContain(".from('work_tasks')");
    expect(publicRoute).toContain(".select('spreadsheet_url')");
    expect(publicRoute).toContain(".eq('property_number', property.property_number)");
    expect(publicRoute).toContain(".maybeSingle()");
    expect(publicRoute).toContain('if (!isTrustedCommentSourceLink(sourceTask?.spreadsheet_url))');
    expect(publicRoute).toContain("message: 'Comment source is not configured'");
    expect(publicRoute.indexOf('if (!isTrustedCommentSourceLink(sourceTask?.spreadsheet_url))'))
      .toBeLessThan(publicRoute.indexOf('new AthomeSheetSyncService()'));
    expect(publicRoute).toContain('if (sourceLookupError)');
  });

  test('limits visitor-triggered Sheets sync to one attempt, keeps staff route independent', () => {
    expect(publicRoute).toContain('1 // Never retry a failing Google Sheets read for each anonymous visitor');
    expect(publicRoute).toContain('runLimitedPublicCommentSync(');
    expect(privateRoute).toContain('runLimitedPublicCommentSync(');
    expect(privateRoute).toContain('return service.syncPropertyComments(candidate.property_number, propertyType, 1)');
    expect(publicRoute).toContain("isAnonymousCommentSyncDisabled(process.env.PUBLIC_COMMENT_SYNC_DISABLED)");
    expect(publicRoute).toContain('next();');
  });

  test('no internal property-about read/write from an anonymous POST', () => {
    expect(publicRoute).not.toContain('getPropertyAbout(');
    expect(publicRoute).not.toContain('upsertPropertyDetails(');
    expect(publicRoute).toContain('propertyAbout: null');
    expect(publicRoute).toContain('recommendedComments: filterPublicRecommendedComments(updatedDetails.recommended_comments)');
    expect(publicRoute).toContain('athomeData: updatedDetails.athome_data');
  });

  test('client pages still use the same public GET and background refresh contract', () => {
    expect(oita).toContain("publicApi.post(\`/api/public/properties/\${id}/sync-comments\`)");
    expect(kujira).toContain("publicApi.post(\`/api/public/properties/\${id}/sync-comments\`)");
    expect(source).toContain("app.get('/api/public/properties/:id/complete', async (req, res) => {");
  });

  test('no backend account removal, cron change, or background batch trigger', () => {
    expect(publicRoute).not.toContain('auth.admin.deleteUser');
    expect(publicRoute).not.toContain('delete from auth.users');
    expect(publicRoute).not.toContain('COMMENT_BACKFILL_EXECUTION_ENABLED=true');
    expect(publicRoute).not.toContain('DELETE FROM');
  });
});
