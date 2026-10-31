/**
 * Derive coordinates from a property's stored Google Maps URL.
 *
 * This is intentionally server-side only. Never trust coordinates supplied by
 * an anonymous browser when updating the property database.
 *
 * Short URLs are resolved with exactly one HEAD request to an allowlisted
 * Google short-link host. Redirect locations are parsed locally: no redirected
 * URL is fetched, and a non-Google redirect is rejected.
 */
import https from 'https';

export interface PropertyCoordinates {
  lat: number;
  lng: number;
}

type ShortUrlExpander = (url: URL) => Promise<string | null>;

const DIRECT_MAP_HOSTS = new Set([
  'www.google.com',
  'google.com',
  'maps.google.com',
  'www.google.co.jp',
  'google.co.jp',
  'maps.google.co.jp',
]);

function checkedUrl(raw: string | null | undefined): URL | null {
  if (!raw || typeof raw !== 'string' || raw.length > 2048) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (url.hash.length > 512) return null;
    return url;
  } catch {
    return null;
  }
}

function isGoogleShortMapLink(url: URL): boolean {
  const code = '[A-Za-z0-9_-]{4,100}';
  if (url.hostname === 'maps.app.goo.gl') {
    return new RegExp('^/' + code + '/?$').test(url.pathname) && !url.search;
  }
  if (url.hostname === 'goo.gl') {
    return new RegExp('^/maps/' + code + '/?$').test(url.pathname) && !url.search;
  }
  return false;
}

function isDirectMapUrl(url: URL): boolean {
  if (!DIRECT_MAP_HOSTS.has(url.hostname)) return false;
  if (url.hostname === 'maps.google.com' || url.hostname === 'maps.google.co.jp') {
    return url.pathname === '/' || url.pathname === '/maps' || url.pathname.startsWith('/maps/');
  }
  return url.pathname === '/maps' || url.pathname.startsWith('/maps/');
}

function coordsFromPair(latText: string, lngText: string): PropertyCoordinates | null {
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Parse a direct, allowlisted Google Maps URL without network requests. */
export function parseTrustedGoogleMapCoordinates(raw: string | null | undefined): PropertyCoordinates | null {
  const url = checkedUrl(raw);
  if (!url || !isDirectMapUrl(url)) return null;

  // "?q=lat,lng" is the format used by legacy Google Maps links.
  const q = url.searchParams.get('q');
  const number = String.raw`-?\d+(?:\.\d+)?`;
  const pairRegex = new RegExp('^\\s*(' + number + ')\\s*,\\s*(' + number + ')\\s*$');
  if (q) {
    const match = pairRegex.exec(q);
    if (match) return coordsFromPair(match[1], match[2]);
  }

  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { return null; }

  // Place pins may be explicitly encoded as !3d(latitude)!4d(longitude).
  // /@... is only the viewport center and must never be used to write coordinates.
  const pin = new RegExp('(?:^|!)3d(' + number + ')!4d(' + number + ')(?:!|$)').exec(path);
  if (pin) return coordsFromPair(pin[1], pin[2]);

  // "/maps/search/lat,+lng" and "/maps/place/lat,lng".
  const segment = new RegExp('/(?:search|place)/(' + number + '),\\+?(' + number + ')(?:/|$)').exec(path);
  if (segment) return coordsFromPair(segment[1], segment[2]);

  return null;
}

async function expandGoogleMapsShortUrl(url: URL): Promise<string | null> {
  // Never make a request to an untrusted host, even if the source has "goo.gl"
  // somewhere in its text.
  if (!isGoogleShortMapLink(url)) return null;

  return new Promise((resolve) => {
    const req = https.request({
      protocol: 'https:',
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'HEAD',
      timeout: 4000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }, (res) => {
      res.resume();
      if (![301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
        resolve(null);
        return;
      }
      const location = res.headers.location;
      if (!location || location.length > 2048) {
        resolve(null);
        return;
      }
      try {
        const redirected = new URL(location, url);
        // Validate immediately; we never follow or fetch the redirect.
        resolve(isDirectMapUrl(redirected) && checkedUrl(redirected.href) ? redirected.href : null);
      } catch {
        resolve(null);
      }
    });
    req.once('error', () => resolve(null));
    req.once('timeout', () => req.destroy());
    req.end();
  });
}

/**
 * Derive coordinates strictly from an existing server-stored Google Map URL.
 * Injected expander is for isolated, no-network tests only.
 */
export async function deriveTrustedPropertyCoordinates(
  sourceUrl: string | null | undefined,
  expander: ShortUrlExpander = expandGoogleMapsShortUrl,
): Promise<PropertyCoordinates | null> {
  const url = checkedUrl(sourceUrl);
  if (!url) return null;

  if (isDirectMapUrl(url)) return parseTrustedGoogleMapCoordinates(url.href);
  if (!isGoogleShortMapLink(url)) return null;

  const expanded = await expander(url);
  // A second short link or arbitrary redirect is never allowed.
  return parseTrustedGoogleMapCoordinates(expanded);
}
