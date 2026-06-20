/**
 * fast-check用のカスタムArbitraryジェネレーター
 * プロパティベーステストで使用するランダムデータ生成
 */

import * as fc from 'fast-check';
import { Seller, Activity, SellerStatus, ConfidenceLevel } from '../../types';

/**
 * 売主番号を生成（AA + 5桁の数字）
 */
export const sellerNumberArbitrary = (): fc.Arbitrary<string> => {
  return fc.integer({ min: 1, max: 99999 }).map(num => `AA${num.toString().padStart(5, '0')}`);
};

/**
 * 日本の電話番号を生成
 */
export const phoneNumberArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    // 携帯電話
    fc.tuple(
      fc.constantFrom('090', '080', '070'),
      fc.integer({ min: 1000, max: 9999 }),
      fc.integer({ min: 1000, max: 9999 })
    ).map(([prefix, mid, last]) => `${prefix}-${mid}-${last}`),
    // 固定電話
    fc.tuple(
      fc.integer({ min: 1, max: 99 }),
      fc.integer({ min: 100, max: 9999 }),
      fc.integer({ min: 1000, max: 9999 })
    ).map(([area, mid, last]) => `0${area}-${mid}-${last}`)
  );
};

/**
 * メールアドレスを生成
 */
export const emailArbitrary = (): fc.Arbitrary<string> => {
  return fc.tuple(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 3, maxLength: 10 }),
    fc.constantFrom('gmail.com', 'yahoo.co.jp', 'example.com', 'test.jp')
  ).map(([local, domain]) => `${local}@${domain}`);
};

/**
 * 日本の住所を生成
 */
export const addressArbitrary = (): fc.Arbitrary<string> => {
  const prefectures = ['東京都', '大阪府', '神奈川県', '愛知県', '福岡県', '北海道'];
  const cities = ['中央区', '港区', '新宿区', '渋谷区', '豊島区'];
  
  return fc.tuple(
    fc.constantFrom(...prefectures),
    fc.constantFrom(...cities),
    fc.integer({ min: 1, max: 9 }),
    fc.integer({ min: 1, max: 30 }),
    fc.integer({ min: 1, max: 20 })
  ).map(([pref, city, chome, banchi, go]) => 
    `${pref}${city}${chome}-${banchi}-${go}`
  );
};

/**
 * 物件種別を生成
 */
export const propertyTypeArbitrary = (): fc.Arbitrary<'detached_house' | 'land' | 'apartment'> => {
  return fc.constantFrom('detached_house', 'land', 'apartment');
};

/**
 * 売主ステータスを生成
 */
export const sellerStatusArbitrary = (): fc.Arbitrary<SellerStatus> => {
  return fc.constantFrom(
    SellerStatus.FOLLOWING_UP,
    SellerStatus.APPOINTMENT_SCHEDULED,
    SellerStatus.VISITED,
    SellerStatus.EXCLUSIVE_CONTRACT,
    SellerStatus.GENERAL_CONTRACT,
    SellerStatus.CONTRACTED,
    SellerStatus.OTHER_DECISION,
    SellerStatus.FOLLOW_UP_NOT_NEEDED,
    SellerStatus.LOST
  );
};

/**
 * 確度を生成
 */
export const confidenceArbitrary = (): fc.Arbitrary<ConfidenceLevel> => {
  return fc.constantFrom(
    ConfidenceLevel.A,
    ConfidenceLevel.B,
    ConfidenceLevel.B_PRIME,
    ConfidenceLevel.C,
    ConfidenceLevel.D,
    ConfidenceLevel.E,
    ConfidenceLevel.DUPLICATE
  );
};

/**
 * 構造を生成
 */
export const structureArbitrary = (): fc.Arbitrary<string> => {
  return fc.constantFrom('wood', 'light_steel', 'steel', 'other');
};

/**
 * 売主状況を生成
 */
export const sellerSituationArbitrary = (): fc.Arbitrary<string> => {
  return fc.constantFrom('occupied', 'vacant', 'rented', 'old_house', 'vacant_land');
};

/**
 * 連絡方法を生成
 */
export const contactMethodArbitrary = (): fc.Arbitrary<string> => {
  return fc.constantFrom('email', 'smail', 'phone');
};

/**
 * 査定方法を生成
 */
export const appraisalMethodArbitrary = (): fc.Arbitrary<string> => {
  return fc.constantFrom('email', 'mail', 'unreachable');
};

/**
 * 郵送ステータスを生成
 */
export const mailStatusArbitrary = (): fc.Arbitrary<string> => {
  return fc.constantFrom('pending', 'sent');
};

/**
 * Pinrichステータスを生成
 */
export const pinrichStatusArbitrary = (): fc.Arbitrary<string> => {
  return fc.constantFrom('distributing', 'closed');
};

/**
 * 除外アクションを生成
 */
export const exclusionActionArbitrary = (): fc.Arbitrary<string> => {
  return fc.constantFrom('exclude_if_unreachable', 'exclude_without_action');
};

/**
 * 打合せステータスを生成
 */
export const meetingStatusArbitrary = (): fc.Arbitrary<string> => {
  return fc.constantFrom('pending', 'completed');
};

/**
 * 売主データを生成
 */
export const sellerArbitrary = (): fc.Arbitrary<Partial<Seller>> => {
  return fc.record({
    name: fc.string({ minLength: 2, maxLength: 50 }),
    phoneNumber: phoneNumberArbitrary(),
    email: fc.option(emailArbitrary(), { nil: undefined }),
    address: addressArbitrary(),
    requestorAddress: fc.option(addressArbitrary(), { nil: undefined }),
    status: sellerStatusArbitrary(),
    confidence: confidenceArbitrary(),
    nextCallDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
    unreachable: fc.option(fc.boolean(), { nil: undefined }),
    contactMethod: fc.option(contactMethodArbitrary(), { nil: undefined }),
    valuationMethod: fc.option(appraisalMethodArbitrary(), { nil: undefined }),
    mailingStatus: fc.option(mailStatusArbitrary(), { nil: undefined }),
    pinrichStatus: fc.option(pinrichStatusArbitrary(), { nil: undefined }),
    exclusionAction: fc.option(exclusionActionArbitrary(), { nil: undefined }),
  }) as fc.Arbitrary<Partial<Seller>>;
};

/**
 * 活動種別を生成
 */
export const activityTypeArbitrary = (): fc.Arbitrary<string> => {
  return fc.constantFrom('phone', 'email', 'sms', 'visit', 'other');
};

/**
 * 活動データを生成
 */
export const activityArbitrary = (): fc.Arbitrary<Partial<Activity>> => {
  return fc.record({
    sellerId: fc.uuid(),
    activityType: activityTypeArbitrary(),
    timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
    performedBy: fc.uuid(),
    performedByEmail: emailArbitrary(),
    notes: fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: undefined }),
  });
};

/**
 * 査定データを生成
 */
export const valuationArbitrary = (): fc.Arbitrary<{
  sellerId: string;
  amount1: number;
  amount2: number;
  amount3: number;
  calculationMethod: string;
  calculationBasis: string;
  isPostVisit: boolean;
}> => {
  return fc.record({
    sellerId: fc.uuid(),
    amount1: fc.integer({ min: 1000000, max: 100000000 }), // 100万円〜1億円
    amount2: fc.integer({ min: 1000000, max: 100000000 }),
    amount3: fc.integer({ min: 1000000, max: 100000000 }),
    calculationMethod: fc.constantFrom('automatic', 'manual', 'post_visit'),
    calculationBasis: fc.string({ minLength: 10, maxLength: 200 }),
    isPostVisit: fc.boolean(),
  });
};

/**
 * 物件データを生成（査定計算用）
 */
export const propertyDataArbitrary = (): fc.Arbitrary<{
  propertyType: 'detached_house' | 'land' | 'apartment';
  landArea: number;
  buildingArea?: number;
  structure?: string;
  buildYear?: number;
  location: string;
}> => {
  return fc.record({
    propertyType: propertyTypeArbitrary(),
    landArea: fc.double({ min: 50, max: 1000, noNaN: true }),
    buildingArea: fc.option(fc.double({ min: 30, max: 500, noNaN: true }), { nil: undefined }),
    structure: fc.option(structureArbitrary(), { nil: undefined }),
    buildYear: fc.option(fc.integer({ min: 1950, max: 2024 }), { nil: undefined }),
    location: addressArbitrary(),
  });
};

/**
 * 損失要因を生成（複数選択）
 */
export const lossFactorsArbitrary = (): fc.Arbitrary<string[]> => {
  const allFactors = [
    '知り合い', '価格が高い', '決定権者の把握', '連絡不足', '購入物件の紹介',
    '購入希望者がいる', '以前つきあいがあった不動産', 'ヒアリング不足',
    '担当者の対応が良い', '査定書郵送', '１番電話のスピード', '対応スピード',
    '買取保証', '追客電話の対応', '説明が丁寧', '詳細な調査',
    '不誠実・やるべきことをしない', '定期的な追客電話', 'HPの口コミ',
    '売買に強い', '仲介手数料のサービス', '仲介手数料以外のサービス',
    '妥当な査定額', '定期的なメール配信', '提案力', '熱意', 'その他'
  ];
  
  return fc.array(fc.constantFrom(...allFactors), { minLength: 1, maxLength: 5 });
};

/**
 * 検索クエリを生成
 */
export const searchQueryArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.string({ minLength: 2, maxLength: 10 }), // 一般的な検索文字列
    phoneNumberArbitrary().map(phone => phone.substring(0, 8)), // 電話番号の一部
    addressArbitrary().map(addr => addr.substring(0, 5)), // 住所の一部
  );
};

/**
 * ページネーションパラメータを生成
 */
export const paginationArbitrary = (): fc.Arbitrary<{ page: number; limit: number }> => {
  return fc.record({
    page: fc.integer({ min: 1, max: 100 }),
    limit: fc.integer({ min: 10, max: 100 }),
  });
};

/**
 * 日付範囲を生成
 */
export const dateRangeArbitrary = (): fc.Arbitrary<{ start: Date; end: Date }> => {
  return fc.tuple(
    fc.date({ min: new Date('2024-01-01'), max: new Date('2025-06-30') }),
    fc.date({ min: new Date('2025-07-01'), max: new Date('2025-12-31') })
  ).map(([start, end]) => ({ start, end }));
};
