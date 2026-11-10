/**
 * Tests for the isolated Vercel function. All dependencies are mocked.
 * The test never connects to Google Sheets, Vercel or Supabase.
 */
import scheduledSync from '../sync-verified';
import { getPropertyListingSyncService } from '../src/services/PropertyListingSyncService';

jest.mock('../src/services/PropertyListingSyncService', () => ({
  getPropertyListingSyncService: jest.fn(),
}));

const factory = getPropertyListingSyncService as jest.Mock;
const secret = 'isolated-unit-test-key-not-a-real-secret';

function fakeResponse() {
  let code = 200;
  let resultBody: any;
  let ended = false;
  const headers: Record<string, string> = {};
  const response: any = {
    headersSent: false,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return this;
    },
    status(value: number) {
      code = value;
      return this;
    },
    json(value: any) {
      resultBody = value;
      ended = true;
      this.headersSent = true;
      return this;
    },
    end() {
      ended = true;
      this.headersSent = true;
      return this;
    },
  };
  return {
    response,
    get code() { return code; },
    get body() { return resultBody; },
    get ended() { return ended; },
    headers,
  };
}

describe('isolated Vercel scheduled sync function (no real data)', () => {
  const old = process.env.CRON_SECRET;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.CRON_SECRET = secret;
    factory.mockReset();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (old === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = old;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('allows only POST', async () => {
    const res = fakeResponse();
    await scheduledSync({ method: 'GET', headers: {} } as any, res.response);
    expect(res.code).toBe(405);
    expect(res.ended).toBe(true);
    expect(res.headers.allow).toBe('POST');
    expect(factory).not.toHaveBeenCalled();
  });

  it('rejects missing authorization before loading the sync service', async () => {
    const res = fakeResponse();
    await scheduledSync({ method: 'POST', headers: {} } as any, res.response);
    expect(res.code).toBe(401);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(factory).not.toHaveBeenCalled();
  });

  it('awaits a mocked sync completion and then responds with counts', async () => {
    let resolveWork!: (result: any) => void;
    const pending = new Promise<any>((resolve) => { resolveWork = resolve; });
    const service = {
      initializeForScheduledSync: jest.fn().mockResolvedValue(undefined),
      runScheduledSync: jest.fn(() => pending),
    };
    factory.mockReturnValue(service);
    const res = fakeResponse();

    const request = scheduledSync({
      method: 'POST', headers: { authorization: `Bearer ${secret}` },
    } as any, res.response);

    // Allow the asynchronous import / mocked initialization to start.
    for (let i = 0; i < 12 && !service.runScheduledSync.mock.calls.length; i++) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    expect(service.runScheduledSync).toHaveBeenCalledTimes(1);
    expect(res.ended).toBe(false);

    resolveWork({
      success: true,
      successfullyAdded: 0,
      successfullyUpdated: 1782,
      failed: 0,
      errors: [],
    });
    await request;
    expect(res.code).toBe(200);
    expect(res.body.complete).toBe(true);
    expect(res.body.successfullyUpdated).toBe(1782);
    expect(JSON.stringify(res.body)).not.toContain(secret);
  });

  it('reports a partially failed sync as HTTP 502', async () => {
    factory.mockReturnValue({
      initializeForScheduledSync: jest.fn().mockResolvedValue(undefined),
      runScheduledSync: jest.fn().mockResolvedValue({
        success: false,
        successfullyAdded: 0,
        successfullyUpdated: 1750,
        failed: 32,
        errors: [{ propertyNumber: 'MOCK', message: 'masked' }],
      }),
    });
    const res = fakeResponse();
    await scheduledSync({
      method: 'POST', headers: { authorization: `Bearer ${secret}` },
    } as any, res.response);
    expect(res.code).toBe(502);
    expect(res.body.complete).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('masked');
  });
});
