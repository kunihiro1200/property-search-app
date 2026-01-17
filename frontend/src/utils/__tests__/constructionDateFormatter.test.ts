import { formatConstructionDate, shouldShowConstructionDate } from '../constructionDateFormatter';

describe('formatConstructionDate', () => {
  describe('YYYY-MM形式', () => {
    it('formats YYYY-MM correctly', () => {
      expect(formatConstructionDate('2020-03')).toBe('2020年03月');
    });

    it('formats YYYY-M correctly (single digit month)', () => {
      expect(formatConstructionDate('2020-3')).toBe('2020年03月');
    });
  });

  describe('YYYY/MM形式', () => {
    it('formats YYYY/MM correctly', () => {
      expect(formatConstructionDate('2020/03')).toBe('2020年03月');
    });

    it('formats YYYY/M correctly (single digit month)', () => {
      expect(formatConstructionDate('2020/3')).toBe('2020年03月');
    });

    it('formats YYYY/MM/DD correctly (removes day)', () => {
      expect(formatConstructionDate('2020/3/1')).toBe('2020年03月');
      expect(formatConstructionDate('1999/8/1')).toBe('1999年08月');
    });
  });

  describe('YYYYMM形式', () => {
    it('formats YYYYMM correctly', () => {
      expect(formatConstructionDate('202003')).toBe('2020年03月');
    });

    it('formats YYYYMM with leading zero', () => {
      expect(formatConstructionDate('202001')).toBe('2020年01月');
    });
  });

  describe('YYYY年MM月形式', () => {
    it('returns as-is for YYYY年MM月 format with padding', () => {
      expect(formatConstructionDate('2020年03月')).toBe('2020年03月');
    });

    it('pads single digit month in YYYY年M月 format', () => {
      expect(formatConstructionDate('2020年3月')).toBe('2020年03月');
    });

    it('handles YYYY年MM月DD日 format (removes day)', () => {
      expect(formatConstructionDate('2020年3月1日')).toBe('2020年03月');
      expect(formatConstructionDate('2008年11月1日')).toBe('2008年11月');
    });

    it('handles YYYY年MM月 with spaces', () => {
      expect(formatConstructionDate('2024 年5月')).toBe('2024年05月');
      expect(formatConstructionDate('2024 年 5 月')).toBe('2024年05月');
    });
  });

  describe('無効な入力', () => {
    it('returns null for invalid format', () => {
      expect(formatConstructionDate('invalid')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(formatConstructionDate(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(formatConstructionDate(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(formatConstructionDate('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(formatConstructionDate('   ')).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(formatConstructionDate(123 as any)).toBeNull();
    });
  });

  describe('実際のデータ形式', () => {
    it('handles real data from database', () => {
      // 実際のデータベースから取得したサンプル
      expect(formatConstructionDate('2008年11月1日')).toBe('2008年11月');
      expect(formatConstructionDate('1996年07月')).toBe('1996年07月');
      expect(formatConstructionDate('1979年6月1日')).toBe('1979年06月');
      expect(formatConstructionDate('1999/8/1')).toBe('1999年08月');
      expect(formatConstructionDate('2001年8月1日')).toBe('2001年08月');
      expect(formatConstructionDate('2021年1月1日')).toBe('2021年01月');
      expect(formatConstructionDate('2011年11月1日')).toBe('2011年11月');
      expect(formatConstructionDate('1970年10月1日')).toBe('1970年10月');
      expect(formatConstructionDate('2024 年5月')).toBe('2024年05月');
      expect(formatConstructionDate('1905年6月11日')).toBe('1905年06月');
    });
  });
});

describe('shouldShowConstructionDate', () => {
  describe('英語の物件タイプ', () => {
    it('returns true for detached_house', () => {
      expect(shouldShowConstructionDate('detached_house')).toBe(true);
    });

    it('returns true for apartment', () => {
      expect(shouldShowConstructionDate('apartment')).toBe(true);
    });

    it('returns false for land', () => {
      expect(shouldShowConstructionDate('land')).toBe(false);
    });

    it('returns false for other', () => {
      expect(shouldShowConstructionDate('other')).toBe(false);
    });
  });

  describe('日本語の物件タイプ', () => {
    it('returns true for 戸建', () => {
      expect(shouldShowConstructionDate('戸建')).toBe(true);
    });

    it('returns true for 戸建て', () => {
      expect(shouldShowConstructionDate('戸建て')).toBe(true);
    });

    it('returns true for マンション', () => {
      expect(shouldShowConstructionDate('マンション')).toBe(true);
    });

    it('returns false for 土地', () => {
      expect(shouldShowConstructionDate('土地')).toBe(false);
    });

    it('returns false for 収益物件', () => {
      expect(shouldShowConstructionDate('収益物件')).toBe(false);
    });

    it('returns false for その他', () => {
      expect(shouldShowConstructionDate('その他')).toBe(false);
    });
  });

  describe('未知の物件タイプ', () => {
    it('returns false for unknown type', () => {
      expect(shouldShowConstructionDate('unknown')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(shouldShowConstructionDate('')).toBe(false);
    });
  });
});
