/**
 * Read-only unit tests. No real Supabase/Google client is constructed.
 * This verifies the scheduled-only initialization does not authenticate
 * the business-request sheet used by legacy full sync.
 */
import { PropertyListingSyncService } from '../src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from '../src/services/GoogleSheetsClient';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({})),
}));

jest.mock('../src/services/GoogleDriveService', () => ({
  GoogleDriveService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../src/services/GoogleSheetsClient', () => ({
  GoogleSheetsClient: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('lightweight scheduled-sync initialization without extra Google requests', () => {
  beforeEach(() => {
    (GoogleSheetsClient as jest.Mock).mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authenticates only the property sheet and caches success', async () => {
    const service = new PropertyListingSyncService('https://example.invalid', 'mock-key');
    await service.initializeForScheduledSync();

    expect(GoogleSheetsClient).toHaveBeenCalledTimes(1);
    const firstConfig = (GoogleSheetsClient as jest.Mock).mock.calls[0][0];
    expect(firstConfig.sheetName).toBe(process.env.PROPERTY_LISTING_SHEET_NAME || '物件');

    await service.initializeForScheduledSync();
    expect(GoogleSheetsClient).toHaveBeenCalledTimes(1);
  });

  it('preserves legacy full initialization as an independent operation', async () => {
    const service = new PropertyListingSyncService('https://example.invalid', 'mock-key');
    await service.initializeForScheduledSync();
    await service.initialize();

    // Lightweight path: property sheet once. Full path: property + business-request.
    expect(GoogleSheetsClient).toHaveBeenCalledTimes(3);
    const configs = (GoogleSheetsClient as jest.Mock).mock.calls.map((row: any[]) => row[0].sheetName);
    expect(configs).toEqual([
      process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
      process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
      process.env.GYOMU_LIST_SHEET_NAME || '業務依頼',
    ]);
  });
});
