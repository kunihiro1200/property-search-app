/**
 * Per-process snapshot cache for read-only storage URLs in 業務依頼 sheet.
 *
 * - Coalesces concurrent first loads / refreshes into ONE Google Sheets call.
 * - Keeps the existing five-minute freshness window for successful loads.
 * - Suppresses retry storms for one minute after a failed load / HTTP 429.
 * - Uses the last successful map if a refresh fails.
 *
 * Serverless instances have separate caches: this is a load reduction, not a
 * globally distributed Google API rate limit or a persistence mechanism.
 */
export class WorkTasksStorageCache {
  private cached: Map<string, string> | null = null;
  private expiresAt = 0;
  private nextRetryAt = 0;
  private inFlight: Promise<Map<string, string> | null> | null = null;

  constructor(
    private readonly ttlMs: number = 5 * 60_000,
    private readonly errorCooldownMs: number = 60_000,
    private readonly clock: () => number = Date.now,
  ) {}

  async lookup(
    propertyNumber: string,
    loadAll: () => Promise<Map<string, string>>
  ): Promise<string | null> {
    const data = await this.loadSnapshot(loadAll);
    return data?.get(propertyNumber) ?? null;
  }

  private loadSnapshot(loadAll: () => Promise<Map<string, string>>): Promise<Map<string, string> | null> {
    const now = this.clock();
    if (this.cached !== null && now < this.expiresAt) {
      return Promise.resolve(this.cached);
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    if (now < this.nextRetryAt) {
      return Promise.resolve(this.cached);
    }

    // Schedule the network load on a microtask, so simultaneous calls share
    // this.inFlight before any one of them touches Google Sheets.
    this.inFlight = Promise.resolve()
      .then(loadAll)
      .then((snapshot) => {
        this.cached = snapshot;
        this.expiresAt = this.clock() + this.ttlMs;
        this.nextRetryAt = 0;
        return snapshot;
      })
      .catch(() => {
        // Never log a Sheets exception here: Google API errors can include
        // request paths, headers and other operational details.
        this.nextRetryAt = this.clock() + this.errorCooldownMs;
        return this.cached;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }
}
