/**
 * AWS Services Index
 * すべてのAWSクライアントをエクスポート
 */

export { AmazonConnectClient, getConnectClient } from './ConnectClient';
export { AmazonTranscribeClient, getTranscribeClient } from './TranscribeClient';
export { AmazonS3Client, getS3Client } from './S3Client';
export { AmazonComprehendClient, getComprehendClient } from './ComprehendClient';

export type {
  StartOutboundCallParams,
  StartOutboundCallResponse,
} from './ConnectClient';

export type {
  StartTranscriptionJobParams,
  TranscriptionJob,
  TranscriptionJobStatus,
  TranscriptionResult,
  TranscriptionSegment,
  SpeakerLabel,
} from './TranscribeClient';

export type {
  UploadFileParams,
  GetPresignedUrlParams,
  CopyFileParams,
} from './S3Client';

export type {
  SentimentAnalysisResult,
  KeyPhrase,
  Entity,
} from './ComprehendClient';
