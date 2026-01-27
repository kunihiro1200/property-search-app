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
    seller.situation_company,
    seller.visit_date,
    seller.phone_person,
    seller.pinrichStatus,
    seller.not_reachable,
  ]);
}
