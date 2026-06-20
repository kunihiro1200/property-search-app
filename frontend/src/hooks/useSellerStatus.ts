/**
 * 売主ステータス計算カスタムフック
 * 
 * 売主のステータスを計算し、メモ化して返します。
 * パフォーマンス最適化のため、useMemoを使用しています。
 */

import { useMemo } from 'react';
import { calculateSellerStatus } from '../utils/sellerStatusUtils';
import type { Seller } from '../types';

/**
 * 売主のステータスを計算するカスタムフック
 * 
 * @param seller 売主データ
 * @returns ステータスの配列
 * 
 * @example
 * function SellerRow({ seller }: { seller: Seller }) {
 *   const statuses = useSellerStatus(seller);
 *   
 *   return (
 *     <tr>
 *       <td>{seller.name}</td>
 *       <td>{statuses.join(', ')}</td>
 *     </tr>
 *   );
 * }
 */
export function useSellerStatus(seller: Seller): string[] {
  return useMemo(() => {
    return calculateSellerStatus(seller);
  }, [
    // 依存配列: ステータス計算に必要なフィールドのみ
    seller.next_call_date,
    seller.visit_date,
    seller.visitDate, // camelCase版
    seller.visit_assignee, // 営担（snake_case）
    seller.visitAssignee, // 営担（camelCase）
    seller.phone_person,
    seller.phone_contact_person, // 電話担当（任意）
    seller.phoneContactPerson, // camelCase版
    seller.contactMethod, // 連絡方法（camelCase）
    seller.contact_method, // 連絡方法（snake_case）
    seller.preferredContactTime, // 連絡取りやすい日、時間帯（camelCase）
    seller.preferred_contact_time, // 連絡取りやすい日、時間帯（snake_case）
    seller.valuationMethod, // 査定方法（camelCase）
    seller.valuation_method, // 査定方法（snake_case）
    seller.inquiry_date, // 反響日付（snake_case）
    seller.inquiryDate, // 反響日付（camelCase）
    seller.pinrichStatus,
    seller.pinrich,
    seller.status, // 状況（当社）
    seller.situation_company, // 状況（当社）snake_case
  ]);
}
