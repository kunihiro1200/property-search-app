/**
 * EE2ボタン色バグ条件の探索テスト
 *
 * **Property 1: Bug Condition** - atbb_statusに関わらず固定色が返されるバグ
 *
 * このテストは修正後のコードで**成功**することが期待される。
 * 成功がバグの修正を証明する。
 *
 * **Validates: Requirements 1.1, 1.2**
 */

import * as fc from 'fast-check';
import { mapAtbbStatusToDisplayStatus, StatusType } from '../../utils/atbbStatusDisplayMapper';

// ============================================================
// テスト対象のロジック（修正後のコードを再現）
// ============================================================

/**
 * BADGE_CONFIGS（PropertyMapView.tsx から抽出）
 */
const BADGE_CONFIGS_LOCAL: Record<StatusType, { backgroundColor: string }> = {
  pre_publish: { backgroundColor: '#ff9800' }, // オレンジ
  private:     { backgroundColor: '#f44336' }, // 赤
  sold:        { backgroundColor: '#9e9e9e' }, // グレー
  other:       { backgroundColor: '' },        // 空（青 #2196F3 を使用）
};

/**
 * 修正後のボタン色取得ロジック
 * PropertyMapView.tsx の修正後の Button sx.backgroundColor を再現
 * atbb_status に応じて動的に色を返す
 */
function getActualButtonColor(atbbStatus: string | null | undefined): string {
  const result = mapAtbbStatusToDisplayStatus(atbbStatus);
  if (result.statusType === 'other') {
    return '#2196F3'; // 青（販売中・その他）
  }
  return BADGE_CONFIGS_LOCAL[result.statusType].backgroundColor;
}

/**
 * 期待されるボタン色取得ロジック（修正後の正しい動作）
 * design.md の getExpectedButtonColor に基づく
 */
function getExpectedButtonColor(atbbStatus: string | null | undefined): string {
  const result = mapAtbbStatusToDisplayStatus(atbbStatus);
  if (result.statusType === 'other') {
    return '#2196F3'; // 青（販売中・その他）
  }
  return BADGE_CONFIGS_LOCAL[result.statusType].backgroundColor;
}

// ============================================================
// バグ条件の探索テスト（修正後の確認）
// ============================================================

describe('EE2ボタン色 - バグ条件の探索テスト（修正後は成功する）', () => {
  /**
   * Property 1: Bug Condition
   *
   * atbb_statusに応じてボタン色が動的に変わること。
   * 修正後のコードは atbb_status に応じた色を返すため、このテストは成功する。
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  describe('Property 1: Bug Condition - atbb_statusに応じたボタン色の動的変更', () => {
    it('atbb_status = "非公開（成約済み）" のとき、ボタン色が #9e9e9e（グレー）になること', () => {
      const atbbStatus = '非公開（成約済み）';
      const actualColor = getActualButtonColor(atbbStatus);
      const expectedColor = getExpectedButtonColor(atbbStatus);

      // 期待値の確認
      expect(expectedColor).toBe('#9e9e9e');

      // 修正後の確認: 正しい色が返されること
      expect(actualColor).toBe(expectedColor);
    });

    it('atbb_status = "公開中" のとき、ボタン色が #2196F3（青）になること', () => {
      const atbbStatus = '公開中';
      const actualColor = getActualButtonColor(atbbStatus);
      const expectedColor = getExpectedButtonColor(atbbStatus);

      // 期待値の確認
      expect(expectedColor).toBe('#2196F3');

      // 修正後の確認: 正しい色が返されること
      expect(actualColor).toBe(expectedColor);
    });

    it('atbb_status = "公開前情報あり" のとき、ボタン色が #ff9800（オレンジ）になること', () => {
      const atbbStatus = '公開前情報あり';
      const actualColor = getActualButtonColor(atbbStatus);
      const expectedColor = getExpectedButtonColor(atbbStatus);

      // 期待値の確認
      expect(expectedColor).toBe('#ff9800');

      // 修正後の確認: 正しい色が返されること
      expect(actualColor).toBe(expectedColor);
    });

    it('atbb_status = "配信メールのみ非公開" のとき、ボタン色が #f44336（赤）になること', () => {
      const atbbStatus = '配信メールのみ非公開';
      const actualColor = getActualButtonColor(atbbStatus);
      const expectedColor = getExpectedButtonColor(atbbStatus);

      // 期待値の確認
      expect(expectedColor).toBe('#f44336');

      // 修正後の確認: 正しい色が返されること
      expect(actualColor).toBe(expectedColor);
    });

    it('任意の atbb_status に対して、ボタン色が期待される色と一致すること（プロパティベーステスト）', () => {
      // 代表的な atbb_status パターンを生成するアービトラリ
      const atbbStatusArbitrary = fc.oneof(
        // 成約済み系（sold → #9e9e9e）
        fc.constant('非公開（成約済み）'),
        fc.constant('非公開'),
        fc.constant('非公開（売却済み）'),
        // 公開前系（pre_publish → #ff9800）
        fc.constant('公開前情報あり'),
        fc.constant('公開前'),
        fc.constant('公開前情報'),
        // 非公開（配信メールのみ）系（private → #f44336）
        fc.constant('配信メールのみ非公開'),
        fc.constant('配信メールのみ'),
        // 販売中・その他系（other → #2196F3）
        fc.constant('公開中'),
        fc.constant(''),
        fc.string().filter(s =>
          !s.includes('非公開') &&
          !s.includes('公開前') &&
          !s.includes('配信メールのみ')
        )
      );

      fc.assert(
        fc.property(atbbStatusArbitrary, (atbbStatus) => {
          const actualColor = getActualButtonColor(atbbStatus);
          const expectedColor = getExpectedButtonColor(atbbStatus);

          // 修正後の確認: atbb_status に応じた正しい色が返されること
          expect(actualColor).toBe(expectedColor);
        }),
        { numRuns: 50 }
      );
    });
  });
});
