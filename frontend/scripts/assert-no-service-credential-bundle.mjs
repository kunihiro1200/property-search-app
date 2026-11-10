/**
 * Static public-site build safety guard.
 * The marker is intentionally fake. Never pass real credentials into this test.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const marker = process.env.FAKE_CREDENTIAL_MARKER;
if (!marker || !/^TEST_ONLY_[A-Z0-9_]{12,}$/.test(marker)) {
  throw new Error('Use a non-secret, synthetic TEST_ONLY_ marker');
}
const directory = resolve('dist');
let fileCount = 0;
async function scan(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }
    if (!entry.isFile()) continue;
    fileCount++;
    const data = await readFile(path);
    if (data.includes(Buffer.from(marker, 'utf8'))) {
      throw new Error('A test-only server credential marker was bundled into the public site');
    }
  }
}
await scan(directory);
if (!fileCount) throw new Error('Static build output is empty');
console.log('PASS: static frontend assets exclude the fake server-credential marker');
