/**
 * Never overwrite existing property_details with blank source cells.
 *
 * Athome sheet fields are optional in practice. In particular, favorite
 * comments and panorama N1 are often deliberately empty. Sync must not
 * change a nonempty DB field to null/[] in those cases.
 *
 * A panorama may share athome_data with a Drive folder or legacy metadata.
 * Preserve unknown array layouts rather than guessing which entry to erase.
 */
export interface AthomeSourceSnapshot {
  favoriteComment: string | null;
  recommendedComments: string[];
  panoramaUrl: string | null;
}

export interface NonDestructiveAthomePatch {
  favorite_comment?: string;
  recommended_comments?: string[];
  athome_data?: unknown[];
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isKnownPanorama(value: unknown): value is string {
  return isNonemptyString(value) &&
    value.startsWith('https://vrpanorama.athome.jp/');
}

function isGoogleDriveLink(value: unknown): value is string {
  return isNonemptyString(value) &&
    value.startsWith('https://drive.google.com/');
}

/**
 * Creates a partial DB update. An empty object means the source had nothing
 * new worth writing; this is not an error and must not insert an empty row.
 */
export function createNonDestructiveAthomePatch(
  source: AthomeSourceSnapshot,
  existingAthomeData: unknown
): NonDestructiveAthomePatch {
  const patch: NonDestructiveAthomePatch = {};

  if (isNonemptyString(source.favoriteComment)) {
    patch.favorite_comment = source.favoriteComment;
  }

  const comments = Array.isArray(source.recommendedComments)
    ? source.recommendedComments.filter(isNonemptyString)
    : [];
  if (comments.length > 0) {
    patch.recommended_comments = comments;
  }

  if (!isNonemptyString(source.panoramaUrl)) return patch;

  const existing = Array.isArray(existingAthomeData) ? existingAthomeData : [];
  if (existing.includes(source.panoramaUrl)) return patch;

  if (existing.length === 0) {
    patch.athome_data = [source.panoramaUrl];
  } else if (existing.length === 1 && isKnownPanorama(existing[0])) {
    patch.athome_data = [source.panoramaUrl];
  } else if (existing.length === 1 && isGoogleDriveLink(existing[0])) {
    patch.athome_data = [existing[0], source.panoramaUrl];
  } else if (existing.length >= 2 && isKnownPanorama(existing[1])) {
    patch.athome_data = [existing[0], source.panoramaUrl, ...existing.slice(2)];
  } else {
    // Unknown legacy data (including two-item arrays with opaque metadata):
    // do not risk deleting or reordering any existing item.
  }
  return patch;
}
