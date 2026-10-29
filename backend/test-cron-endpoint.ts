import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

/**
 * Authenticated Cron endpoint smoke test.
 * Does not create, modify, or reset any real inquiry records.
 * It can trigger processing of existing pending inquiries, so requires explicit opt-in.
 */
async function testCronEndpoint() {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET is missing');
  if (process.env.ALLOW_LIVE_CRON_TEST !== 'YES') {
    throw new Error('Cron execution may process pending inquiries. Set ALLOW_LIVE_CRON_TEST=YES to opt in');
  }

  const baseUrl = process.env.CRON_TEST_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl.replace(/\/$/, '')}/api/cron/sync-inquiries`;
  console.log('Starting authenticated Cron endpoint test (credential hidden)');

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${secret}` },
      timeout: 30000,
    });
    console.log('HTTP status:', response.status);
    console.log('Cron call completed. Check records through normal admin reports.');
  } catch (error: any) {
    console.error('Cron call failed; HTTP status:', error.response?.status ?? 'network error');
    throw error;
  }
}

testCronEndpoint().catch(error => {
  console.error('Test failed:', error.message);
  process.exitCode = 1;
});
