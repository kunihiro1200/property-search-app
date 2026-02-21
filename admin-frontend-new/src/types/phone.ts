/**
 * AI電話統合機能のフロントエンド型定義
 */

// ============================================================================
// Enums
// ============================================================================

export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'completed' | 'missed' | 'failed' | 'busy' | 'no_answer';
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

// ============================================================================
// Models
// ============================================================================

export interface CallLog {
  id: string;
  sellerId: string;
  userId: string | null;
  direction: CallDirection;
  phoneNumber: string;
  callStatus: CallStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  contactId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallTranscription {
  id: string;
  callLogId: string;
  transcriptionText: string;
  transcriptionJson: TranscriptionSegment[] | null;
  languageCode: string;
  confidenceScore: number | null;
  transcriptionStatus: TranscriptionStatus;
  sentiment: Sentiment | null;
  sentimentScores: SentimentScores | null;
  detectedKeywords: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptionSegment {
  speaker: 'agent' | 'customer' | 'unknown';
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface SentimentScores {
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
}

export interface CallRecording {
  id: string;
  callLogId: string;
  s3Bucket: string;
  s3Key: string;
  fileSizeBytes: number | null;
  durationSeconds: number | null;
  format: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallLogWithDetails extends CallLog {
  transcription?: CallTranscription;
  recording?: CallRecording;
  hasRecording?: boolean;
  sellerName?: string;
  sellerNumber?: string;
  userName?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface OutboundCallRequest {
  sellerId: string;
  phoneNumber: string;
  userId: string;
}

export interface OutboundCallResponse {
  callLogId: string;
  contactId: string;
  status: 'initiated' | 'failed';
  startedAt: string;
  message?: string;
}

export interface GetCallLogsRequest {
  page?: number;
  limit?: number;
  sellerId?: string;
  userId?: string;
  direction?: CallDirection;
  status?: CallStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: 'started_at' | 'duration_seconds';
  sortOrder?: 'asc' | 'desc';
}

export interface GetCallLogsResponse {
  calls: CallLogWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetTranscriptionResponse {
  callLogId: string;
  transcriptionText: string;
  transcriptionJson: TranscriptionSegment[] | null;
  sentiment: Sentiment | null;
  sentimentScores: SentimentScores | null;
  detectedKeywords: string[] | null;
  status: TranscriptionStatus;
  languageCode: string;
  confidenceScore: number | null;
}

export interface GetRecordingResponse {
  recordingUrl: string;
  expiresAt: string;
  durationSeconds: number | null;
  format: string | null;
  fileSize: number | null;
}

export interface GetCallStatisticsRequest {
  startDate: string;
  endDate: string;
  userId?: string;
  direction?: CallDirection;
}

export interface GetCallStatisticsResponse {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  averageDurationSeconds: number;
  totalDurationSeconds: number;
  callsByStatus: Record<CallStatus, number>;
  callsByUser: UserCallStatistics[];
  sentimentDistribution: Record<Sentiment, number>;
  topKeywords: KeywordStatistics[];
}

export interface UserCallStatistics {
  userId: string;
  userName: string;
  callCount: number;
  averageDuration: number;
  totalDuration: number;
}

export interface KeywordStatistics {
  keyword: string;
  count: number;
  category: string | null;
}

// ============================================================================
// UI Helper Types
// ============================================================================

export interface CallLogFilter {
  direction?: CallDirection;
  status?: CallStatus;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}

export interface CallLogSort {
  field: 'started_at' | 'duration_seconds';
  order: 'asc' | 'desc';
}
