import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.supabase';
import { Employee } from '../types';

// Requestオブジェクトを拡張して社員情報を追加
declare global {
  namespace Express {
    interface Request {
      employee?: Employee;
    }
  }
}

const authService = new AuthService();

/**
 * 認証ミドルウェア
 * リクエストヘッダーからJWTトークンを取得し、検証する
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'No authentication token provided',
          retryable: false,
        },
      });
    }

    const token = authHeader.substring(7); // "Bearer " を除去

    // JWT + Redisでセッションを検証
    const employee = await authService.validateSession(token);
    
    // リクエストオブジェクトに社員情報を追加
    req.employee = employee;
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Invalid or expired authentication token',
        retryable: false,
      },
    });
  }
};

/**
 * ロール確認ミドルウェア
 * 特定のロールを持つ社員のみアクセスを許可
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.employee) {
      return res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    if (!roles.includes(req.employee.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          retryable: false,
        },
      });
    }

    next();
  };
};
