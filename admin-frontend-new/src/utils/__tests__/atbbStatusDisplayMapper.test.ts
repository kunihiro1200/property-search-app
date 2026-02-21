/**
 * ATBB_Statusの表示ステータス変換ユーティリティのテスト
 * 
 * Requirements: 1.1, 2.1, 3.1, 5.1, 5.2
 */

import {
  mapAtbbStatusToDisplayStatus,
  getDisplayStatus,
  DisplayStatusResult,
  StatusType
} from '../atbbStatusDisplayMapper';

describe('atbbStatusDisplayMapper', () => {
  describe('mapAtbbStatusToDisplayStatus', () => {
    // Requirement 5: 空値・null値の処理
    describe('空値・null値の処理 (Requirement 5)', () => {
      it('nullの場合は空文字列を返す (5.1)', () => {
        const result = mapAtbbStatusToDisplayStatus(null);
        expect(result.displayStatus).toBe('');
        expect(result.originalStatus).toBe('');
        expect(result.statusType).toBe('other');
      });

      it('undefinedの場合は空文字列を返す (5.2)', () => {
        const result = mapAtbbStatusToDisplayStatus(undefined);
        expect(result.displayStatus).toBe('');
        expect(result.originalStatus).toBe('');
        expect(result.statusType).toBe('other');
      });

      it('空文字列の場合は空文字列を返す (5.1)', () => {
        const result = mapAtbbStatusToDisplayStatus('');
        expect(result.displayStatus).toBe('');
        expect(result.originalStatus).toBe('');
        expect(result.statusType).toBe('other');
      });
    });

    // Requirement 1: 公開前情報ステータスの表示
    describe('公開前情報ステータス (Requirement 1)', () => {
      it('「公開前」を含む場合は「公開前情報」を返す (1.1)', () => {
        const result = mapAtbbStatusToDisplayStatus('公開前');
        expect(result.displayStatus).toBe('公開前情報');
        expect(result.originalStatus).toBe('公開前');
        expect(result.statusType).toBe('pre_publish');
      });

      it('「公開前」を含む複合文字列でも「公開前情報」を返す', () => {
        const result = mapAtbbStatusToDisplayStatus('公開前・配信メールのみ');
        expect(result.displayStatus).toBe('公開前情報');
        expect(result.statusType).toBe('pre_publish');
      });

      it('「公開前」を含む別の複合文字列でも「公開前情報」を返す', () => {
        const result = mapAtbbStatusToDisplayStatus('テスト公開前テスト');
        expect(result.displayStatus).toBe('公開前情報');
        expect(result.statusType).toBe('pre_publish');
      });
    });

    // Requirement 2: 非公開物件ステータスの表示
    describe('非公開物件ステータス (Requirement 2)', () => {
      it('「配信メールのみ」を含む場合は「非公開物件」を返す (2.1)', () => {
        const result = mapAtbbStatusToDisplayStatus('配信メールのみ');
        expect(result.displayStatus).toBe('非公開物件');
        expect(result.originalStatus).toBe('配信メールのみ');
        expect(result.statusType).toBe('private');
      });

      it('「配信メールのみ」を含む複合文字列でも「非公開物件」を返す', () => {
        const result = mapAtbbStatusToDisplayStatus('非公開・配信メールのみ');
        expect(result.displayStatus).toBe('非公開物件');
        expect(result.statusType).toBe('private');
      });
    });

    // Requirement 3: 成約済みステータスの表示
    describe('成約済みステータス (Requirement 3)', () => {
      it('「非公開」を含み「配信メール」を含まない場合は「成約済み」を返す (3.1)', () => {
        const result = mapAtbbStatusToDisplayStatus('非公開');
        expect(result.displayStatus).toBe('成約済み');
        expect(result.originalStatus).toBe('非公開');
        expect(result.statusType).toBe('sold');
      });

      it('「非公開」を含む複合文字列（「配信メール」なし）でも「成約済み」を返す', () => {
        const result = mapAtbbStatusToDisplayStatus('成約・非公開');
        expect(result.displayStatus).toBe('成約済み');
        expect(result.statusType).toBe('sold');
      });
    });

    // Requirement 4: ステータス判定の優先順位
    describe('ステータス判定の優先順位 (Requirement 4)', () => {
      it('「公開前」と「配信メールのみ」の両方を含む場合は「公開前情報」が優先される (4.1)', () => {
        const result = mapAtbbStatusToDisplayStatus('公開前・配信メールのみ');
        expect(result.displayStatus).toBe('公開前情報');
        expect(result.statusType).toBe('pre_publish');
      });

      it('「公開前」と「非公開」の両方を含む場合は「公開前情報」が優先される (4.1)', () => {
        const result = mapAtbbStatusToDisplayStatus('公開前・非公開');
        expect(result.displayStatus).toBe('公開前情報');
        expect(result.statusType).toBe('pre_publish');
      });

      it('「配信メールのみ」と「非公開」の両方を含む場合は「非公開物件」が優先される (4.1)', () => {
        const result = mapAtbbStatusToDisplayStatus('非公開・配信メールのみ');
        expect(result.displayStatus).toBe('非公開物件');
        expect(result.statusType).toBe('private');
      });

      it('上記いずれにも該当しない場合は元の値をそのまま返す (4.1)', () => {
        const result = mapAtbbStatusToDisplayStatus('公開中');
        expect(result.displayStatus).toBe('公開中');
        expect(result.originalStatus).toBe('公開中');
        expect(result.statusType).toBe('other');
      });

      it('全く関係ない文字列の場合は元の値をそのまま返す', () => {
        const result = mapAtbbStatusToDisplayStatus('テスト値');
        expect(result.displayStatus).toBe('テスト値');
        expect(result.originalStatus).toBe('テスト値');
        expect(result.statusType).toBe('other');
      });
    });

    // エッジケース
    describe('エッジケース', () => {
      it('「配信メール」を含むが「配信メールのみ」を含まない場合は「成約済み」にならない', () => {
        const result = mapAtbbStatusToDisplayStatus('配信メール対象');
        expect(result.displayStatus).toBe('配信メール対象');
        expect(result.statusType).toBe('other');
      });

      it('「非公開」と「配信メール」の両方を含む場合は「成約済み」にならない', () => {
        const result = mapAtbbStatusToDisplayStatus('非公開・配信メール対象');
        expect(result.displayStatus).toBe('非公開・配信メール対象');
        expect(result.statusType).toBe('other');
      });

      it('空白のみの文字列は元の値をそのまま返す', () => {
        const result = mapAtbbStatusToDisplayStatus('   ');
        expect(result.displayStatus).toBe('   ');
        expect(result.statusType).toBe('other');
      });
    });
  });

  describe('getDisplayStatus', () => {
    it('表示ステータスのみを返す', () => {
      expect(getDisplayStatus('公開前')).toBe('公開前情報');
      expect(getDisplayStatus('配信メールのみ')).toBe('非公開物件');
      expect(getDisplayStatus('非公開')).toBe('成約済み');
      expect(getDisplayStatus('公開中')).toBe('公開中');
      expect(getDisplayStatus(null)).toBe('');
      expect(getDisplayStatus(undefined)).toBe('');
      expect(getDisplayStatus('')).toBe('');
    });
  });
});
