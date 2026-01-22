/**
 * AI電話統合機能の型定義
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * 通話方向
 */
export type CallDirection = 'inbound' | 'outbound';

/**
 * 通話ステータス
 */
export type CallStatus = 'completed' | 'missed' | 'failed' | 'busy' | 'no_answer';

/**
 * 文字起こしステータス
 */
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 感情分析結果
 */
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

/**
 * キーワードカテゴリ
 */
export type KeywordCategory = 'urgency' | 'interest' | 'objection' | 'contract';

/**
 * 自動アクション
 */
export type AutoAction = 'create_followup' | 'notify_manager' | 'flag_urgent';

/**
 * 録音ファイルフォーマット
 */
export type RecordingFormat = 'wav' | 'mp3' | 'mp4' | 'flac' | 'ogg';

// ============================================================================
// Database Models
// ============================================================================

/**
 * 通話ログ
 */
export interface CallLog {
  id: string;
  seller_id: string | null;
  user_id: string | null;
  
  // 通話情報
  direction: CallDirection;
  phone_number: string;
  call_status: CallStatus;
  
  // タイミング情報
  started_at: Date;
  ended_at: Date | null;
  duration_seconds: number | null;
  
  // AWS Connect情報
  contact_id: string | null;
  instance_id: string | null;
  queue_id: string | null;
  agent_id: string | null;
  
  // メタデータ
  created_at: Date;
  updated_at: Date;
}

/**
 * 通話文字起こし
 */
export interface CallTranscription {
  id: string;
  call_log_id: string;
  
  // 文字起こし内容
  transcription_text: string;
  transcription_json: TranscriptionSegment[] | null;
  language_code: string;
  confidence_score: number | null;
  
  // 処理情報
  transcription_status: TranscriptionStatus;
  transcription_job_id: string | null;
  error_message: string | null;
  
  // 感情分析結果
  sentiment: Sentiment | null;
  sentiment_scores: SentimentScores | null;
  
  // キーワード検出
  detected_keywords: string[] | null;
  
  // タイムスタンプ
  created_at: Date;
  updated_at: Date;
}

/**
 * 文字起こしセグメント（話者識別付き）
 */
export interface TranscriptionSegment {
  speaker: 'agent' | 'customer' | 'unknown';
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
}

/**
 * 感情スコア
 */
export interface SentimentScores {
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
}

/**
 * 通話録音
 */
export interface CallRecording {
  id: string;
  call_log_id: string;
  
  // S3ストレージ情報
  s3_bucket: string;
  s3_key: string;
  s3_region: string;
  
  // ファイル情報
  file_size_bytes: number | null;
  duration_seconds: number | null;
  format: string | null;
  
  // アクセス管理
  presigned_url: string | null;
  presigned_url_expires_at: Date | null;
  access_count: number;
  last_accessed_at: Date | null;
  last_accessed_by: string | null;
  
  // タイムスタンプ
  created_at: Date;
  updated_at: Date;
}

/**
 * キーワード検出ルール
 */
export interface CallKeyword {
  id: string;
  keyword: string;
  category: KeywordCategory | null;
  priority: number;
  auto_action: AutoAction | null;
  action_config: Record<string, any> | null;
  is_active: boolean;
  
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * 発信リクエスト
 */
export interface OutboundCallRequest {
  sellerId: string;
  phoneNumber: string;
  userId: string;
}

/**
 * 発信レスポンス
 */
export interface OutboundCallResponse {
  callLogId: string;
  contactId: string;
  status: 'initiated' | 'failed';
  startedAt: string;
  message?: string;
}

/**
 * 着信Webhookリクエスト
 */
export interface InboundCallWebhookRequest {
  contactId: string;
  phoneNumber: string;
  timestamp: string;
  eventType: 'call_started' | 'call_ended' | 'call_connected';
  instanceId?: string;
  queueId?: string;
  agentId?: string;
}

/**
 * 着信Webhookレスポンス
 */
export interface InboundCallWebhookResponse {
  callLogId: string;
  sellerId: string | null;
  matched: boolean;
  message?: string;
}

/**
 * 通話ログ一覧取得リクエスト
 */
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

/**
 * 通話ログ一覧レスポンス
 */
export interface GetCallLogsResponse {
  calls: CallLogWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 通話ログ詳細（結合データ）
 */
export interface CallLogWithDetails extends CallLog {
  transcription?: CallTranscription;
  recording?: CallRecording;
  seller_name?: string;
  seller_number?: string;
  user_name?: string;
}

/**
 * 文字起こし取得レスポンス
 */
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

/**
 * 録音ファイル取得レスポンス
 */
export interface GetRecordingResponse {
  recordingUrl: string;
  expiresAt: string;
  durationSeconds: number | null;
  format: string | null;
  fileSize: number | null;
}

/**
 * 通話統計リクエスト
 */
export interface GetCallStatisticsRequest {
  startDate: string;
  endDate: string;
  userId?: string;
  direction?: CallDirection;
}

/**
 * 通話統計レスポンス
 */
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

/**
 * ユーザー別通話統計
 */
export interface UserCallStatistics {
  userId: string;
  userName: string;
  callCount: number;
  averageDuration: number;
  totalDuration: number;
}

/**
 * キーワード統計
 */
export interface KeywordStatistics {
  keyword: string;
  count: number;
  category: KeywordCategory | null;
}

/**
 * AWS設定
 */
export interface AWSPhoneConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  connectInstanceId: string;
  connectInstanceArn: string;
  connectPhoneNumber: string;
  s3RecordingsBucket: string;
  transcribeCustomVocabulary?: string;
  enableSentimentAnalysis: boolean;
}

/**
 * AWS設定更新リクエスト
 */
export interface UpdateAWSConfigRequest {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  connectInstanceId?: string;
  connectInstanceArn?: string;
  connectPhoneNumber?: string;
  s3RecordingsBucket?: string;
  transcribeCustomVocabulary?: string;
  enableSentimentAnalysis?: boolean;
}

/**
 * AWS接続テストレスポンス
 */
export interface TestAWSConnectionResponse {
  success: boolean;
  services: {
    connect: { status: 'ok' | 'error'; message?: string };
    transcribe: { status: 'ok' | 'error'; message?: string };
    s3: { status: 'ok' | 'error'; message?: string };
    comprehend: { status: 'ok' | 'error'; message?: string };
  };
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * 通話開始オプション
 */
export interface StartCallOptions {
  sellerId: string;
  phoneNumber: string;
  userId: string;
  attributes?: Record<string, string>;
}

/**
 * 通話終了オプション
 */
export interface EndCallOptions {
  callLogId: string;
  endedAt: Date;
  durationSeconds: number;
  status: CallStatus;
}

/**
 * 文字起こしジョブオプション
 */
export interface TranscriptionJobOptions {
  callLogId: string;
  s3Bucket: string;
  s3Key: string;
  languageCode?: string;
  customVocabulary?: string;
  enableSpeakerLabels?: boolean;
}

/**
 * 感情分析オプション
 */
export interface SentimentAnalysisOptions {
  text: string;
  languageCode?: string;
}

/**
 * キーワード検出結果
 */
export interface KeywordDetectionResult {
  keyword: string;
  category: KeywordCategory | null;
  priority: number;
  autoAction: AutoAction | null;
  actionConfig: Record<string, any> | null;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * 電話サービスエラー
 */
export class PhoneServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: 'aws' | 'call' | 'transcription' | 'validation',
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'PhoneServiceError';
  }
}

/**
 * AWS接続エラー
 */
export class AWSConnectionError extends PhoneServiceError {
  constructor(message: string, service: string, details?: any) {
    super(message, 'AWS_CONNECTION_ERROR', 'aws', true, { service, ...details });
    this.name = 'AWSConnectionError';
  }
}

/**
 * 通話エラー
 */
export class CallError extends PhoneServiceError {
  constructor(message: string, code: string, retryable: boolean = false, details?: any) {
    super(message, code, 'call', retryable, details);
    this.name = 'CallError';
  }
}

/**
 * 文字起こしエラー
 */
export class TranscriptionError extends PhoneServiceError {
  constructor(message: string, code: string, retryable: boolean = false, details?: any) {
    super(message, code, 'transcription', retryable, details);
    this.name = 'TranscriptionError';
  }
}
