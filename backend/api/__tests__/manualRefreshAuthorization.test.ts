/**
 * No-credential regression guards for the two manual refresh routes.
 *
 * This suite deliberately does not import the production API entrypoint,
 * perform HTTP requests, or connect to Google Sheets or Supabase.
 * It checks the route contract and its existing authenticated frontend caller.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const apiSource = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
const refreshHook = readFileSync(resolve(__dirname, '../../../frontend/src/hooks/usePropertyRefresh.ts'), 'utf8');
const apiClient = readFileSync(resolve(__dirname, '../../../frontend/src/services/api.ts'), 'utf8');
const detailPage = readFileSync(resolve(__dirname, '../../../frontend/src/pages/PublicPropertyDetailPage.tsx'), 'utf8');

describe('manual public-site refresh authorization contract', () => {
  test.each(['refresh-essential', 'refresh-all'])(
    '%s requires staff or machine authorization before the handler',
    (endpoint) => {
      expect(apiSource).toContain(
        `app.post('/api/public/properties/:identifier/${endpoint}', requireStaffOrMachine, async (req, res) => {`
      );
      expect(refreshHook).toContain('`/api/public/properties/${propertyId}/' + endpoint + '`');
    }
  );

  test('existing refresh client sends the staff session bearer token', () => {
    expect(refreshHook).toContain("import api from '../services/api'");
    expect(apiClient).toContain("localStorage.getItem('session_token')");
    expect(apiClient).toContain('config.headers.Authorization = `Bearer ${sessionToken}`');
  });

  test('refresh controls remain restricted to authenticated admin mode', () => {
    expect(detailPage).toContain('return isAuthenticated && canHideParam');
    expect(detailPage).toContain('{isAdminMode && (');
    expect(detailPage).toContain('canRefresh={isAdminMode}');
  });

  test('does not add auth to public reading or background GAS endpoints', () => {
    expect(apiSource).toContain("app.post('/api/public/properties/:id/sync-comments', async (req, res) => {");
    expect(apiSource).toContain("app.post('/api/sync/trigger', async (req, res) => {");
  });
});
