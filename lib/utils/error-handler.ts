/**
 * Error Handler Utility
 * Standart error response formatı ve error code'ları
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Not Found
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Business Logic
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_OPERATION = 'INVALID_OPERATION',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // AI Agent Errors
  AGENT_ERROR = 'AGENT_ERROR',
  AGENT_QUOTA_EXCEEDED = 'AGENT_QUOTA_EXCEEDED',
  AGENT_VALIDATION_FAILED = 'AGENT_VALIDATION_FAILED',
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: any;
  timestamp: string;
  path?: string;
}

export class AppError extends Error {
  public code: ErrorCode;
  public statusCode: number;
  public details?: any;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error | AppError | unknown,
  path?: string
): ErrorResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  if (error instanceof Error) {
    // Try to infer error code from error message
    let code = ErrorCode.INTERNAL_ERROR;
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('token')) {
      code = ErrorCode.UNAUTHORIZED;
    } else if (message.includes('forbidden') || message.includes('permission')) {
      code = ErrorCode.FORBIDDEN;
    } else if (message.includes('not found')) {
      code = ErrorCode.NOT_FOUND;
    } else if (message.includes('validation') || message.includes('invalid')) {
      code = ErrorCode.VALIDATION_ERROR;
    } else if (message.includes('stock') || message.includes('insufficient')) {
      code = ErrorCode.INSUFFICIENT_STOCK;
    } else if (message.includes('database') || message.includes('sql')) {
      code = ErrorCode.DATABASE_ERROR;
    } else if (message.includes('agent') || message.includes('ai')) {
      code = ErrorCode.AGENT_ERROR;
    }

    return {
      success: false,
      error: error.message,
      code,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  return {
    success: false,
    error: 'Unknown error occurred',
    code: ErrorCode.INTERNAL_ERROR,
    timestamp: new Date().toISOString(),
    path,
  };
}

/**
 * Handle error and return appropriate response
 */
export function handleError(error: unknown, path?: string): {
  response: ErrorResponse;
  statusCode: number;
} {
  const errorResponse = createErrorResponse(error, path);
  
  let statusCode = 500;
  if (error instanceof AppError) {
    statusCode = error.statusCode;
  } else if (errorResponse.code === ErrorCode.UNAUTHORIZED || errorResponse.code === ErrorCode.INVALID_TOKEN) {
    statusCode = 401;
  } else if (errorResponse.code === ErrorCode.FORBIDDEN) {
    statusCode = 403;
  } else if (errorResponse.code === ErrorCode.NOT_FOUND || errorResponse.code === ErrorCode.RESOURCE_NOT_FOUND) {
    statusCode = 404;
  } else if (errorResponse.code === ErrorCode.VALIDATION_ERROR || errorResponse.code === ErrorCode.MISSING_REQUIRED_FIELD || errorResponse.code === ErrorCode.INVALID_INPUT) {
    statusCode = 400;
  } else if (errorResponse.code === ErrorCode.INSUFFICIENT_STOCK || errorResponse.code === ErrorCode.INVALID_OPERATION || errorResponse.code === ErrorCode.DUPLICATE_ENTRY) {
    statusCode = 400;
  }

  return {
    response: errorResponse,
    statusCode,
  };
}

/**
 * Common error creators
 */
export const createErrors = {
  unauthorized: (message: string = 'Unauthorized') => 
    new AppError(message, ErrorCode.UNAUTHORIZED, 401),
  
  forbidden: (message: string = 'Forbidden') => 
    new AppError(message, ErrorCode.FORBIDDEN, 403),
  
  notFound: (resource: string = 'Resource') => 
    new AppError(`${resource} not found`, ErrorCode.NOT_FOUND, 404),
  
  validation: (message: string, details?: any) => 
    new AppError(message, ErrorCode.VALIDATION_ERROR, 400, details),
  
  insufficientStock: (material: string, needed: number, available: number) => 
    new AppError(
      `Insufficient stock for ${material}: needed ${needed}, available ${available}`,
      ErrorCode.INSUFFICIENT_STOCK,
      400,
      { material, needed, available }
    ),
  
  database: (message: string, details?: any) => 
    new AppError(message, ErrorCode.DATABASE_ERROR, 500, details),
  
  agent: (message: string, details?: any) => 
    new AppError(message, ErrorCode.AGENT_ERROR, 500, details),
};

