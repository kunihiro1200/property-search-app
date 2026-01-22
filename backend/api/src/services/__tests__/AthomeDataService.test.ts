import { AthomeDataService } from '../AthomeDataService';

describe('AthomeDataService', () => {
  let service: AthomeDataService;

  beforeEach(() => {
    service = new AthomeDataService();
  });

  describe('getCellRange', () => {
    it('should return correct cell range for 土地', () => {
      const cellRange = (service as any).getCellRange('土地');
      expect(cellRange).toBe('B63:B79');
    });

    it('should return correct cell range for 戸建て', () => {
      const cellRange = (service as any).getCellRange('戸建て');
      expect(cellRange).toBe('B152:B166');
    });

    it('should return correct cell range for 戸建 (alternative spelling)', () => {
      const cellRange = (service as any).getCellRange('戸建');
      expect(cellRange).toBe('B152:B166');
    });

    it('should return correct cell range for マンション', () => {
      const cellRange = (service as any).getCellRange('マンション');
      expect(cellRange).toBe('B149:B163');
    });

    it('should return null for unknown property type', () => {
      const cellRange = (service as any).getCellRange('Unknown');
      expect(cellRange).toBeNull();
    });
  });

  describe('replaceSymbols', () => {
    it('should replace ★ with ● at start of string', () => {
      const input = ['★テスト', '★サンプル'];
      const output = (service as any).replaceSymbols(input);
      expect(output).toEqual(['●テスト', '●サンプル']);
    });

    it('should preserve text without ★', () => {
      const input = ['テスト', 'サンプル'];
      const output = (service as any).replaceSymbols(input);
      expect(output).toEqual(['テスト', 'サンプル']);
    });

    it('should only replace ★ at the start', () => {
      const input = ['テスト★サンプル'];
      const output = (service as any).replaceSymbols(input);
      expect(output).toEqual(['テスト★サンプル']);
    });

    it('should handle empty array', () => {
      const input: string[] = [];
      const output = (service as any).replaceSymbols(input);
      expect(output).toEqual([]);
    });
  });

  describe('extractSpreadsheetId', () => {
    it('should extract spreadsheet ID from valid URL', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1ABC123xyz/edit';
      const id = (service as any).extractSpreadsheetId(url);
      expect(id).toBe('1ABC123xyz');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid';
      const id = (service as any).extractSpreadsheetId(url);
      expect(id).toBeNull();
    });

    it('should handle URL with additional parameters', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1ABC123xyz/edit#gid=0';
      const id = (service as any).extractSpreadsheetId(url);
      expect(id).toBe('1ABC123xyz');
    });
  });

  describe('cache', () => {
    it('should return cached data within TTL', () => {
      const cacheKey = 'athome:AA12345';
      const data = ['テスト1', 'テスト2'];
      
      (service as any).setCachedData(cacheKey, data);
      const cached = (service as any).getCachedData(cacheKey);
      
      expect(cached).toEqual(data);
    });

    it('should return null for expired cache', async () => {
      const cacheKey = 'athome:AA12345';
      const data = ['テスト1', 'テスト2'];
      
      // Set cache TTL to 1ms for testing
      (service as any).CACHE_TTL = 1;
      (service as any).setCachedData(cacheKey, data);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const cached = (service as any).getCachedData(cacheKey);
      expect(cached).toBeNull();
    });

    it('should return null for non-existent cache key', () => {
      const cached = (service as any).getCachedData('athome:nonexistent');
      expect(cached).toBeNull();
    });
  });

  describe('getAthomeData', () => {
    it('should return empty array for null storage location', async () => {
      const result = await service.getAthomeData('AA12345', '土地', null);
      
      expect(result.data).toEqual([]);
      expect(result.propertyType).toBe('土地');
      expect(result.cached).toBe(false);
    });

    it('should return empty array for unknown property type', async () => {
      const result = await service.getAthomeData(
        'AA12345',
        'Unknown',
        'https://docs.google.com/spreadsheets/d/1ABC123xyz/edit'
      );
      
      expect(result.data).toEqual([]);
      expect(result.propertyType).toBe('Unknown');
      expect(result.cached).toBe(false);
    });

    it('should return cached data on second call', async () => {
      const cacheKey = 'athome:AA12345';
      const data = ['テスト1', 'テスト2'];
      
      // Manually set cache
      (service as any).setCachedData(cacheKey, data);
      
      const result = await service.getAthomeData(
        'AA12345',
        '土地',
        'https://docs.google.com/spreadsheets/d/1ABC123xyz/edit'
      );
      
      expect(result.data).toEqual(data);
      expect(result.cached).toBe(true);
    });
  });
});
