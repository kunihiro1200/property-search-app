/**
 * PropertyListingSyncService のサイドバーステータス計算ロジックのテスト
 */
import { PropertyListingSyncService } from '../PropertyListingSyncService';

// テスト用のモックデータ
const mockGyomuListData = [
  {
    '物件番号': 'AA12345',
    '公開予定日': '2026-02-10', // 過去の日付
  },
  {
    '物件番号': 'AA12346',
    '公開予定日': '2026-02-11', // 昨日
  },
  {
    '物件番号': 'AA12347',
    '公開予定日': '2026-02-12', // 今日
  },
];

describe('PropertyListingSyncService - calculateSidebarStatus', () => {
  let service: PropertyListingSyncService;

  beforeEach(() => {
    // Supabase URLとキーは環境変数から取得（テスト環境では不要）
    service = new PropertyListingSyncService(
      process.env.SUPABASE_URL || 'https://test.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
    );
  });

  describe('① 未報告（最優先）', () => {
    it('報告日が今日以前の場合、「未報告 担当者名」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        '報告日': '2026-02-10', // 過去の日付
        '報告担当': '山本',
        '確認': '済',
        'atbb成約済み/非公開': '専任・公開中',
      };

      // @ts-ignore - private メソッドをテスト
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('未報告 山本');
    });

    it('報告担当_overrideがある場合、それを優先する', () => {
      const row = {
        '物件番号': 'AA12345',
        '報告日': '2026-02-10',
        '報告担当': '山本',
        '報告担当_override': '生野',
        '確認': '済',
        'atbb成約済み/非公開': '専任・公開中',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('未報告 生野');
    });

    it('報告担当がない場合、「未報告」のみを返す', () => {
      const row = {
        '物件番号': 'AA12345',
        '報告日': '2026-02-10',
        '確認': '済',
        'atbb成約済み/非公開': '専任・公開中',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('未報告');
    });
  });

  describe('② 未完了', () => {
    it('確認が「未」の場合、「未完了」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        '確認': '未',
        'atbb成約済み/非公開': '専任・公開中',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('未完了');
    });
  });

  describe('⑪ 専任・公開中（担当別）', () => {
    it('担当名が「山本」の場合、「Y専任公開中」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '山本',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('Y専任公開中');
    });

    it('担当名が「生野」の場合、「生・専任公開中」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '生野',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('生・専任公開中');
    });

    it('担当名が「久」の場合、「久・専任公開中」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '久',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('久・専任公開中');
    });

    it('担当名が「裏」の場合、「U専任公開中」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '裏',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('U専任公開中');
    });

    it('担当名が「林」の場合、「林・専任公開中」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '林',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('林・専任公開中');
    });

    it('担当名が「国広」の場合、「K専任公開中」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '国広',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('K専任公開中');
    });

    it('担当名が「木村」の場合、「R専任公開中」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '木村',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('R専任公開中');
    });

    it('担当名が「角井」の場合、「I専任公開中」を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '角井',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('I専任公開中');
    });

    it('担当名が不明な場合、空文字を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '専任・公開中',
        '担当名（営業）': '不明な担当者',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('');
    });
  });

  describe('⑫ それ以外', () => {
    it('どの条件にも一致しない場合、空文字を返す', () => {
      const row = {
        '物件番号': 'AA12345',
        'atbb成約済み/非公開': '成約済み',
      };

      // @ts-ignore
      const result = service['calculateSidebarStatus'](row, mockGyomuListData);
      expect(result).toBe('');
    });
  });
});
