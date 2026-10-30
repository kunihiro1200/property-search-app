/**
 * Temporary migration controls for the legacy GAS-compatible sync trigger.
 *
 * Default is intentionally compatibility mode, because the real bound Apps
 * Script source and its installed triggers have not yet been audited.
 * Auth enforcement must only be turned on after all live callers have migrated.
 *
 * Do NOT log or return headers or credentials. Only log this safe category.
 */
export type LegacySyncAuthorizationKind = 'machine' | 'other_bearer' | 'none';

export function classifyLegacySyncAuthorization(
  authorizationHeader: string | undefined,
  machineSecret: string | undefined
): LegacySyncAuthorizationKind {
  if (machineSecret && authorizationHeader === `Bearer ${machineSecret}`) {
    return 'machine';
  }
  if (authorizationHeader?.startsWith('Bearer ') && authorizationHeader.length > 7) {
    return 'other_bearer';
  }
  return 'none';
}

/** Only an exact server-side flag value enables enforcement. */
export function isLegacySyncAuthEnforced(flag: string | undefined): boolean {
  return flag === 'true';
}
