/**
 * ATBB_Statusの表示ステータス変換ユーティリティのプロパティベーステスト
 * 
 * **Feature: property-listing-status-display, Property 1: 優先順位に従ったステータス判定**
 * **Validates: Requirements 1.1, 2.1, 2.2, 3.1, 3.2, 4.1**
 */

import * as fc from 'fast-check';
import {
  mapAtbbStatusToDisplayStatus,
  DisplayStatusResult
} from '../atbbStatusDisplayMapper';

describe('atbbStatusDisplayMapper - Property-Based Tests', () => {
  /**
   * Property 1: 優先順位に従ったステータス判定
   * 
   * *For any* ATBB_Status文字列, Status_Mapperは以下の優先順位でステータスを判定する:
   * 1. 「公開前」を含む場合は「公開前情報」を返す
   * 2. 「配信メールのみ」を含む場合は「非公開物件」を返す
   * 3. 「非公開」を含み「配信メール」を含まない場合は「成約済み」を返す
   * 4. 上記以外は元の値を返す
   * 
   * **Validates: Requirements 1.1, 2.1, 2.2, 3.1, 3.2, 4.1**
   */
  describe('Property 1: 優先順位に従ったステータス判定', () => {
    it('「公開前」を含む任意の文字列は「公開前情報」を返す', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          (prefix, suffix) => {
            const input = `${prefix}公開前${suffix}`;
            const result = mapAtbbStatusToDisplayStatus(input);
            
            expect(result.displayStatus).toBe('公開前情報');
            expect(result.statusType).toBe('pre_publish');
            expect(result.originalStatus).toBe(input);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('「配信メールのみ」を含み「公開前」を含まない任意の文字列は「非公開物件」を返す', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.includes('公開前')),
          fc.string().filter(s => !s.includes('公開前')),
          (prefix, suffix) => {
            const input = `${prefix}配信メールのみ${suffix}`;
            const result = mapAtbbStatusToDisplayStatus(input);
            
            expect(result.displayStatus).toBe('非公開物件');
            expect(result.statusType).toBe('private');
            expect(result.originalStatus).toBe(input);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('「非公開」を含み「公開前」「配信メール」を含まない任意の文字列は「成約済み」を返す', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.includes('公開前') && !s.includes('配信メール')),
          fc.string().filter(s => !s.includes('公開前') && !s.includes('配信メール')),
          (prefix, suffix) => {
            const input = `${prefix}非公開${suffix}`;
            const result = mapAtbbStatusToDisplayStatus(input);
            
            expect(result.displayStatus).toBe('成約済み');
            expect(result.statusType).toBe('sold');
            expect(result.originalStatus).toBe(input);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('キーワードを含まない任意の文字列は元の値をそのまま返す', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => 
            !s.includes('公開前') && 
            !s.includes('配信メールのみ') && 
            !s.includes('非公開') &&
            s.length > 0
          ),
          (input) => {
            const result = mapAtbbStatusToDisplayStatus(input);
            
            expect(result.displayStatus).toBe(input);
            expect(result.statusType).toBe('other');
            expect(result.originalStatus).toBe(input);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('優先順位: 「公開前」は「配信メールのみ」より優先される', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          (prefix, middle, suffix) => {
            // 「公開前」と「配信メールのみ」の両方を含む文字列を生成
            const input = `${prefix}公開前${middle}配信メールのみ${suffix}`;
            const result = mapAtbbStatusToDisplayStatus(input);
            
            // 「公開前」が優先されるため「公開前情報」を返す
            expect(result.displayStatus).toBe('公開前情報');
            expect(result.statusType).toBe('pre_publish');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('優先順位: 「配信メールのみ」は「非公開」より優先される', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.includes('公開前')),
          fc.string().filter(s => !s.includes('公開前')),
          fc.string().filter(s => !s.includes('公開前')),
          (prefix, middle, suffix) => {
            // 「配信メールのみ」と「非公開」の両方を含む文字列を生成
            const input = `${prefix}非公開${middle}配信メールのみ${suffix}`;
            const result = mapAtbbStatusToDisplayStatus(input);
            
            // 「配信メールのみ」が優先されるため「非公開物件」を返す
            expect(result.displayStatus).toBe('非公開物件');
            expect(result.statusType).toBe('private');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: 空値・null値の安全な処理
   * 
   * *For any* null、undefined、または空文字列のATBB_Status, 
   * Status_Mapperは空文字列を返し、エラーを発生させない
   * 
   * **Validates: Requirements 5.1, 5.2**
   */
  describe('Property 2: 空値・null値の安全な処理', () => {
    it('null、undefined、空文字列は常に空文字列を返す', () => {
      const emptyInputs: (string | null | undefined)[] = [null, undefined, ''];
      
      emptyInputs.forEach(input => {
        const result = mapAtbbStatusToDisplayStatus(input);
        
        expect(result.displayStatus).toBe('');
        expect(result.originalStatus).toBe('');
        expect(result.statusType).toBe('other');
      });
    });
  });

  /**
   * Property 3: 結果の一貫性
   * 
   * *For any* 同じ入力に対して、Status_Mapperは常に同じ結果を返す（冪等性）
   */
  describe('Property 3: 結果の一貫性（冪等性）', () => {
    it('同じ入力に対して常に同じ結果を返す', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const result1 = mapAtbbStatusToDisplayStatus(input);
            const result2 = mapAtbbStatusToDisplayStatus(input);
            
            expect(result1.displayStatus).toBe(result2.displayStatus);
            expect(result1.originalStatus).toBe(result2.originalStatus);
            expect(result1.statusType).toBe(result2.statusType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: originalStatusの保持
   * 
   * *For any* 非空の入力に対して、originalStatusは常に入力値と一致する
   */
  describe('Property 4: originalStatusの保持', () => {
    it('非空の入力に対してoriginalStatusは入力値と一致する', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.length > 0),
          (input) => {
            const result = mapAtbbStatusToDisplayStatus(input);
            expect(result.originalStatus).toBe(input);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: statusTypeの整合性
   * 
   * *For any* 入力に対して、statusTypeはdisplayStatusと整合性がある
   */
  describe('Property 5: statusTypeの整合性', () => {
    it('displayStatusとstatusTypeは整合性がある', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const result = mapAtbbStatusToDisplayStatus(input);
            
            if (result.displayStatus === '公開前情報') {
              expect(result.statusType).toBe('pre_publish');
            } else if (result.displayStatus === '非公開物件') {
              expect(result.statusType).toBe('private');
            } else if (result.displayStatus === '成約済み') {
              expect(result.statusType).toBe('sold');
            } else {
              expect(result.statusType).toBe('other');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
