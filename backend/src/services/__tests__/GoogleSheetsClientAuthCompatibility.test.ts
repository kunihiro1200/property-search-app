/**
 * No-network compatibility checks. Google auth, Google Sheets and the rate
 * limiter are mocked. Test credentials below are deliberately fake.
 */
jest.mock('googleapis', () => {
  const JWT = jest.fn().mockImplementation(() => ({
    authorize: jest.fn().mockResolvedValue({ access_token: 'fake-test-token' }),
  }));
  return {
    google: {
      auth: { JWT },
      sheets: jest.fn().mockReturnValue({ spreadsheets: { values: {} } }),
    },
  };
});
jest.mock('google-auth-library', () => ({
  JWT: jest.fn().mockImplementation(() => ({
    authorize: jest.fn().mockResolvedValue({ access_token: 'fake-test-token' }),
  })),
}));
jest.mock('../RateLimiter', () => ({ sheetsRateLimiter: {} }));

import { google } from 'googleapis';
import { GoogleSheetsClient } from '../GoogleSheetsClient';

const fakeEmail = 'sheet-test@invalid.example';
const fakeKey = '-----BEGIN PRIVATE KEY-----\nNOT-A-REAL-PRIVATE-KEY\n-----END PRIVATE KEY-----\n';
const mockedJwt = google.auth.JWT as unknown as jest.Mock;
const mockedSheets = google.sheets as unknown as jest.Mock;
const envKeys = ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'];

const originalEnv: Record<string, string | undefined> = {};
for (const name of envKeys) originalEnv[name] = process.env[name];

function restoreEnvironment(): void {
  for (const name of envKeys) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
}
function newClient(): GoogleSheetsClient {
  return new GoogleSheetsClient({ spreadsheetId: 'fake-spreadsheet', sheetName: 'fake-tab' });
}
function lastOptions(): { email: string; key: string; scopes: string[] } {
  expect(mockedJwt).toHaveBeenCalledTimes(1);
  return mockedJwt.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const name of envKeys) delete process.env[name];
});
afterAll(() => restoreEnvironment());

describe('GoogleSheetsClient authentication compatibility (fully mocked)', () => {
  test('raw JSON authenticates with existing Sheets-only permission', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: fakeEmail, private_key: fakeKey,
    });
    await newClient().authenticate();
    expect(lastOptions()).toEqual({
      email: fakeEmail, key: fakeKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    expect(mockedSheets).toHaveBeenCalledTimes(1);
  });

  test('base64 JSON fallback authenticates with the same credential and scope', async () => {
    const fixture = JSON.stringify({ client_email: fakeEmail, private_key: fakeKey });
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = Buffer.from(fixture).toString('base64');
    await newClient().authenticate();
    expect(lastOptions().key).toBe(fakeKey);
    expect(lastOptions().email).toBe(fakeEmail);
    expect(lastOptions().scopes).toEqual(['https://www.googleapis.com/auth/spreadsheets']);
  });

  test('JSON credentials with escaped newlines are normalized before signing', async () => {
    const escaped = fakeKey.replace(/\n/g, '\\n');
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: fakeEmail, private_key: escaped,
    });
    await newClient().authenticate();
    expect(lastOptions().key).toBe(fakeKey);
  });

  test('individual credential variables still include Sheets + Drive read-only scopes', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = fakeEmail;
    process.env.GOOGLE_PRIVATE_KEY = fakeKey.replace(/\n/g, '\\n');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await newClient().authenticate();
      expect(lastOptions()).toEqual({
        email: fakeEmail,
        key: fakeKey,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.readonly',
        ],
      });
      expect(log.mock.calls.flat().join(' ')).not.toContain(fakeKey);
    } finally {
      log.mockRestore();
    }
  });

  test('malformed JSON never reaches Google or prints the original material', async () => {
    const secretFixture = 'malformed-CREDENTIAL-TEST-123';
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = secretFixture;
    const errLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(newClient().authenticate()).rejects.toThrow('Google Sheets authentication failed');
      expect(mockedJwt).not.toHaveBeenCalled();
      expect(errLog.mock.calls.flat().join(' ')).not.toContain(secretFixture);
    } finally {
      errLog.mockRestore();
    }
  });

  test('Google authorization failures are redacted, not forwarded to callers or logs', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: fakeEmail, private_key: fakeKey,
    });
    const autorizationError = 'private-key-fragment-TEST-IN-MOCK-ERROR';
    mockedJwt.mockImplementationOnce(() => ({
      authorize: jest.fn().mockRejectedValue(new Error(autorizationError)),
    }));
    const errLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(newClient().authenticate()).rejects.toThrow('Google Sheets authentication failed');
      const combined = errLog.mock.calls.flat().join(' ');
      expect(combined).not.toContain(autorizationError);
      expect(combined).not.toContain(fakeKey);
    } finally {
      errLog.mockRestore();
    }
  });
});
