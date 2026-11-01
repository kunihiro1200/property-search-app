/**
 * Static privacy and behavior guards for the public inquiry and inquiry-retry APIs.
 * These tests do not import the Express server, use credentials, send requests,
 * or read customer records.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const apiSource = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
const inquiryStart = apiSource.indexOf("app.post('/api/public/inquiries',");
const cronStart = apiSource.indexOf("app.get('/api/cron/sync-inquiries',");
const cronEnd = apiSource.indexOf('// Cron Job: 物件リストをスプレッドシートから同期', cronStart);

if (inquiryStart < 0 || cronStart <= inquiryStart || cronEnd <= cronStart) {
  throw new Error('Inquiry route boundaries not found; review the privacy checks');
}

const inquiryRoute = apiSource.slice(inquiryStart, cronStart);
const cronRoute = apiSource.slice(cronStart, cronEnd);
const bothRoutes = inquiryRoute + cronRoute;

describe('inquiry and buyer data log privacy', () => {
  test('never prints buyer rows, names, buyer IDs, sheet identifiers or raw exceptions', () => {
    const logCalls = bothRoutes.match(/console\\.(?:log|warn|error|info|debug)\\([\\s\\S]*?\\);/g) || [];
    expect(logCalls.length).toBeGreaterThan(0);

    const unsafeArguments = /\\b(?:lastRow|lastBuyerNumber|nextBuyerNumber|propertyId|propertyNumber|spreadsheetId|sheetName|savedInquiry|syncError|saveError|fetchError|inquiry\\.|error\\.(?:message|stack|errors))\\b/;
    const unsafeCalls = logCalls.filter((call) => unsafeArguments.test(call));
    expect(unsafeCalls).toEqual([]);
  });

  test('does not print the complete buyer row or inquiry identity', () => {
    expect(bothRoutes).not.toContain("console.log('[Inquiry API] Last row from spreadsheet:'");
    expect(bothRoutes).not.toContain('Object.keys(lastRow)');
    expect(bothRoutes).not.toContain('(${inquiry.name})');
    expect(bothRoutes).not.toContain('console.error(\'[Inquiry API] Error:\', error)');
  });

  test('keeps the buyer-number lookup and original database fallback', () => {
    expect(inquiryRoute).toContain('await sheetsClient.readAll()');
    expect(inquiryRoute).toContain("lastRow['買主番号']");
    expect(inquiryRoute).toContain('nextBuyerNumber = parseInt(String(lastBuyerNumber)) + 1');
    expect(inquiryRoute).toContain(".from('property_inquiries')");
    expect(inquiryRoute).toContain(".select('buyer_number')");
  });

  test('keeps the inquiry form write paths and success contract', () => {
    expect(inquiryRoute).toContain('await sheetsClient.appendRow(rowData)');
    expect(inquiryRoute).toContain("'●氏名・会社名': name");
    expect(inquiryRoute).toContain("'●メアド': email");
    expect(inquiryRoute).toContain('.insert({');
    expect(inquiryRoute).toContain('sheet_sync_status: sheetSyncStatus');
    expect(inquiryRoute).toContain('res.status(201).json({');
  });

  test('keeps cron authentication, retries and aggregate outcome counts', () => {
    expect(cronRoute).toContain("req.headers.authorization !== `Bearer ${cronSecret}`");
    expect(cronRoute).toContain("'●氏名・会社名': inquiry.name");
    expect(cronRoute).toContain('await sheetsClient.appendRow(rowData)');
    expect(cronRoute).toContain("sheet_sync_status: 'synced'");
    expect(cronRoute).toContain("sheet_sync_status: 'failed'");
    expect(cronRoute).toContain('syncedCount++');
    expect(cronRoute).toContain('failedCount++');
  });
});
