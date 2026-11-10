/**
 * Validate an anonymous public-page coordinate caching request.
 *
 * This is an incremental defense, NOT proof of origin: the caller is still
 * untrusted and can provide an arbitrary valid coordinate for an empty row.
 * The route must use a fill-only atomic update and must never overwrite an
 * existing value. A later migration can fully remove anonymous writes.
 */
export interface ValidCoordinates {
  latitude: number;
  longitude: number;
}

export function validatePublicCoordinateInput(
  input: unknown
): ValidCoordinates | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  const { latitude, longitude } = body;

  // Existing public frontend sends JSON numbers. Do not coerce strings,
  // undefined, null, boolean, objects, NaN, or Infinity.
  if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}
