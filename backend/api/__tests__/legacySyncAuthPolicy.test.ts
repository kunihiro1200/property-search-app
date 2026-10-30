/**
 * No-network, no-credential regression test for GAS-compatible auth migration.
 * Does not import the production Express app or execute any sync.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  classifyLegacySyncAuthorization,
  isLegacySyncAuthEnforced,
} from '../src/utils/legacySyncAuthPolicy';

describe('legacy GAS sync authentication migration policy', () => {
  const fakeSecret = 'fake-only-test-token-123';

  test.each([
    [undefined, false],
    ['', false],
    ['false', false],
    ['TRUE', false],
    ['1', false],
    ['true', true],
  ])('explicit server-only auth flag %s → enforced=%s', (raw, expected) => {
    expect(isLegacySyncAuthEnforced(raw)).toBe(expected);
  });

  test('recognizes valid machine bearer without exposing its value', () => {
    expect(classifyLegacySyncAuthorization('Bearer ' + fakeSecret, fakeSecret)).toBe('machine');
    expect(classifyLegacySyncAuthorization('Bearer ' + fakeSecret, undefined)).toBe('other_bearer');
  });

  test.each([
    [undefined, 'none'],
    ['', 'none'],
    ['Basic dXNlcjpwYXNz', 'none'],
    ['Bearer ', 'none'],
    ['Bearer expired-session', 'other_bearer'],
    ['Bearer wrong-machine-token', 'other_bearer'],
    ['bearer fake-only-test-token-123', 'none'],
  ])('only returns safe categories, never tokens', (raw, expected) => {
    expect(classifyLegacySyncAuthorization(raw, fakeSecret)).toBe(expected);
  });
});

describe('legacy sync production route remains compatibility-safe by default', () => {
  const source = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
  const legacyStart = source.indexOf("app.post('/api/sync/trigger', (req, res, next) => {");
  const legacyEnd = source.indexOf('// 公開物件の座標を保存', legacyStart);
  const legacy = source.slice(legacyStart, legacyEnd);

  test('audit executes before existing GAS sync handler and logs only categories', () => {
    expect(legacyStart).toBeGreaterThan(0);
    expect(legacyEnd).toBeGreaterThan(legacyStart);
    expect(legacy).toContain('isLegacySyncAuthEnforced(process.env.LEGACY_SYNC_TRIGGER_AUTH_REQUIRED)');
    expect(legacy).toContain('classifyLegacySyncAuthorization(');
    expect(legacy).toContain("console.info('[Legacy Sync Auth Audit]', { enforcementEnabled, authorizationKind });");
    expect(legacy).not.toContain('console.info(req.headers.authorization)');
    expect(legacy).not.toContain("console.log(process.env.CRON_SECRET)");
  });

  test('on-state uses existing staff/machine guard, off-state preserves legacy semantics', () => {
    expect(legacy).toContain('if (enforcementEnabled) {');
    expect(legacy).toContain('return requireStaffOrMachine(req, res, next);');
    expect(legacy).toContain('next();');
    expect(legacy).toContain('res.json({');
    expect(legacy).toContain('runScheduledSync()');
  });

  test('new verified sync function and anonymous public display routes are untouched', () => {
    expect(source).toContain("app.get('/api/internal/property-sync-auth-check', (req, res) => {");
    expect(source).toContain("app.get('/api/public/properties'");
  });
});
