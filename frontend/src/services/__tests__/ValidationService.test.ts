/**
 * ValidationService のテスト
 */

import { ValidationService } from '../ValidationService';

describe('ValidationService', () => {
  describe('validateRequiredFields', () => {
    it('全ての必須フィールドが空の場合、バリデーションが失敗する', () => {
      const buyer = {
        buyer_number: '6666',
        latest_viewing_date: '',
        viewing_time: '',
        viewing_mobile: '',
        follow_up_assignee: '',
      };
      const linkedProperties = [{ property_number: 'AA13501', atbb_status: '専任' }];

      const result = ValidationService.validateRequiredFields(buyer, linkedProperties);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内覧日（最新）');
      expect(result.errors).toContain('時間');
      expect(result.errors).toContain('内覧形態');
      expect(result.errors).toContain('後続担当');
    });

    it('全ての必須フィールドが入力されている場合、バリデーションが成功する', () => {
      const buyer = {
        buyer_number: '6666',
        latest_viewing_date: '2026-02-10',
        viewing_time: '14:30',
        viewing_mobile: '【内覧_専（自社物件）】',
        follow_up_assignee: 'Y',
      };
      const linkedProperties = [{ property_number: 'AA13501', atbb_status: '専任' }];

      const result = ValidationService.validateRequiredFields(buyer, linkedProperties);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('専任物件の場合、内覧形態が未入力だとエラーに「内覧形態」が含まれる', () => {
      const buyer = {
        buyer_number: '6666',
        latest_viewing_date: '2026-02-10',
        viewing_time: '14:30',
        viewing_mobile: '',
        follow_up_assignee: 'Y',
      };
      const linkedProperties = [{ property_number: 'AA13501', atbb_status: '専任' }];

      const result = ValidationService.validateRequiredFields(buyer, linkedProperties);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内覧形態');
    });

    it('一般媒介物件の場合、内覧形態が未入力だとエラーに「内覧形態_一般媒介」が含まれる', () => {
      const buyer = {
        buyer_number: '6666',
        latest_viewing_date: '2026-02-10',
        viewing_time: '14:30',
        viewing_mobile: '',
        follow_up_assignee: 'Y',
      };
      const linkedProperties = [{ property_number: 'AA13501', atbb_status: '一般' }];

      const result = ValidationService.validateRequiredFields(buyer, linkedProperties);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内覧形態_一般媒介');
    });

    it('物件が紐づいていない場合、内覧形態のチェックはスキップされる', () => {
      const buyer = {
        buyer_number: '6666',
        latest_viewing_date: '2026-02-10',
        viewing_time: '14:30',
        viewing_mobile: '',
        follow_up_assignee: 'Y',
      };
      const linkedProperties: any[] = [];

      const result = ValidationService.validateRequiredFields(buyer, linkedProperties);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getValidationErrorMessage', () => {
    it('エラーが1つの場合、「●●が未入力です」の形式でメッセージを返す', () => {
      const errors = ['内覧日（最新）'];
      const message = ValidationService.getValidationErrorMessage(errors);
      expect(message).toBe('内覧日（最新）が未入力です');
    });

    it('エラーが複数の場合、「●●、●●が未入力です」の形式でメッセージを返す', () => {
      const errors = ['内覧日（最新）', '時間', '後続担当'];
      const message = ValidationService.getValidationErrorMessage(errors);
      expect(message).toBe('内覧日（最新）、時間、後続担当が未入力です');
    });

    it('エラーが0の場合、空文字列を返す', () => {
      const errors: string[] = [];
      const message = ValidationService.getValidationErrorMessage(errors);
      expect(message).toBe('');
    });
  });
});
