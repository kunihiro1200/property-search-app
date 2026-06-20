#!/usr/bin/env node
/**
 * Transcription Worker Process
 * 
 * Standalone worker process for processing transcription jobs.
 * Run this as a separate process from the main API server.
 * 
 * Usage:
 *   npm run worker:transcription
 *   or
 *   ts-node src/workers/transcription.ts
 */

import dotenv from 'dotenv';
import '../jobs/transcriptionWorker';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

console.log('='.repeat(60));
console.log('Transcription Worker Process');
console.log('='.repeat(60));
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log(`AWS Region: ${process.env.AWS_REGION || 'ap-northeast-1'}`);
console.log(`AWS Mock Mode: ${process.env.USE_AWS_MOCK || 'auto-detect'}`);
console.log('='.repeat(60));
console.log('Worker is now listening for transcription jobs...');
console.log('Press Ctrl+C to stop');
console.log('='.repeat(60));

// Keep the process alive
process.stdin.resume();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in worker process:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in worker process:', { reason, promise });
  process.exit(1);
});
