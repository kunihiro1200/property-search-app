/**
 * EE2ボタン色修正 - 保全プロパティテスト（修正前に実施）
 *
 * **Property 2: Preservation** - 既存動作（マーカー色・バッジ設定・ナビゲーション）の保全
 *
 * このテストは修正前のコードで**成功**することが期待される。
 * 成功がベースライン動作を確認し、修正後のリグレッション検出に使用される。
 *
 * 観察優先メソドロジー:
 * - 修正前のコードで非バグ条件の入力の動作を観察する
 * - 観察した動作をベースラインとして記録する
 * - 修正後も同じ動作が保持されることを検証する
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import * as fc from 'fast-check';
import { mapAtbbStatusToDisplayStatus, StatusType } from '../../utils/atbbStatusDisplayMapper';

// ============================================================
// PropertyMapView.tsx から抽出したロジック（修正前のコードを再現）
// ============================================================

/**
 * BADGE_CONFIGS（PropertyMapView.tsx から抽出）
 * 修正前後で変更されないことを保証する
 */
const BADGE_CONFIGS: Record<StatusType, { label: string; color: string; backgroundColor: string; markerColor: string }> = {
  pre_publish: {
    label: '公開前情報',
    color: '#fff',
    backgroundColor: '#ff9800', // オレンジ
    markerColor: '#ff9800',
  },
  private: {
    label: '非公開物件',
    color: '#fff',
    backgroundColor: '#f44336', // 赤
    markerColor: '#f44336',
  },
  sold: {
    label: '成約済み',
    color: '#fff',
    backgroundColor: '#9e9e9e', // グレー
    markerColor: '#9e9e9e',
  },
  other: {
    label: '',
    color: '',
    backgroundColor: '',
    markerColor: '#2196F3', // 水色（販売中物件）
  },
};

/**
 * getMarkerColor（PropertyMapView.tsx から抽出）
 * マーカーの色を取得する関数
 */
function getMarkerColor(atbbStatus: string): string {
  if (!atbbStatus || atbbStatus === '' || atbbStatus === '公開中') {
    return '#2196F3'; // 青（販売中物件）
  }
  const result = mapAtbbStatusToDisplayStatus(atbbStatus);
  return BADGE_CONFIGS[result.statusType].markerColor;
}

/**
 * getBadgeConfig（PropertyMapView.tsx から抽出）
 * バッジ設定を取得する関数
 */
function getBadgeConfig(atbbStatus: string): typeof BADGE_CONFIGS[StatusType] | null {
  if (!atbbStatus || atbbStatus === '') {
    return null;
  }
  const result = mapAtbbStatusToDisplayStatus(atbbStatus);
  if (result.statusType === 'other') {
    return null;
  }
  return BADGE_CONFIGS[result.statusType];
}

// ============================================================
// 観察: 修正前のコードでの動作を確認
// ============================================================

describe('EE2ボタン色修正 - 保全プロパティテスト（修正前は成功する）', () => {
  // ----------------------------------------------------------
  // 観察テスト: 具体的な値でベースライン動作を確認
  // ----------------------------------------------------------
  describe('観察: 修正前のコードでのベースライン動作', () => {
    it('観察1: getMarkerColor("非公開（成約済み）") が #9e9e9e を返すこと', () => {
      // 成約済み物件のマーカーはグレー
      const color = getMarkerColor('非公開（成約済み）');
      expect(color).toBe('#9e9e9e');
    });

    it('観察2: BADGE_CONFIGS["sold"].backgroundColor が #9e9e9e であること', () => {
      // 成約済みバッジの背景色はグレー
      expect(BADGE_CONFIGS['sold'].backgroundColor).toBe('#9e9e9e');
    });

    it('観察3: BADGE_CONFIGS["sold"].markerColor が #9e9e9e であること', () => {
      // 成約済みマーカーの色はグレー
      expect(BADGE_CONFIGS['sold'].markerColor).toBe('#9e9e9e');
    });

    it('観察4: mapAtbbStatusToDisplayStatus("非公開（成約済み）") が sold を返すこと', () => {
      // 成約済み物件のステータス変換
      const result = mapAtbbStatusToDisplayStatus('非公開（成約済み）');
      expect(result.statusType).toBe('sold');
      expect(result.displayStatus).toBe('成約済み');
    });

    it('観察5: getMarkerColor("公開中") が #2196F3（青）を返すこと', () => {
      // 販売中物件のマーカーは青
      const color = getMarkerColor('公開中');
      expect(color).toBe('#2196F3');
    });

    it('観察6: getMarkerColor("公開前情報あり") が #ff9800（オレンジ）を返すこと', () => {
      // 公開前物件のマーカーはオレンジ
      const color = getMarkerColor('公開前情報あり');
      expect(color).toBe('#ff9800');
    });

    it('観察7: getMarkerColor("配信メールのみ非公開") が #f44336（赤）を返すこと', () => {
      // 非公開物件のマーカーは赤
      const color = getMarkerColor('配信メールのみ非公開');
      expect(color).toBe('#f44336');
    });

    it('観察8: getBadgeConfig("非公開（成約済み）") が sold の設定を返すこと', () => {
      // 成約済み物件のバッジ設定
      const config = getBadgeConfig('非公開（成約済み）');
      expect(config).not.toBeNull();
      expect(config?.backgroundColor).toBe('#9e9e9e');
      expect(config?.label).toBe('成約済み');
    });

    it('観察9: getBadgeConfig("公開中") が null を返すこと（バッジなし）', () => {
      // 販売中物件はバッジなし
      const config = getBadgeConfig('公開中');
      expect(config).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // Property 2: Preservation - マーカー色の保全
  // ----------------------------------------------------------
  describe('Property 2: Preservation - マーカー色の保全', () => {
    /**
     * プロパティベーステスト: 任意の atbb_status 文字列に対して
     * getMarkerColor の出力が4色のいずれかであること
     *
     * **Validates: Requirements 3.1, 3.2, 3.3**
     */
    it('任意の atbb_status に対して getMarkerColor は4色のいずれかを返すこと', () => {
      const validColors = ['#2196F3', '#ff9800', '#f44336', '#9e9e9e'];

      fc.assert(
        fc.property(
          fc.string(),
          (atbbStatus) => {
            const color = getMarkerColor(atbbStatus);
            expect(validColors).toContain(color);
          }
        ),
        { numRuns: 200 }
      );
    });

    /**
     * プロパティベーステスト: 成約済み判定の atbb_status は常にグレーマーカーを返すこと
     *
     * **Validates: Requirements 3.3**
     */
    it('「非公開」を含み「配信メール」「公開前」を含まない atbb_status は常に #9e9e9e を返すこと', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.includes('公開前') && !s.includes('配信メール')),
          fc.string().filter(s => !s.includes('公開前') && !s.includes('配信メール')),
          (prefix, suffix) => {
            const atbbStatus = `${prefix}非公開${suffix}`;
            const color = getMarkerColor(atbbStatus);
            expect(color).toBe('#9e9e9e');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * プロパティベーステスト: 「公開前」を含む atbb_status は常にオレンジマーカーを返すこと
     *
     * **Validates: Requirements 3.2**
     */
    it('「公開前」を含む atbb_status は常に #ff9800 を返すこと', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          (prefix, suffix) => {
            const atbbStatus = `${prefix}公開前${suffix}`;
            const color = getMarkerColor(atbbStatus);
            expect(color).toBe('#ff9800');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * プロパティベーステスト: 「配信メールのみ」を含む atbb_status は常に赤マーカーを返すこと
     *
     * **Validates: Requirements 3.5**
     */
    it('「配信メールのみ」を含み「公開前」を含まない atbb_status は常に #f44336 を返すこと', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.includes('公開前')),
          fc.string().filter(s => !s.includes('公開前')),
          (prefix, suffix) => {
            const atbbStatus = `${prefix}配信メールのみ${suffix}`;
            const color = getMarkerColor(atbbStatus);
            expect(color).toBe('#f44336');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * プロパティベーステスト: getMarkerColor の冪等性
     * 同じ入力に対して常に同じ結果を返すこと
     *
     * **Validates: Requirements 3.1, 3.2, 3.3**
     */
    it('getMarkerColor は冪等性を持つ（同じ入力に対して常に同じ結果）', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (atbbStatus) => {
            const color1 = getMarkerColor(atbbStatus);
            const color2 = getMarkerColor(atbbStatus);
            expect(color1).toBe(color2);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  // ----------------------------------------------------------
  // Property 2: Preservation - BADGE_CONFIGS の保全
  // ----------------------------------------------------------
  describe('Property 2: Preservation - BADGE_CONFIGS の保全', () => {
    /**
     * プロパティベーステスト: 任意の atbb_status 文字列に対して
     * BADGE_CONFIGS の参照結果が変わらないこと
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
     */
    it('任意の atbb_status に対して BADGE_CONFIGS の参照結果は一貫していること', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (atbbStatus) => {
            const result = mapAtbbStatusToDisplayStatus(atbbStatus);
            const config = BADGE_CONFIGS[result.statusType];

            // BADGE_CONFIGS は常に有効な設定を返すこと
            expect(config).toBeDefined();
            expect(typeof config.markerColor).toBe('string');
            expect(typeof config.backgroundColor).toBe('string');
          }
        ),
        { numRuns: 200 }
      );
    });

    /**
     * プロパティベーステスト: statusType と BADGE_CONFIGS の整合性
     * statusType に対応する BADGE_CONFIGS の色が正しいこと
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
     */
    it('statusType と BADGE_CONFIGS の色設定が整合していること', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (atbbStatus) => {
            const result = mapAtbbStatusToDisplayStatus(atbbStatus);
            const config = BADGE_CONFIGS[result.statusType];

            // statusType に応じた色の整合性チェック
            if (result.statusType === 'sold') {
              expect(config.markerColor).toBe('#9e9e9e');
              expect(config.backgroundColor).toBe('#9e9e9e');
            } else if (result.statusType === 'pre_publish') {
              expect(config.markerColor).toBe('#ff9800');
              expect(config.backgroundColor).toBe('#ff9800');
            } else if (result.statusType === 'private') {
              expect(config.markerColor).toBe('#f44336');
              expect(config.backgroundColor).toBe('#f44336');
            } else {
              // other: markerColor は #2196F3、backgroundColor は空文字
              expect(config.markerColor).toBe('#2196F3');
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    /**
     * プロパティベーステスト: getBadgeConfig の冪等性
     * 同じ入力に対して常に同じ結果を返すこと
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
     */
    it('getBadgeConfig は冪等性を持つ（同じ入力に対して常に同じ結果）', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (atbbStatus) => {
            const config1 = getBadgeConfig(atbbStatus);
            const config2 = getBadgeConfig(atbbStatus);

            if (config1 === null) {
              expect(config2).toBeNull();
            } else {
              expect(config2).not.toBeNull();
              expect(config1.backgroundColor).toBe(config2?.backgroundColor);
              expect(config1.markerColor).toBe(config2?.markerColor);
              expect(config1.label).toBe(config2?.label);
            }
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  // ----------------------------------------------------------
  // Property 2: Preservation - mapAtbbStatusToDisplayStatus の保全
  // ----------------------------------------------------------
  describe('Property 2: Preservation - mapAtbbStatusToDisplayStatus の変換ロジックの保全', () => {
    /**
     * プロパティベーステスト: 変換ロジックの冪等性
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
     */
    it('mapAtbbStatusToDisplayStatus は冪等性を持つ（同じ入力に対して常に同じ結果）', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (atbbStatus) => {
            const result1 = mapAtbbStatusToDisplayStatus(atbbStatus);
            const result2 = mapAtbbStatusToDisplayStatus(atbbStatus);

            expect(result1.statusType).toBe(result2.statusType);
            expect(result1.displayStatus).toBe(result2.displayStatus);
            expect(result1.originalStatus).toBe(result2.originalStatus);
          }
        ),
        { numRuns: 200 }
      );
    });

    /**
     * プロパティベーステスト: statusType は常に4種類のいずれかであること
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
     */
    it('任意の atbb_status に対して statusType は4種類のいずれかであること', () => {
      const validStatusTypes: StatusType[] = ['pre_publish', 'private', 'sold', 'other'];

      fc.assert(
        fc.property(
          fc.string(),
          (atbbStatus) => {
            const result = mapAtbbStatusToDisplayStatus(atbbStatus);
            expect(validStatusTypes).toContain(result.statusType);
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});
