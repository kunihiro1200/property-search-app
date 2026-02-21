/**
 * SyncError - 双方向同期のエラー種別定義
 */

export type SyncErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'CONFLICT_ERROR'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'UNKNOWN_ERROR';

export interface SyncErrorDetails {
  code: SyncErrorCode;
  message: string;
  details?: any;
  retryable: boolean;
  syncStatus: 'failed' | 'pending';
}

export class SyncError extends Error {
  public readonly code: SyncErrorCode;
  public readonly details?: any;
  public readonly retryable: boolean;
  public readonly syncStatus: 'failed' | 'pending';

  constructor(
    code: SyncErrorCode,
    message: string,
    details?: any
  ) {
    super(message);
    this.name = 'SyncError';
    this.code = code;
    this.details = details;
    this.retryable = this.isRetryable(code);
    this.syncStatus = this.retryable ? 'pending' : 'failed';
  }

  private isRetryable(code: SyncErrorCode): boolean {
    switch (code) {
      case 'NETWORK_ERROR':
      case 'RATE_LIMIT_ERROR':
        return true;
      case 'AUTHENTICATION_ERROR':
      case 'CONFLICT_ERROR':
      case 'VALIDATION_ERROR':
      case 'NOT_FOUND_ERROR':
      case 'UNKNOWN_ERROR':
        return false;
      default:
        return false;
    }
  }

  toJSON(): SyncErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      syncStatus: this.syncStatus
    };
  }

  static fromError(error: any): SyncError {
    // ネットワークエラー
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return new SyncError('NETWORK_ERROR', `Network error: ${error.message}`, { originalCode: error.code });
    }

    // HTTPステータスコードによる判定
    const status = error.status || error.statusCode;
    if (status) {
      if (status === 401 || status === 403) {
        return new SyncError('AUTHENTICATION_ERROR', 'Authentication failed', { status });
      }
      if (status === 404) {
        return new SyncError('NOT_FOUND_ERROR', 'Resource not found', { status });
      }
      if (status === 409) {
        return new SyncError('CONFLICT_ERROR', 'Conflict detected', { status });
      }
      if (status === 429) {
        return new SyncError('RATE_LIMIT_ERROR', 'Rate limit exceeded', { status });
      }
      if (status >= 500) {
        return new SyncError('NETWORK_ERROR', `Server error: ${status}`, { status });
      }
    }

    // Google Sheets API のレート制限エラー
    if (error.message?.includes('Rate Limit') || error.message?.includes('quota')) {
      return new SyncError('RATE_LIMIT_ERROR', 'Google Sheets API rate limit exceeded');
    }

    // バリデーションエラー
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return new SyncError('VALIDATION_ERROR', error.message);
    }

    // 競合エラー
    if (error.message?.includes('conflict') || error.message?.includes('Conflict')) {
      return new SyncError('CONFLICT_ERROR', error.message);
    }

    // その他のエラー
    return new SyncError('UNKNOWN_ERROR', error.message || 'Unknown error occurred');
  }
}

/**
 * NetworkError - ネットワーク関連のエラー
 */
export class NetworkError extends SyncError {
  constructor(message: string, details?: any) {
    super('NETWORK_ERROR', message, details);
    this.name = 'NetworkError';
  }
}

/**
 * AuthenticationError - 認証エラー
 */
export class AuthenticationError extends SyncError {
  constructor(message: string, details?: any) {
    super('AUTHENTICATION_ERROR', message, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * ConflictError - 競合エラー
 */
export class ConflictError extends SyncError {
  public readonly conflicts: any[];

  constructor(message: string, conflicts: any[], details?: any) {
    super('CONFLICT_ERROR', message, details);
    this.name = 'ConflictError';
    this.conflicts = conflicts;
  }

  toJSON(): SyncErrorDetails & { conflicts: any[] } {
    return {
      ...super.toJSON(),
      conflicts: this.conflicts
    };
  }
}

/**
 * ValidationError - バリデーションエラー
 */
export class SyncValidationError extends SyncError {
  public readonly fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string>, details?: any) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'SyncValidationError';
    this.fieldErrors = fieldErrors;
  }

  toJSON(): SyncErrorDetails & { fieldErrors: Record<string, string> } {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors
    };
  }
}

/**
 * RateLimitError - レート制限エラー
 */
export class RateLimitError extends SyncError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, details?: any) {
    super('RATE_LIMIT_ERROR', message, details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toJSON(): SyncErrorDetails & { retryAfter?: number } {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
}
