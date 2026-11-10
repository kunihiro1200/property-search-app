/**
 * Offline-only direct-source regression tests.
 * No Google auth, Supabase, production app, or network calls.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  extractTrustedCommentSpreadsheetId,
  isTrustedCommentSourceLink,
} from '../src/utils/commentBackfillPolicy';

const exampleId = 'abcdefghi12345_-ABC';
const goodUrl = 'https://docs.google.com/spreadsheets/d/' + exampleId + '/edit#gid=10';

describe('trusted Sheet ID extraction from server-held URL', () => {
  it('extracts only the individual ID from an approved source', () => {
    expect(extractTrustedCommentSpreadsheetId(goodUrl)).toBe(exampleId);
    expect(extractTrustedCommentSpreadsheetId(
      ' https://docs.google.com/spreadsheets/d/' + exampleId + '?usp=sharing '
    )).toBe(exampleId);
  });

  test.each([
    null, undefined, 123, '', ' ',
    'http://docs.google.com/spreadsheets/d/' + exampleId,
    'https://docs.google.com.evil.test/spreadsheets/d/' + exampleId,
    'https://drive.google.com/file/d/' + exampleId,
    'https://docs.google.com:8080/spreadsheets/d/' + exampleId,
    'https://user:pass@docs.google.com/spreadsheets/d/' + exampleId,
    'https://docs.google.com/spreadsheets/d/short',
    'javascript:alert(1)',
    'https://docs.google.com/document/d/' + exampleId,
    'https://docs.google.com/spreadsheets/d/' + exampleId + '.evil',
  ])('rejects untrusted sources %o', value => {
    expect(isTrustedCommentSourceLink(value)).toBe(false);
    expect(extractTrustedCommentSpreadsheetId(value)).toBeNull();
  });
});

describe('direct source sync uses only the server-verified URL', () => {
  const index = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const service = readFileSync(resolve(__dirname, '../src/services/AthomeSheetSyncService.ts'), 'utf8');
  const methodStart = service.indexOf('async syncPropertyCommentsFromTrustedSource(');
  const methodEnd = service.indexOf('async syncPropertyComments(', methodStart);
  const method = service.slice(methodStart, methodEnd);

  const publicStart = index.indexOf("app.post('/api/public/properties/:id/sync-comments', (req, res, next) => {");
  const publicEnd = index.indexOf('// 物件番号ベースの画像一覧取得エンドポイント', publicStart);
  const publicRoute = index.slice(publicStart, publicEnd);

  const internalStart = index.indexOf("app.post('/api/internal/comment-backfill-batch', requireStaffOrMachine");
  const internalEnd = index.indexOf('// コメントデータをAthomeシートから同期（非同期トリガー用）', internalStart);
  const internalRoute = index.slice(internalStart, internalEnd);

  test('new direct method never scans the entire 業務依頼 Sheet', () => {
    expect(methodStart).toBeGreaterThan(0);
    expect(methodEnd).toBeGreaterThan(methodStart);
    expect(method).toContain('extractTrustedCommentSpreadsheetId(sourceSpreadsheetUrl)');
    expect(method).toContain('if (!spreadsheetId)');
    expect(method).toContain('this.fetchCommentsFromAthomeSheet(spreadsheetId, propertyType)');
    expect(method).toContain('syncAthomeSnapshotNonDestructively(');
    expect(method).not.toContain('getIndividualSpreadsheetId(');
    expect(method).not.toContain('gyomuListService');
    expect(method).not.toContain('getByPropertyNumber(');
    expect(method).not.toContain('setTimeout(');
  });

  test('staff route passes the DB-selected URL under authentication and opt-in', () => {
    expect(internalStart).toBeGreaterThan(0);
    expect(internalRoute).toContain("process.env.COMMENT_BACKFILL_EXECUTION_ENABLED");
    expect(internalRoute).toContain("if (options.mode === 'preview') continue;");
    expect(internalRoute).toContain("isTrustedCommentSourceLink(workTask?.spreadsheet_url)");
    expect(internalRoute).toContain('syncPropertyCommentsFromTrustedSource(');
    expect(internalRoute).toContain('workTask!.spreadsheet_url');
    expect(internalRoute).not.toContain('service.syncPropertyComments(');
  });

  test('anonymous route never accepts source URL from request body', () => {
    expect(publicStart).toBeGreaterThan(0);
    expect(publicRoute).toContain("isAnonymousCommentSyncDisabled(process.env.PUBLIC_COMMENT_SYNC_DISABLED)");
    expect(publicRoute).toContain("isTrustedCommentSourceLink(sourceTask?.spreadsheet_url)");
    expect(publicRoute).toContain('syncPropertyCommentsFromTrustedSource(');
    expect(publicRoute).toContain('sourceTask!.spreadsheet_url');
    expect(publicRoute).not.toContain('req.body.spreadsheetUrl');
    expect(publicRoute).not.toContain('req.body.sourceSpreadsheetUrl');
    expect(publicRoute).not.toContain('athomeSheetSyncService.syncPropertyComments(');
  });

  test('individual Sheet A1 references use quoted exact tab names', () => {
    expect(service).toContain('const a1SheetName = ');
    expect(service).toContain('sheetName.replace(/');
    expect((service.match(/range: /g) || []).length).toBeGreaterThanOrEqual(3);
    expect((service.match(/a1SheetName/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  test('existing staff and public detail routes are preserved', () => {
    expect(service).toContain('private async getIndividualSpreadsheetId(');
    expect(service).toContain('async syncPropertyComments(');
    expect(index).toContain("app.get('/api/public/properties/:id/complete', async (req, res) => {");
  });
});
