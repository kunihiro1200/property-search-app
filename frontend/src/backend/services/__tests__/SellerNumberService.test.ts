// Mock Supabase client before importing the service
const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

import { SellerNumberService } from '../SellerNumberService';

describe('SellerNumberService', () => {
  let service: SellerNumberService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create service instance
    service = new SellerNumberService();
  });

  describe('generateSellerNumber', () => {
    it('正常系: AA00001形式の番号を生成する', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValue({
        data: 'AA00001',
        error: null,
      });

      // Act
      const result = await service.generateSellerNumber();

      // Assert
      expect(result).toBe('AA00001');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_seller_number');
    });

    it('正常系: AA12345形式の番号を生成する', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValue({
        data: 'AA12345',
        error: null,
      });

      // Act
      const result = await service.generateSellerNumber();

      // Assert
      expect(result).toBe('AA12345');
    });

    it('異常系: データベースエラー時に例外をスローする', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      // Act & Assert
      await expect(service.generateSellerNumber()).rejects.toThrow(
        'Failed to generate seller number: Database connection failed'
      );
    });

    it('異常系: データが返されない場合に例外をスローする', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(service.generateSellerNumber()).rejects.toThrow(
        'No seller number returned from database'
      );
    });
  });

  describe('validateSellerNumber', () => {
    it('正常系: 有効な売主番号（AA00001）を検証する', () => {
      // Act & Assert
      expect(service.validateSellerNumber('AA00001')).toBe(true);
    });

    it('正常系: 有効な売主番号（AA12345）を検証する', () => {
      // Act & Assert
      expect(service.validateSellerNumber('AA12345')).toBe(true);
    });

    it('正常系: 有効な売主番号（AA99999）を検証する', () => {
      // Act & Assert
      expect(service.validateSellerNumber('AA99999')).toBe(true);
    });

    it('異常系: 無効な形式（プレフィックスが異なる）を拒否する', () => {
      // Act & Assert
      expect(service.validateSellerNumber('BB00001')).toBe(false);
    });

    it('異常系: 無効な形式（数字が4桁）を拒否する', () => {
      // Act & Assert
      expect(service.validateSellerNumber('AA0001')).toBe(false);
    });

    it('異常系: 無効な形式（数字が6桁）を拒否する', () => {
      // Act & Assert
      expect(service.validateSellerNumber('AA000001')).toBe(false);
    });

    it('異常系: 無効な形式（数字以外の文字）を拒否する', () => {
      // Act & Assert
      expect(service.validateSellerNumber('AA0000A')).toBe(false);
    });

    it('異常系: 空文字列を拒否する', () => {
      // Act & Assert
      expect(service.validateSellerNumber('')).toBe(false);
    });

    it('異常系: nullを拒否する', () => {
      // Act & Assert
      expect(service.validateSellerNumber(null as any)).toBe(false);
    });

    it('異常系: undefinedを拒否する', () => {
      // Act & Assert
      expect(service.validateSellerNumber(undefined as any)).toBe(false);
    });
  });

  describe('isSellerNumberUnique', () => {
    it('正常系: 存在しない番号はユニークと判定する', async () => {
      // Arrange
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      // Act
      const result = await service.isSellerNumberUnique('AA00001');

      // Assert
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('sellers');
      expect(mockFrom.select).toHaveBeenCalledWith('id');
      expect(mockFrom.eq).toHaveBeenCalledWith('seller_number', 'AA00001');
    });

    it('異常系: 既存の番号は重複と判定する', async () => {
      // Arrange
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: '123' },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      // Act
      const result = await service.isSellerNumberUnique('AA00001');

      // Assert
      expect(result).toBe(false);
    });

    it('異常系: データベースエラー時に例外をスローする', async () => {
      // Arrange
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      // Act & Assert
      await expect(service.isSellerNumberUnique('AA00001')).rejects.toThrow(
        'Failed to check seller number: Database error'
      );
    });
  });

  describe('sellerNumberExists', () => {
    it('正常系: 存在する番号を検出する', async () => {
      // Arrange
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: '123' },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      // Act
      const result = await service.sellerNumberExists('AA00001');

      // Assert
      expect(result).toBe(true);
    });

    it('正常系: 存在しない番号を検出する', async () => {
      // Arrange
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      // Act
      const result = await service.sellerNumberExists('AA00001');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generateWithRetry', () => {
    it('正常系: 1回目の試行で成功する', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValue({
        data: 'AA00001',
        error: null,
      });

      // Act
      const result = await service.generateWithRetry(3);

      // Assert
      expect(result).toBe('AA00001');
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('正常系: 2回目の試行で成功する', async () => {
      // Arrange
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Temporary error' },
        })
        .mockResolvedValueOnce({
          data: 'AA00002',
          error: null,
        });

      // Act
      const result = await service.generateWithRetry(3);

      // Assert
      expect(result).toBe('AA00002');
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('異常系: 最大リトライ回数後に失敗する', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Persistent error' },
      });

      // Act & Assert
      await expect(service.generateWithRetry(3)).rejects.toThrow(
        'Failed to generate seller number after 3 attempts'
      );
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(3);
    });

    it('異常系: 無効な形式の番号が生成された場合に例外をスローする', async () => {
      // Arrange
      mockSupabase.rpc.mockResolvedValue({
        data: 'INVALID',
        error: null,
      });

      // Act & Assert
      await expect(service.generateWithRetry(3)).rejects.toThrow(
        'Failed to generate seller number after 3 attempts'
      );
    });
  });

  describe('getNextSellerNumber', () => {
    it('正常系: 次の売主番号を取得する', async () => {
      // Arrange
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { current_number: 5 },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      // Act
      const result = await service.getNextSellerNumber();

      // Assert
      expect(result).toBe('AA00006');
    });

    it('正常系: 大きな番号の次を取得する', async () => {
      // Arrange
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { current_number: 12344 },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      // Act
      const result = await service.getNextSellerNumber();

      // Assert
      expect(result).toBe('AA12345');
    });
  });

  describe('getCurrentSequence', () => {
    it('正常系: 現在のシーケンス番号を取得する', async () => {
      // Arrange
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { current_number: 10 },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      // Act
      const result = await service.getCurrentSequence();

      // Assert
      expect(result).toBe(10);
    });

    it('異常系: データベースエラー時に例外をスローする', async () => {
      // Arrange
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Sequence not found' },
        }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      // Act & Assert
      await expect(service.getCurrentSequence()).rejects.toThrow(
        'Failed to get current sequence: Sequence not found'
      );
    });
  });
});
