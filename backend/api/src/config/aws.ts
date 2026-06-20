/**
 * AWS設定とバリデーション
 */

import { PhoneServiceError } from '../types/phone';

/**
 * AWS設定インターフェース
 */
export interface AWSConfig {
  // AWS基本設定
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  
  // Amazon Connect設定
  connect: {
    instanceId: string;
    instanceArn: string;
    contactFlowId: string;
    phoneNumber: string;
  };
  
  // Amazon S3設定
  s3: {
    recordingsBucket: string;
    region: string;
  };
  
  // Amazon Transcribe設定
  transcribe: {
    customVocabulary?: string;
    languageCode: string;
  };
  
  // Amazon Comprehend設定
  comprehend: {
    enabled: boolean;
  };
  
  // 機能フラグ
  features: {
    phoneIntegrationEnabled: boolean;
    inboundCallsEnabled: boolean;
    outboundCallsEnabled: boolean;
  };
}

/**
 * 環境変数からAWS設定を読み込む
 */
export function loadAWSConfig(): AWSConfig {
  const config: AWSConfig = {
    region: process.env.AWS_REGION || 'ap-northeast-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    
    connect: {
      instanceId: process.env.AMAZON_CONNECT_INSTANCE_ID || '',
      instanceArn: process.env.AMAZON_CONNECT_INSTANCE_ARN || '',
      contactFlowId: process.env.AMAZON_CONNECT_CONTACT_FLOW_ID || '',
      phoneNumber: process.env.AMAZON_CONNECT_PHONE_NUMBER || '',
    },
    
    s3: {
      recordingsBucket: process.env.S3_RECORDINGS_BUCKET || '',
      region: process.env.AWS_REGION || 'ap-northeast-1',
    },
    
    transcribe: {
      customVocabulary: process.env.TRANSCRIBE_CUSTOM_VOCABULARY,
      languageCode: 'ja-JP',
    },
    
    comprehend: {
      enabled: process.env.ENABLE_SENTIMENT_ANALYSIS === 'true',
    },
    
    features: {
      phoneIntegrationEnabled: process.env.ENABLE_PHONE_INTEGRATION === 'true',
      inboundCallsEnabled: process.env.ENABLE_INBOUND_CALLS === 'true',
      outboundCallsEnabled: process.env.ENABLE_OUTBOUND_CALLS === 'true',
    },
  };
  
  return config;
}

/**
 * AWS設定をバリデーション
 */
export function validateAWSConfig(config: AWSConfig): void {
  const errors: string[] = [];
  
  // 機能が無効な場合はバリデーションをスキップ
  if (!config.features.phoneIntegrationEnabled) {
    return;
  }
  
  // AWS基本設定のバリデーション
  if (!config.region) {
    errors.push('AWS_REGION is required');
  }
  
  if (!config.accessKeyId) {
    errors.push('AWS_ACCESS_KEY_ID is required');
  }
  
  if (!config.secretAccessKey) {
    errors.push('AWS_SECRET_ACCESS_KEY is required');
  }
  
  // Amazon Connect設定のバリデーション
  if (config.features.inboundCallsEnabled || config.features.outboundCallsEnabled) {
    if (!config.connect.instanceId) {
      errors.push('AMAZON_CONNECT_INSTANCE_ID is required when phone calls are enabled');
    }
    
    if (!config.connect.instanceArn) {
      errors.push('AMAZON_CONNECT_INSTANCE_ARN is required when phone calls are enabled');
    }
    
    if (config.features.outboundCallsEnabled) {
      if (!config.connect.contactFlowId) {
        errors.push('AMAZON_CONNECT_CONTACT_FLOW_ID is required for outbound calls');
      }
      
      if (!config.connect.phoneNumber) {
        errors.push('AMAZON_CONNECT_PHONE_NUMBER is required for outbound calls');
      } else if (!isValidPhoneNumber(config.connect.phoneNumber)) {
        errors.push('AMAZON_CONNECT_PHONE_NUMBER must be in E.164 format (e.g., +81-90-1234-5678)');
      }
    }
  }
  
  // S3設定のバリデーション
  if (!config.s3.recordingsBucket) {
    errors.push('S3_RECORDINGS_BUCKET is required');
  }
  
  // エラーがある場合は例外をスロー
  if (errors.length > 0) {
    throw new PhoneServiceError(
      `AWS configuration validation failed:\n${errors.join('\n')}`,
      'AWS_CONFIG_INVALID',
      'validation',
      false,
      { errors }
    );
  }
}

/**
 * 電話番号がE.164形式かチェック
 */
function isValidPhoneNumber(phoneNumber: string): boolean {
  // E.164形式: +[国コード][番号]
  // 例: +81-90-1234-5678 または +819012345678
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  const normalizedNumber = phoneNumber.replace(/[-\s]/g, '');
  return e164Regex.test(normalizedNumber);
}

/**
 * 電話番号をE.164形式に正規化
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // ハイフンとスペースを削除
  let normalized = phoneNumber.replace(/[-\s]/g, '');
  
  // +がない場合は追加（日本の番号と仮定）
  if (!normalized.startsWith('+')) {
    // 0から始まる場合は0を削除して+81を追加
    if (normalized.startsWith('0')) {
      normalized = '+81' + normalized.substring(1);
    } else {
      normalized = '+81' + normalized;
    }
  }
  
  return normalized;
}

/**
 * AWS設定が有効かチェック
 */
export function isAWSConfigured(): boolean {
  try {
    const config = loadAWSConfig();
    
    // 機能が無効な場合はfalse
    if (!config.features.phoneIntegrationEnabled) {
      return false;
    }
    
    validateAWSConfig(config);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * AWS設定を取得（バリデーション付き）
 */
export function getAWSConfig(): AWSConfig {
  const config = loadAWSConfig();
  validateAWSConfig(config);
  return config;
}

/**
 * AWS認証情報を取得
 */
export function getAWSCredentials() {
  const config = loadAWSConfig();
  
  return {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };
}

/**
 * AWS設定のマスク版を取得（ログ出力用）
 */
export function getMaskedAWSConfig(config: AWSConfig): any {
  return {
    region: config.region,
    accessKeyId: maskString(config.accessKeyId),
    secretAccessKey: '***MASKED***',
    connect: {
      instanceId: config.connect.instanceId,
      instanceArn: config.connect.instanceArn,
      contactFlowId: config.connect.contactFlowId,
      phoneNumber: maskPhoneNumber(config.connect.phoneNumber),
    },
    s3: config.s3,
    transcribe: config.transcribe,
    comprehend: config.comprehend,
    features: config.features,
  };
}

/**
 * 文字列をマスク
 */
function maskString(str: string, visibleChars: number = 4): string {
  if (!str || str.length <= visibleChars) {
    return '***';
  }
  return str.substring(0, visibleChars) + '***';
}

/**
 * 電話番号をマスク
 */
function maskPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || phoneNumber.length < 4) {
    return '***';
  }
  return phoneNumber.substring(0, 3) + '***' + phoneNumber.substring(phoneNumber.length - 4);
}

// デフォルトエクスポート
export default {
  loadAWSConfig,
  validateAWSConfig,
  isAWSConfigured,
  getAWSConfig,
  getAWSCredentials,
  getMaskedAWSConfig,
  normalizePhoneNumber,
};
