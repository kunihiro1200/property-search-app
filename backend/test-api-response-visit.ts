/**
 * バックエンドAPIのレスポンス形式を確認
 * フロントエンドが期待する形式と一致しているかを確認
 */

import dotenv from 'dotenv';
// .env.localを先に読み込んで優先させる
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { SellerService } from './src/services/SellerService.supabase';

async function main() {
  console.log('=== APIレスポンス形式の確認 ===');
  console.log('');
  
  const sellerService = new SellerService();
  
  // 訪問予定を取得
  console.log('--- statusCategory=visitScheduled ---');
  const visitScheduledResult = await sellerService.listSellers({
    page: 1,
    pageSize: 10,
    statusCategory: 'visitScheduled',
  });
  
  console.log('レスポンス構造:');
  console.log('  total:', visitScheduledResult.total);
  console.log('  data:', Array.isArray(visitScheduledResult.data) ? `配列 (${visitScheduledResult.data.length}件)` : typeof visitScheduledResult.data);
  console.log('  page:', visitScheduledResult.page);
  console.log('  pageSize:', visitScheduledResult.pageSize);
  console.log('  totalPages:', visitScheduledResult.totalPages);
  
  if (visitScheduledResult.data && visitScheduledResult.data.length > 0) {
    console.log('');
    console.log('最初の売主のフィールド:');
    const firstSeller = visitScheduledResult.data[0];
    console.log('  id:', firstSeller.id);
    console.log('  sellerNumber:', firstSeller.sellerNumber);
    console.log('  visitDate:', firstSeller.visitDate);
    console.log('  visitDate type:', typeof firstSeller.visitDate);
    console.log('  visitAssignee:', firstSeller.visitAssignee);
    console.log('  visitAssignee type:', typeof firstSeller.visitAssignee);
    
    // スネークケースのフィールドも確認
    console.log('');
    console.log('スネークケースのフィールド（存在するか確認）:');
    console.log('  visit_date:', firstSeller.visit_date);
    console.log('  visit_assignee:', firstSeller.visit_assignee);
    
    // 全フィールドを出力
    console.log('');
    console.log('全フィールド:');
    Object.keys(firstSeller).forEach(key => {
      const value = firstSeller[key];
      const valueStr = value instanceof Date ? value.toISOString() : String(value).substring(0, 50);
      console.log(`  ${key}: ${valueStr}`);
    });
  }
  
  console.log('');
  console.log('=== フロントエンドのフィルタリングをシミュレート ===');
  
  // フロントエンドのisVisitScheduledをシミュレート
  const getTodayJSTString = (): string => {
    const now = new Date();
    const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const year = jstTime.getUTCFullYear();
    const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const normalizeDateString = (dateStr: string | Date | undefined | null): string | null => {
    if (!dateStr) return null;
    
    try {
      let dateString: string;
      
      if (dateStr instanceof Date) {
        const year = dateStr.getFullYear();
        const month = String(dateStr.getMonth() + 1).padStart(2, '0');
        const day = String(dateStr.getDate()).padStart(2, '0');
        dateString = `${year}-${month}-${day}`;
      } else {
        dateString = String(dateStr);
      }
      
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      
      if (dateString.includes('-')) {
        const datePart = dateString.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  };
  
  const isTodayOrAfter = (dateStr: string | Date | undefined | null): boolean => {
    const normalized = normalizeDateString(dateStr);
    if (!normalized) return false;
    const todayStr = getTodayJSTString();
    return normalized >= todayStr;
  };
  
  const hasVisitAssignee = (seller: any): boolean => {
    const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
    if (!visitAssignee || visitAssignee.trim() === '' || visitAssignee.trim() === '外す') {
      return false;
    }
    return true;
  };
  
  const isVisitScheduled = (seller: any): boolean => {
    if (!hasVisitAssignee(seller)) return false;
    const visitDate = seller.visitDate || seller.visit_date;
    if (!visitDate) return false;
    return isTodayOrAfter(visitDate);
  };
  
  console.log('今日の日付（JST）:', getTodayJSTString());
  console.log('');
  
  if (visitScheduledResult.data && visitScheduledResult.data.length > 0) {
    visitScheduledResult.data.forEach((seller: any) => {
      const visitDate = seller.visitDate || seller.visit_date;
      const visitAssignee = seller.visitAssignee || seller.visit_assignee;
      const normalized = normalizeDateString(visitDate);
      const hasAssignee = hasVisitAssignee(seller);
      const isScheduled = isVisitScheduled(seller);
      
      console.log(`${seller.sellerNumber}:`);
      console.log(`  visitDate: ${visitDate}`);
      console.log(`  visitDate type: ${typeof visitDate}`);
      console.log(`  normalized: ${normalized}`);
      console.log(`  visitAssignee: ${visitAssignee}`);
      console.log(`  hasVisitAssignee: ${hasAssignee}`);
      console.log(`  isVisitScheduled: ${isScheduled}`);
      console.log('');
    });
  }
}

main().catch(console.error);
