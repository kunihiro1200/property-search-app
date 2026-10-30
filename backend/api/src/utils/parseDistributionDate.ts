/**
 * Normalize a distribution date from the property-list Google Sheet to a
 * valid PostgreSQL DATE literal (YYYY-MM-DD), or null.
 *
 * The source Sheet sometimes contains an explanatory note after the date:
 *   2024/9/19（配信のみ）
 *   2024/3/21以降月イチ配信のみ
 *
 * Database DATE columns must never receive that trailing text.
 * The original Sheet value is not modified.
 */
export function parseDistributionDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const input = String(value).trim();
  if (!input) return null;

  // Accept a leading full year/month/day only. Ignore a trailing annotation.
  // The (?!\d) guard rejects truncated/malformed day numbers.
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?!\d)/.exec(input);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Enforce real calendar dates (including leap years), not Date auto-rollover.
  // Four-digit years under 1000 are not expected property distribution dates.
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return match[1] + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}
