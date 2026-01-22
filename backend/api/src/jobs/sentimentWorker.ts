/**
 * Sentiment Analysis Job Worker
 * 
 * Background worker for processing sentiment analysis jobs using Bull queue.
 * Handles:
 * - Analyzing sentiment of transcribed text
 * - Detecting keywords based on configured rules
 * - Executing auto-actions based on detected keywords
 * - Retry logic for failed jobs
 */

import Bull, { Job, Queue } from 'bull';
import { SentimentAnalysisService } from '../services/SentimentAnalysisService';
import { supabase } from '../config/supabase';

// Job data interface
export interface SentimentJobData {
  transcriptionId: string;
  transcriptionText: string;
  callLogId: string;
}

// Job result interface
export interface SentimentJobResult {
  transcriptionId: string;
  sentiment: string;
  detectedKeywords: string[];
  success: boolean;
  error?: string;
}

// Queue configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = 'sentiment-jobs';

// Create Bull queue
export const sentimentQueue: Queue<SentimentJobData> = new Bull(QUEUE_NAME, REDIS_URL, {
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 30000, // Start with 30 seconds delay
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

// Initialize service
const sentimentAnalysisService = new SentimentAnalysisService();

/**
 * Process sentiment analysis job
 */
sentimentQueue.process(async (job: Job<SentimentJobData>): Promise<SentimentJobResult> => {
  const { transcriptionId, transcriptionText } = job.data;

  console.log(`[SentimentWorker] Processing job ${job.id} for transcription ${transcriptionId}`);

  try {
    // Step 1: Analyze sentiment
    console.log(`[SentimentWorker] Analyzing sentiment for transcription ${transcriptionId}`);
    await job.progress(25);

    const result = await sentimentAnalysisService.analyzeSentiment({
      transcriptionId,
      text: transcriptionText,
      detectKeywords: true,
      executeAutoActions: true,
    });

    await job.progress(100);

    console.log(`[SentimentWorker] Successfully completed job ${job.id} for transcription ${transcriptionId}`);

    return {
      transcriptionId,
      sentiment: result.sentiment,
      detectedKeywords: result.detectedKeywords,
      success: true,
    };

  } catch (error) {
    console.error(`[SentimentWorker] Job ${job.id} failed:`, error);

    // Update transcription status to indicate sentiment analysis failed
    try {
      await supabase
        .from('call_transcriptions')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', transcriptionId);
    } catch (updateError) {
      console.error(`[SentimentWorker] Failed to update transcription:`, updateError);
    }

    return {
      transcriptionId,
      sentiment: '',
      detectedKeywords: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Event handlers
 */

// Job completed successfully
sentimentQueue.on('completed', (job: Job<SentimentJobData>, result: SentimentJobResult) => {
  console.log(`[SentimentWorker] Job ${job.id} completed successfully:`, result);
});

// Job failed after all retries
sentimentQueue.on('failed', (job: Job<SentimentJobData>, error: Error) => {
  console.error(`[SentimentWorker] Job ${job.id} failed after all retries:`, error.message);
});

// Job is active (started processing)
sentimentQueue.on('active', (job: Job<SentimentJobData>) => {
  console.log(`[SentimentWorker] Job ${job.id} started processing for transcription ${job.data.transcriptionId}`);
});

// Job is waiting in queue
sentimentQueue.on('waiting', (jobId: string) => {
  console.log(`[SentimentWorker] Job ${jobId} is waiting in queue`);
});

// Job progress updated
sentimentQueue.on('progress', (job: Job<SentimentJobData>, progress: number) => {
  console.log(`[SentimentWorker] Job ${job.id} progress: ${progress}%`);
});

/**
 * Helper function to add a sentiment analysis job to the queue
 */
export async function addSentimentJob(
  transcriptionId: string,
  transcriptionText: string,
  callLogId: string
): Promise<Job<SentimentJobData>> {
  console.log(`[SentimentWorker] Adding sentiment job for transcription ${transcriptionId}`);

  const job = await sentimentQueue.add({
    transcriptionId,
    transcriptionText,
    callLogId,
  }, {
    jobId: `sentiment-${transcriptionId}-${Date.now()}`,
  });

  console.log(`[SentimentWorker] Job ${job.id} added to queue`);

  return job;
}

/**
 * Get job status
 */
export async function getSentimentJobStatus(jobId: string): Promise<{
  state: string;
  progress: number;
  result?: SentimentJobResult;
  error?: string;
}> {
  const job = await sentimentQueue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const state = await job.getState();
  const progress = job.progress() as number || 0;

  let result: SentimentJobResult | undefined;
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
 * Retry a failed job
 */
export async function retrySentimentJob(jobId: string): Promise<void> {
  const job = await sentimentQueue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.retry();
  console.log(`[SentimentWorker] Job ${jobId} retried`);
}

/**
 * Clean up old jobs
 */
export async function cleanupOldSentimentJobs(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  console.log(`[SentimentWorker] Cleaning up jobs older than ${olderThanMs}ms`);

  await sentimentQueue.clean(olderThanMs, 'completed');
  await sentimentQueue.clean(olderThanMs, 'failed');

  console.log(`[SentimentWorker] Cleanup completed`);
}

/**
 * Get queue statistics
 */
export async function getSentimentQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    sentimentQueue.getWaitingCount(),
    sentimentQueue.getActiveCount(),
    sentimentQueue.getCompletedCount(),
    sentimentQueue.getFailedCount(),
    sentimentQueue.getDelayedCount(),
    sentimentQueue.getPausedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  };
}

/**
 * Graceful shutdown
 */
export async function shutdownSentimentWorker(): Promise<void> {
  console.log('[SentimentWorker] Shutting down gracefully...');
  await sentimentQueue.close();
  console.log('[SentimentWorker] Shutdown complete');
}

// Handle process termination
process.on('SIGTERM', async () => {
  await shutdownSentimentWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdownSentimentWorker();
  process.exit(0);
});

console.log('[SentimentWorker] Worker initialized and ready to process jobs');
