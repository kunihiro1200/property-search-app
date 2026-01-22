/**
 * NotFoundError - Thrown when a requested resource is not found
 */
export class NotFoundError extends Error {
  public readonly statusCode: number = 404;
  public readonly code: string = 'NOT_FOUND';
  public readonly resourceType?: string;
  public readonly resourceId?: string;

  constructor(message: string, resourceType?: string, resourceId?: string) {
    super(message);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      statusCode: this.statusCode
    };
  }
}
