/**
 * Defensive controls for the legacy, anonymous public comment refresh API.
 *
 * The public property detail page currently POSTs when favorite/recommended
 * comments are missing. Do not break that recovery path without a verified
 * server-side replacement.
 *
 * IMPORTANT: The limiter is per serverless INSTANCE, not a distributed lock.
 * It mitigates accidental repeat requests but is NOT a security boundary
 * against deliberate parallel requests across Vercel instances.
 */
export function needsPublicCommentSync(
  favoriteComment: unknown,
  recommendedComments: unknown
): boolean {
  return !favoriteComment ||
    !recommendedComments ||
    (Array.isArray(recommendedComments) && recommendedComments.length === 0);
}

/** Match the internal-memo exclusion already used by GET /complete. */
export function filterPublicRecommendedComments(comments: unknown): unknown[] {
  const raw: unknown[] = Array.isArray(comments) ? comments : [];
  return raw.filter((comment) => {
    const text = Array.isArray(comment) ? comment.join(' ') : String(comment ?? '');
    const trimmed = text.trim();
    return !trimmed.startsWith('←') &&
      !trimmed.includes('一般媒介で、担当もついている場合') &&
      !(trimmed.startsWith('＼') && trimmed.endsWith('／'));
  });
}

export type PublicCommentSyncOutcome =
  | { status: 'completed' | 'shared'; success: boolean }
  | { status: 'throttled'; success: false };

type ActiveSync = {
  inFlight?: Promise<boolean>;
  nextAllowedAt: number;
};

export function createPublicCommentSyncLimiter(
  successCooldownMs: number = 5 * 60_000,
  failureCooldownMs: number = 60_000,
  maxEntries: number = 256
) {
  const attempts = new Map<string, ActiveSync>();

  return async function runLimitedSync(
    propertyNumber: string,
    sync: () => Promise<boolean>,
    now: () => number = Date.now
  ): Promise<PublicCommentSyncOutcome> {
    const current = attempts.get(propertyNumber);
    if (current?.inFlight) {
      const success = await current.inFlight;
      return { status: 'shared', success };
    }
    if (current && now() < current.nextAllowedAt) {
      return { status: 'throttled', success: false };
    }

    // Limit memory usage. Only evict completed entries; keep in-flight work.
    for (const [key, entry] of attempts) {
      if (!entry.inFlight && now() >= entry.nextAllowedAt) {
        attempts.delete(key);
      }
    }
    if (attempts.size >= maxEntries) {
      for (const [key, entry] of attempts) {
        if (!entry.inFlight) {
          attempts.delete(key);
          break;
        }
      }
    }
    // If the map contains only in-flight work, do not start yet another job.
    if (attempts.size >= maxEntries && !attempts.has(propertyNumber)) {
      return { status: 'throttled', success: false };
    }

    const entry: ActiveSync = { nextAllowedAt: now() + failureCooldownMs };
    const inFlight = Promise.resolve()
      .then(sync)
      .then((result) => result === true, () => false);
    entry.inFlight = inFlight;
    attempts.set(propertyNumber, entry);

    try {
      const success = await inFlight;
      entry.nextAllowedAt = now() + (success ? successCooldownMs : failureCooldownMs);
      return { status: 'completed', success };
    } finally {
      entry.inFlight = undefined;
    }
  };
}

export const runLimitedPublicCommentSync = createPublicCommentSyncLimiter();
