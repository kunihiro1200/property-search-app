/**
 * Static guardrails for the isolated Vercel sync route.
 * This test reads config only; it never invokes any endpoint.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const workflow = fs.readFileSync(
  path.join(root, '.github/workflows/scheduled-property-sync.yml'), 'utf8'
);

describe('isolated scheduled sync deployment config', () => {
  it('routes the exact verified endpoint before the shared API catch-all', () => {
    expect(config.routes[0]).toEqual({
      src: '/api/internal/property-sync-and-wait/?',
      dest: '/backend/api/sync-verified.ts',
    });
    expect(config.routes[1]).toEqual({
      src: '/api/(.*)',
      dest: '/backend/api/index.ts',
    });
  });

  it('provides 300 seconds only to the dedicated verified function', () => {
    const byPath = (src: string) => config.builds.find((build: any) => build.src === src);
    expect(byPath('backend/api/sync-verified.ts').config.maxDuration).toBe(300);
    expect(byPath('backend/api/index.ts').config.maxDuration).toBe(60);
    expect(byPath('frontend/package.json').config.distDir).toBe('dist');
  });

  it('retains the protected timer and waits long enough for a 300-second function', () => {
    expect(workflow).toContain("cron: '17,47 * * * *'");
    expect(workflow).toContain("if: github.event_name != 'push'");
    expect(workflow).toContain('timeout-minutes: 10');
    expect(workflow).toContain('--max-time 330');
    expect(workflow).toContain('/api/internal/property-sync-and-wait');
    expect(workflow).toContain('jq -e');
  });
});
