/**
 * Transcription Job Worker
 * 
 * Background worker for processing call transcription jobs using Bull queue.
 * Handles:
 * - Starting transcription jobs with Amazon Transcribe
 * - Polling for job completion
 * - Retrieving and storing transcription results
 * - Triggering sentiment analysis after completion
 * - Retry logic for failed jobs
 */

import Bull, { Job, Queue } from 'bull';
import { TranscriptionService } from '../services/TranscriptionService';
import { addSentimentJob } from './sentimentWorker';
import { supabase } from '../config/supabase';

// Job data interface
export interface TranscriptionJobData {
  callLogId: string;
  recordingS3Bucket: string;
  recordingS3Key: string;
  languageCode?: string;
}

// Job result interface
export interface TranscriptionJobResult {
  callLogId: string;
  transcriptionId: string;
  success: boolean;
  error?: string;
}

// Queue configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = 'transcription-jobs';

// Create Bull queue
export const transcriptionQueue: Queue<TranscriptionJobData> = new Bull(QUEUE_NAME, REDIS_URL, {
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 60000, // Start with 1 minute delay
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

// Initialize services
const transcriptionService = new TranscriptionService();

/**
 * Process transcription job
 */
transcriptionQueue.process(async (job: Job<TranscriptionJobData>): Promise<TranscriptionJobResult> => {
  const { callLogId, recordingS3Bucket, recordingS3Key, languageCode } = job.data;

  console.log(`[TranscriptionWorker] Processing job ${job.id} for call log ${callLogId}`);

  try {
    // Step 1: Start transcription job
    console.log(`[TranscriptionWorker] Starting transcription for call log ${callLogId}`);
    const transcription = await transcriptionService.startTranscription({
      callLogId,
      s3Bucket: recordingS3Bucket,
      s3Key: recordingS3Key,
      languageCode: languageCode || 'ja-JP',
    });

    // Update job progress
    await job.progress(25);

    // Step 2: Poll for completion (with timeout)
    console.log(`[TranscriptionWorker] Polling for transcription job ${transcription.id}`);
    const maxPollingTime = 30 * 60 * 1000; // 30 minutes
    const pollingInterval = 10 * 1000; // 10 seconds
    const startTime = Date.now();

    let currentTranscription = transcription;
    let status = currentTranscription.transcription_status;
    
    while (status === 'processing' && (Date.now() - startTime) < maxPollingTime) {
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
      
      currentTranscription = await transcriptionService.checkTranscriptionStatus(transcription.id);
      status = currentTranscription.transcription_status;
      
      // Update progress (25% to 75% during polling)
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(75, 25 + (elapsedTime / maxPollingTime) * 50);
      await job.progress(progress);

      console.log(`[TranscriptionWorker] Job ${transcription.id} status: ${status}`);
    }

    if (status !== 'completed') {
      throw new Error(`Transcription job failed or timed out. Status: ${status}`);
    }

    await job.progress(85);

    // Step 3: Trigger sentiment analysis job (non-blocking)
    console.log(`[TranscriptionWorker] Adding sentiment analysis job for transcription ${currentTranscription.id}`);
    try {
      await addSentimentJob(
        currentTranscription.id,
        currentTranscription.transcription_text || '',
        callLogId
      );
      console.log(`[TranscriptionWorker] Sentiment analysis job added successfully`);
    } catch (sentimentError) {
      // Log error but don't fail the job
      console.error(`[TranscriptionWorker] Failed to add sentiment analysis job (non-critical):`, sentimentError);
    }

    await job.progress(100);

    console.log(`[TranscriptionWorker] Successfully completed job ${job.id} for call log ${callLogId}`);

    return {
      callLogId,
      transcriptionId: currentTranscription.id,
      success: true,
    };

  } catch (error) {
    console.error(`[TranscriptionWorker] Job ${job.id} failed:`, error);

    // Update transcription status to failed
    try {
      await supabase
        .from('call_transcriptions')
        .update({
          transcription_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('call_log_id', callLogId);
    } catch (updateError) {
      console.error(`[TranscriptionWorker] Failed to update transcription status:`, updateError);
    }

    return {
      callLogId,
      transcriptionId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Event handlers
 */

// Job completed successfully
transcriptionQueue.on('completed', (job: Job<TranscriptionJobData>, result: TranscriptionJobResult) => {
  console.log(`[TranscriptionWorker] Job ${job.id} completed successfully:`, result);
});

// Job failed after all retries
transcriptionQueue.on('failed', (job: Job<TranscriptionJobData>, error: Error) => {
  console.error(`[TranscriptionWorker] Job ${job.id} failed after all retries:`, error.message);
});

// Job is active (started processing)
transcriptionQueue.on('active', (job: Job<TranscriptionJobData>) => {
  console.log(`[TranscriptionWorker] Job ${job.id} started processing for call log ${job.data.callLogId}`);
});

// Job is waiting in queue
transcriptionQueue.on('waiting', (jobId: string) => {
  console.log(`[TranscriptionWorker] Job ${jobId} is waiting in queue`);
});

// Job progress updated
transcriptionQueue.on('progress', (job: Job<TranscriptionJobData>, progress: number) => {
  console.log(`[TranscriptionWorker] Job ${job.id} progress: ${progress}%`);
});

/**
 * Helper function to add a transcription job to the queue
 */
export async function addTranscriptionJob(
  callLogId: string,
  recordingS3Bucket: string,
  recordingS3Key: string,
  languageCode?: string
): Promise<Job<TranscriptionJobData>> {
  console.log(`[TranscriptionWorker] Adding transcription job for call log ${callLogId}`);

  const job = await transcriptionQueue.add({
    callLogId,
    recordingS3Bucket,
    recordingS3Key,
    languageCode,
  }, {
    jobId: `transcription-${callLogId}-${Date.now()}`,
  });

  console.log(`[TranscriptionWorker] Job ${job.id} added to queue`);

  return job;
}

/**
 * Get job status
 */
export async function getTranscriptionJobStatus(jobId: string): Promise<{
  state: string;
  progress: number;
  result?: TranscriptionJobResult;
  error?: string;
}> {
  const job = await transcriptionQueue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const state = await job.getState();
  const progress = job.progress() as number || 0;

  let result: TranscriptionJobResult | undefined;
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
export async function retryTranscriptionJob(jobId: string): Promise<void> {
  const job = await transcriptionQueue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.retry();
  console.log(`[TranscriptionWorker] Job ${jobId} retried`);
}

/**
 * Clean up old jobs
 */
export async function cleanupOldJobs(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  console.log(`[TranscriptionWorker] Cleaning up jobs older than ${olderThanMs}ms`);

  await transcriptionQueue.clean(olderThanMs, 'completed');
  await transcriptionQueue.clean(olderThanMs, 'failed');

  console.log(`[TranscriptionWorker] Cleanup completed`);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    transcriptionQueue.getWaitingCount(),
    transcriptionQueue.getActiveCount(),
    transcriptionQueue.getCompletedCount(),
    transcriptionQueue.getFailedCount(),
    transcriptionQueue.getDelayedCount(),
    transcriptionQueue.getPausedCount(),
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
export async function shutdownTranscriptionWorker(): Promise<void> {
  console.log('[TranscriptionWorker] Shutting down gracefully...');
  await transcriptionQueue.close();
  console.log('[TranscriptionWorker] Shutdown complete');
}

// Handle process termination
process.on('SIGTERM', async () => {
  await shutdownTranscriptionWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdownTranscriptionWorker();
  process.exit(0);
});

console.log('[TranscriptionWorker] Worker initialized and ready to process jobs');
