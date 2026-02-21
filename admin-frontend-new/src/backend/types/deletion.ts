/**
 * Types for Spreadsheet Deletion Sync Feature
 * 
 * This file contains all TypeScript interfaces and types related to
 * the soft delete functionality for sellers and properties.
 */

/**
 * Result of validating whether a seller can be safely deleted
 */
export interface ValidationResult {
  /** Whether the seller can be safely deleted */
  canDelete: boolean;
  
  /** Reason why the seller cannot be deleted (if canDelete is false) */
  reason?: string;
  
  /** Whether this deletion requires manual review by an admin */
  requiresManualReview: boolean;
  
  /** Additional context about the validation */
  details?: {
    hasActiveContract?: boolean;
    hasRecentActivity?: boolean;
    hasActivePropertyListings?: boolean;
    lastActivityDate?: Date;
    contractStatus?: string;
  };
}

/**
 * Result of a single seller deletion operation
 */
export interface DeletionResult {
  /** Seller number that was deleted */
  sellerNumber: string;
  
  /** Whether the deletion was successful */
  success: boolean;
  
  /** Error message if deletion failed */
  error?: string;
  
  /** ID of the audit record created */
  auditId?: number;
  
  /** Timestamp when the deletion occurred */
  deletedAt?: Date;
}

/**
 * Result of syncing all deleted sellers
 */
export interface DeletionSyncResult {
  /** Total number of sellers detected as deleted from spreadsheet */
  totalDetected: number;
  
  /** Number of sellers successfully deleted */
  successfullyDeleted: number;
  
  /** Number of sellers that failed to delete */
  failedToDelete: number;
  
  /** Number of sellers requiring manual review */
  requiresManualReview: number;
  
  /** List of successfully deleted seller numbers */
  deletedSellerNumbers: string[];
  
  /** List of seller numbers requiring manual review */
  manualReviewSellerNumbers: string[];
  
  /** List of deletion errors */
  errors: Array<{
    sellerNumber: string;
    error: string;
  }>;
  
  /** Timestamp when the sync started */
  startedAt: Date;
  
  /** Timestamp when the sync completed */
  completedAt: Date;
  
  /** Duration of the sync in milliseconds */
  durationMs: number;
}

/**
 * Complete sync result including both additions and deletions
 */
export interface CompleteSyncResult {
  /** Result of adding/updating sellers from spreadsheet */
  additionResult: {
    totalProcessed: number;
    successfullyAdded: number;
    successfullyUpdated: number;
    failed: number;
  };
  
  /** Result of deleting sellers not in spreadsheet */
  deletionResult: DeletionSyncResult;
  
  /** Overall sync status */
  status: 'success' | 'partial_success' | 'failed';
  
  /** Overall sync timestamp */
  syncedAt: Date;
  
  /** Total duration of the complete sync */
  totalDurationMs: number;
}

/**
 * Result of recovering a deleted seller
 */
export interface RecoveryResult {
  /** Whether the recovery was successful */
  success: boolean;
  
  /** Seller number that was recovered */
  sellerNumber: string;
  
  /** Error message if recovery failed */
  error?: string;
  
  /** Timestamp when the seller was recovered */
  recoveredAt?: Date;
  
  /** Who performed the recovery */
  recoveredBy?: string;
  
  /** Details about what was recovered */
  details?: {
    sellerRestored: boolean;
    propertiesRestored: number;
    auditRecordUpdated: boolean;
  };
}

/**
 * Audit record for a deleted seller
 */
export interface SellerDeletionAudit {
  id: number;
  sellerId: number;
  sellerNumber: string;
  deletedAt: Date;
  deletedBy: string;
  reason: string | null;
  sellerData: any; // Full JSON backup of seller data
  canRecover: boolean;
  recoveredAt: Date | null;
  recoveredBy: string | null;
  createdAt: Date;
}

/**
 * Configuration for deletion sync
 */
export interface DeletionSyncConfig {
  /** Whether deletion sync is enabled */
  enabled: boolean;
  
  /** Whether to use strict validation (reject if any concerns) */
  strictValidation: boolean;
  
  /** Number of days to consider as "recent activity" */
  recentActivityDays: number;
  
  /** Whether to send alerts for manual review cases */
  sendAlerts: boolean;
  
  /** Maximum number of sellers to delete in one sync */
  maxDeletionsPerSync: number;
}

/**
 * Statistics about deletion sync operations
 */
export interface DeletionSyncStats {
  /** Total number of sellers deleted (all time) */
  totalDeleted: number;
  
  /** Number of sellers deleted today */
  deletedToday: number;
  
  /** Number of sellers deleted this week */
  deletedThisWeek: number;
  
  /** Number of sellers currently requiring manual review */
  pendingManualReview: number;
  
  /** Number of sellers recovered (all time) */
  totalRecovered: number;
  
  /** Last sync timestamp */
  lastSyncAt: Date | null;
  
  /** Average deletions per sync */
  avgDeletionsPerSync: number;
}
