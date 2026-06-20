/**
 * ValidationError - Thrown when input validation fails
 */
export class ValidationError extends Error {
  public readonly statusCode: number = 400;
  public readonly code: string = 'VALIDATION_ERROR';
  public readonly details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      statusCode: this.statusCode
    };
  }
}
