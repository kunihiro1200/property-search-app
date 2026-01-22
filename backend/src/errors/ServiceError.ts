/**
 * ServiceError - Thrown when a service operation fails
 */
export class ServiceError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'SERVICE_ERROR';
  public readonly service?: string;
  public readonly operation?: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    service?: string,
    operation?: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ServiceError';
    this.service = service;
    this.operation = operation;
    this.originalError = originalError;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      service: this.service,
      operation: this.operation,
      originalError: this.originalError?.message,
      statusCode: this.statusCode
    };
  }
}
