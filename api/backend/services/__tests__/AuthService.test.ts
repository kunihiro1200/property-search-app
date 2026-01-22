/**
 * AuthService ユニットテスト
 * Google OAuth 2.0認証フローのテスト
 */

import { AuthService } from '../AuthService';
import { EmployeeRole } from '../../types';
import redisClient from '../../config/redis';

// Supabaseクライアントのモック
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Redisクライアントのモック
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockSupabase: any;

  beforeEach(() => {
    authService = new AuthService();
    // @ts-ignore
    mockSupabase = authService.supabase;
    jest.clearAllMocks();
  });

  describe('loginWithGoogle', () => {
    const googleProfile = {
      id: 'google-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should create new employee on first login', async () => {
      // 既存社員が見つからない
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'employee-1',
                google_id: googleProfile.id,
                email: googleProfile.email,
                name: googleProfile.name,
                role: EmployeeRole.AGENT,
                is_active: true,
                lastLoginAt: new Date(),
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await authService.loginWithGoogle(googleProfile);

      expect(result.employee.email).toBe(googleProfile.email);
      expect(result.employee.name).toBe(googleProfile.name);
      expect(result.sessionToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(redisClient.setEx).toHaveBeenCalled();
    });

    it('should update existing employee on subsequent login', async () => {
      const existingEmployee = {
        id: 'employee-1',
        google_id: googleProfile.id,
        email: googleProfile.email,
        name: googleProfile.name,
        role: EmployeeRole.AGENT,
        is_active: true,
        lastLoginAt: new Date('2024-01-01'),
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [existingEmployee],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const result = await authService.loginWithGoogle(googleProfile);

      expect(result.employee.id).toBe(existingEmployee.id);
      expect(result.sessionToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(redisClient.setEx).toHaveBeenCalled();
    });

    it('should throw error if employee creation fails', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(authService.loginWithGoogle(googleProfile)).rejects.toThrow(
        'Failed to create employee'
      );
    });
  });

  describe('validateSession', () => {
    it('should validate valid session token', async () => {
      const sessionToken = 'valid-token';
      const employeeId = 'employee-1';
      const sessionData = {
        employeeId,
        email: 'test@example.com',
        role: EmployeeRole.AGENT,
        refreshToken: 'refresh-123',
      };

      // JWTトークンの検証をモック
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        employeeId,
        email: sessionData.email,
        role: sessionData.role,
      });

      // Redisからセッション取得をモック
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      // データベースから社員取得をモック
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: employeeId,
                  email: sessionData.email,
                  role: sessionData.role,
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const employee = await authService.validateSession(sessionToken);

      expect(employee.id).toBe(employeeId);
      expect(employee.email).toBe(sessionData.email);
    });

    it('should throw error for expired session', async () => {
      const sessionToken = 'expired-token';

      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        employeeId: 'employee-1',
        email: 'test@example.com',
        role: EmployeeRole.AGENT,
      });

      // Redisにセッションが存在しない
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      await expect(authService.validateSession(sessionToken)).rejects.toThrow(
        'Invalid or expired session'
      );
    });

    it('should throw error for invalid JWT token', async () => {
      const sessionToken = 'invalid-token';

      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.validateSession(sessionToken)).rejects.toThrow(
        'Invalid or expired session'
      );
    });
  });

  describe('logout', () => {
    it('should delete session from Redis', async () => {
      const sessionToken = 'session-token';

      await authService.logout(sessionToken);

      expect(redisClient.del).toHaveBeenCalledWith(`session:${sessionToken}`);
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const refreshToken = 'refresh-123';
      const employeeId = 'employee-1';
      const sessionData = {
        employeeId,
        email: 'test@example.com',
        role: EmployeeRole.AGENT,
        refreshToken,
      };

      // Redisからセッション検索をモック
      (redisClient.keys as jest.Mock).mockResolvedValue(['session:old-token']);
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      // データベースから社員取得をモック
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: employeeId,
                email: sessionData.email,
                role: sessionData.role,
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await authService.refreshToken(refreshToken);

      expect(result.employee.id).toBe(employeeId);
      expect(result.sessionToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(refreshToken); // 新しいトークン
      expect(redisClient.del).toHaveBeenCalled(); // 古いセッション削除
      expect(redisClient.setEx).toHaveBeenCalled(); // 新しいセッション保存
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh';

      (redisClient.keys as jest.Mock).mockResolvedValue(['session:token-1']);
      (redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          employeeId: 'employee-1',
          email: 'test@example.com',
          role: EmployeeRole.AGENT,
          refreshToken: 'different-token',
        })
      );

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });
});
