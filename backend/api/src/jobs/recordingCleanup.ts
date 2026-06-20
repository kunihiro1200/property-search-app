/**
 * Recording Cleanup Job Worker
 * 
 * Background worker for cleaning up old call recordings using Bull queue.
 * Handles:
 * - Detecting old recordings based on retention policy
 * - Archiving recordings to Glacier storage (optional)
 * - Deleting recordings from S3
 * - Updating database records
 * - Scheduled execution via cron
 */

import Bull, { Job, Queue } from 'bull';
import { RecordingService } from '../services/RecordingService';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';

// Job data interface
export interface RecordingCleanupJobData {
  retentionDays: number;
  archiveDays?: number;
  dryRun?: boolean;
  batchSize?: number;
}

// Job result interface
export interface RecordingCleanupJobResult {
  success: boolean;
  recordingsProcessed: number;
  recordingsArchived: number;
  recordingsDeleted: number;
  errors: string[];
  dryRun: boolean;
}

// Queue configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = 'recording-cleanup-jobs';

// Default configuration
const DEFAULT_RETENTION_DAYS = 90; // 90日間保持
const DEFAULT_ARCHIVE_DAYS = 30; // 30日後にアーカイブ
const DEFAULT_BATCH_SIZE = 100; // 一度に処理する件数
const ARCHIVE_BUCKET = process.env.S3_ARCHIVE_BUCKET || 'seller-system-call-recordings-archive';

// Create Bull queue
export const recordingCleanupQueue: Queue<RecordingCleanupJobData> = new Bull(QUEUE_NAME, REDIS_URL, {
  defaultJobOptions: {
    attempts: 2, // Retry once on failure
    backoff: {
      type: 'exponential',
      delay: 300000, // 5 minutes
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

// Initialize services
const recordingService = new RecordingService();

/**
 * Process recording cleanup job
 */
recordingCleanupQueue.process(async (job: Job<RecordingCleanupJobData>): Promise<RecordingCleanupJobResult> => {
  const {
    retentionDays = DEFAULT_RETENTION_DAYS,
    archiveDays = DEFAULT_ARCHIVE_DAYS,
    dryRun = false,
    batchSize = DEFAULT_BATCH_SIZE,
  } = job.data;

  logger.info(`[RecordingCleanup] Starting cleanup job ${job.id}`, {
    retentionDays,
    archiveDays,
    dryRun,
    batchSize,
  });

  const result: RecordingCleanupJobResult = {
    success: true,
    recordingsProcessed: 0,
    recordingsArchived: 0,
    recordingsDeleted: 0,
    errors: [],
    dryRun,
  };

  try {
    // Calculate cutoff dates
    const deleteCutoffDate = new Date();
    deleteCutoffDate.setDate(deleteCutoffDate.getDate() - retentionDays);

    const archiveCutoffDate = new Date();
    archiveCutoffDate.setDate(archiveCutoffDate.getDate() - archiveDays);

    logger.info(`[RecordingCleanup] Cutoff dates calculated`, {
      deleteCutoff: deleteCutoffDate.toISOString(),
      archiveCutoff: archiveCutoffDate.toISOString(),
    });

    // Step 1: Find recordings to delete (older than retention period)
    const { data: recordingsToDelete, error: deleteQueryError } = await supabase
      .from('call_recordings')
      .select('id, call_log_id, s3_bucket, s3_key, created_at')
      .lt('created_at', deleteCutoffDate.toISOString())
      .limit(batchSize);

    if (deleteQueryError) {
      throw deleteQueryError;
    }

    logger.info(`[RecordingCleanup] Found ${recordingsToDelete?.length || 0} recordings to delete`);

    // Step 2: Find recordings to archive (older than archive period but newer than retention period)
    const { data: recordingsToArchive, error: archiveQueryError } = await supabase
      .from('call_recordings')
      .select('id, call_log_id, s3_bucket, s3_key, created_at')
      .lt('created_at', archiveCutoffDate.toISOString())
      .gte('created_at', deleteCutoffDate.toISOString())
      .is('s3_bucket', ARCHIVE_BUCKET) // Only archive if not already archived
      .limit(batchSize);

    if (archiveQueryError) {
      throw archiveQueryError;
    }

    logger.info(`[RecordingCleanup] Found ${recordingsToArchive?.length || 0} recordings to archive`);

    await job.progress(10);

    // Step 3: Archive recordings
    if (recordingsToArchive && recordingsToArchive.length > 0) {
      for (let i = 0; i < recordingsToArchive.length; i++) {
        const recording = recordingsToArchive[i];
        result.recordingsProcessed++;

        try {
          if (!dryRun) {
            await recordingService.archiveRecording(recording.id, ARCHIVE_BUCKET);
          }
          result.recordingsArchived++;
          logger.info(`[RecordingCleanup] ${dryRun ? '[DRY RUN] ' : ''}Archived recording ${recording.id}`);
        } catch (error) {
          const errorMsg = `Failed to archive recording ${recording.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          logger.error(`[RecordingCleanup] ${errorMsg}`, { error, recording });
          result.errors.push(errorMsg);
        }

        // Update progress (10% to 50% for archiving)
        const progress = 10 + Math.floor((i / recordingsToArchive.length) * 40);
        await job.progress(progress);
      }
    }

    await job.progress(50);

    // Step 4: Delete old recordings
    if (recordingsToDelete && recordingsToDelete.length > 0) {
      for (let i = 0; i < recordingsToDelete.length; i++) {
        const recording = recordingsToDelete[i];
        result.recordingsProcessed++;

        try {
          if (!dryRun) {
            await recordingService.deleteRecording(recording.id);
          }
          result.recordingsDeleted++;
          logger.info(`[RecordingCleanup] ${dryRun ? '[DRY RUN] ' : ''}Deleted recording ${recording.id}`);
        } catch (error) {
          const errorMsg = `Failed to delete recording ${recording.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          logger.error(`[RecordingCleanup] ${errorMsg}`, { error, recording });
          result.errors.push(errorMsg);
        }

        // Update progress (50% to 90% for deletion)
        const progress = 50 + Math.floor((i / recordingsToDelete.length) * 40);
        await job.progress(progress);
      }
    }

    await job.progress(100);

    logger.info(`[RecordingCleanup] Job ${job.id} completed successfully`, result);

    return result;

  } catch (error) {
    logger.error(`[RecordingCleanup] Job ${job.id} failed:`, error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
});

/**
 * Event handlers
 */

// Job completed successfully
recordingCleanupQueue.on('completed', (job: Job<RecordingCleanupJobData>, result: RecordingCleanupJobResult) => {
  logger.info(`[RecordingCleanup] Job ${job.id} completed`, {
    processed: result.recordingsProcessed,
    archived: result.recordingsArchived,
    deleted: result.recordingsDeleted,
    errors: result.errors.length,
  });
});

// Job failed after all retries
recordingCleanupQueue.on('failed', (job: Job<RecordingCleanupJobData>, error: Error) => {
  logger.error(`[RecordingCleanup] Job ${job.id} failed after all retries:`, error.message);
});

// Job is active (started processing)
recordingCleanupQueue.on('active', (job: Job<RecordingCleanupJobData>) => {
  logger.info(`[RecordingCleanup] Job ${job.id} started processing`);
});

/**
 * Helper function to add a cleanup job to the queue
 */
export async function addRecordingCleanupJob(
  options: RecordingCleanupJobData = {}
): Promise<Job<RecordingCleanupJobData>> {
  logger.info('[RecordingCleanup] Adding cleanup job to queue', options);

  const job = await recordingCleanupQueue.add(
    {
      retentionDays: options.retentionDays || DEFAULT_RETENTION_DAYS,
      archiveDays: options.archiveDays || DEFAULT_ARCHIVE_DAYS,
      dryRun: options.dryRun || false,
      batchSize: options.batchSize || DEFAULT_BATCH_SIZE,
    },
    {
      jobId: `cleanup-${Date.now()}`,
    }
  );

  logger.info(`[RecordingCleanup] Job ${job.id} added to queue`);

  return job;
}

/**
 * Schedule recurring cleanup job (cron)
 * Default: Run daily at 2:00 AM
 */
export async function scheduleRecordingCleanup(
  cronExpression: string = '0 2 * * *', // Daily at 2:00 AM
  options: RecordingCleanupJobData = {}
): Promise<Bull.JobId> {
  logger.info('[RecordingCleanup] Scheduling recurring cleanup job', {
    cron: cronExpression,
    options,
  });

  const job = await recordingCleanupQueue.add(
    {
      retentionDays: options.retentionDays || DEFAULT_RETENTION_DAYS,
      archiveDays: options.archiveDays || DEFAULT_ARCHIVE_DAYS,
      dryRun: options.dryRun || false,
      batchSize: options.batchSize || DEFAULT_BATCH_SIZE,
    },
    {
      jobId: 'scheduled-cleanup',
      repeat: {
        cron: cronExpression,
        tz: 'Asia/Tokyo',
      },
    }
  );

  logger.info(`[RecordingCleanup] Scheduled job created with ID: ${job.id}`);

  return job.id;
}

/**
 * Remove scheduled cleanup job
 */
export async function removeScheduledCleanup(): Promise<void> {
  logger.info('[RecordingCleanup] Removing scheduled cleanup job');

  const repeatableJobs = await recordingCleanupQueue.getRepeatableJobs();
  
  for (const job of repeatableJobs) {
    if (job.id === 'scheduled-cleanup') {
      await recordingCleanupQueue.removeRepeatableByKey(job.key);
      logger.info('[RecordingCleanup] Scheduled job removed');
    }
  }
}

/**
 * Get job status
 */
export async function getCleanupJobStatus(jobId: string): Promise<{
  state: string;
  progress: number;
  result?: RecordingCleanupJobResult;
  error?: string;
}> {
  const job = await recordingCleanupQueue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const state = await job.getState();
  const progress = job.progress() as number || 0;

  let result: RecordingCleanupJobResult | undefined;
  let error: string | undefined;

  if (state === 'completed') {
    result = job.returnvalue;
  } else if (state === 'failed') {
    error = job.failedReason;
  }

  return {
    state,
    progress,
    result,
    error,
  };
}

/**
 * Get queue statistics
 */
export async function getCleanupQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  repeatable: number;
}> {
  const [waiting, active, completed, failed, delayed, paused, repeatableJobs] = await Promise.all([
    recordingCleanupQueue.getWaitingCount(),
    recordingCleanupQueue.getActiveCount(),
    recordingCleanupQueue.getCompletedCount(),
    recordingCleanupQueue.getFailedCount(),
    recordingCleanupQueue.getDelayedCount(),
    recordingCleanupQueue.getPausedCount(),
    recordingCleanupQueue.getRepeatableJobs(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
    repeatable: repeatableJobs.length,
  };
}

/**
 * Run cleanup immediately (for testing or manual execution)
 */
export async function runCleanupNow(
  options: RecordingCleanupJobData = {}
): Promise<RecordingCleanupJobResult> {
  logger.info('[RecordingCleanup] Running cleanup immediately', options);

  const job = await addRecordingCleanupJob(options);
  
  // Wait for job to complete
  return new Promise((resolve, reject) => {
    job.finished()
      .then((result) => {
        logger.info('[RecordingCleanup] Immediate cleanup completed', result);
        resolve(result);
      })
      .catch((error) => {
        logger.error('[RecordingCleanup] Immediate cleanup failed', error);
        reject(error);
      });
  });
}

/**
 * Graceful shutdown
 */
export async function shutdownRecordingCleanupWorker(): Promise<void> {
  logger.info('[RecordingCleanup] Shutting down gracefully...');
  await recordingCleanupQueue.close();
  logger.info('[RecordingCleanup] Shutdown complete');
}

// Handle process termination
process.on('SIGTERM', async () => {
  await shutdownRecordingCleanupWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdownRecordingCleanupWorker();
  process.exit(0);
});

logger.info('[RecordingCleanup] Worker initialized and ready to process jobs');

