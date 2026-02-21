/**
 * CalendarLinkGenerator のテスト
 */

import { CalendarLinkGenerator } from '../CalendarLinkGenerator';

describe('CalendarLinkGenerator', () => {
  describe('generateCalendarLink', () => {
    it('後続担当のメールアドレスがaddパラメータに含まれる', () => {
      const buyer = {
        buyer_number: '6666',
        name: '山田太郎',
        phone_number: '090-1234-5678',
        email: 'yamada@example.com',
        latest_viewing_date: '2026-02-10',
        viewing_time: '14:30',
        follow_up_assignee: 'Y',
        pre_viewing_notes: 'テスト用メモ',
      };
      const employees = [
        { name: '佐藤', initials: 'Y', email: 'sato@example.com' },
        { name: '鈴木', initials: 'K', email: 'suzuki@example.com' },
      ];

      const link = CalendarLinkGenerator.generateCalendarLink(buyer, employees);

      expect(link).toContain('add=sato%40example.com');
    });

    it('カレンダーリンクに内覧日時が含まれる', () => {
      const buyer = {
        buyer_number: '6666',
        name: '山田太郎',
        latest_viewing_date: '2026-02-10',
        viewing_time: '14:30',
        follow_up_assignee: 'Y',
      };
      const employees = [
        { name: '佐藤', initials: 'Y', email: 'sato@example.com' },
      ];

      const link = CalendarLinkGenerator.generateCalendarLink(buyer, employees);

      // 日時フォーマット: 20260210T143000
      expect(link).toContain('20260210T143000');
      // 終了時刻（1時間後）: 20260210T153000
      expect(link).toContain('20260210T153000');
    });

    it('カレンダーリンクに買主情報が含まれる', () => {
      const buyer = {
        buyer_number: '6666',
        name: '山田太郎',
        phone_number: '090-1234-5678',
        email: 'yamada@example.com',
        latest_viewing_date: '2026-02-10',
        viewing_time: '14:30',
        follow_up_assignee: 'Y',
        pre_viewing_notes: 'テスト用メモ',
      };
      const employees = [
        { name: '佐藤', initials: 'Y', email: 'sato@example.com' },
      ];

      const link = CalendarLinkGenerator.generateCalendarLink(buyer, employees);

      // タイトルに買主名が含まれる
      expect(link).toContain(encodeURIComponent('内覧: 山田太郎'));
      // 詳細に買主番号が含まれる
      expect(link).toContain(encodeURIComponent('買主番号: 6666'));
      // 詳細に電話番号が含まれる
      expect(link).toContain(encodeURIComponent('090-1234-5678'));
    });

    it('後続担当が従業員リストに存在しない場合、addパラメータなし', () => {
      const buyer = {
        buyer_number: '6666',
        name: '山田太郎',
        latest_viewing_date: '2026-02-10',
        viewing_time: '14:30',
        follow_up_assignee: 'Z', // 存在しないイニシャル
      };
      const employees = [
        { name: '佐藤', initials: 'Y', email: 'sato@example.com' },
      ];

      const link = CalendarLinkGenerator.generateCalendarLink(buyer, employees);

      expect(link).not.toContain('add=');
    });

    it('viewing_timeが未設定の場合、デフォルト14:00を使用', () => {
      const buyer = {
        buyer_number: '6666',
        name: '山田太郎',
        latest_viewing_date: '2026-02-10',
        viewing_time: '',
        follow_up_assignee: 'Y',
      };
      const employees = [
        { name: '佐藤', initials: 'Y', email: 'sato@example.com' },
      ];

      const link = CalendarLinkGenerator.generateCalendarLink(buyer, employees);

      // デフォルト14:00の場合: 20260210T140000
      expect(link).toContain('20260210T140000');
    });
  });
});
