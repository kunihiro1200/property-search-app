/**
 * SellerServiceの訪問予定/訪問済みデータを直接確認
 */

import dotenv from 'dotenv';
// .env.localを先に読み込んで優先させる
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { SellerService } from './src/services/SellerService.supabase';

async function main() {
  console.log('=== SellerServiceの訪問予定/訪問済みデータ確認 ===');
  console.log('');
  
  const sellerService = new SellerService();
  
  try {
    // 訪問予定を取得
    console.log('--- 訪問予定（visitScheduled） ---');
    const visitScheduledResult = await sellerService.listSellers({
      page: 1,
      pageSize: 100,
      statusCategory: 'visitScheduled',
    });
    
    console.log('total:', visitScheduledResult.total);
    console.log('data配列の長さ:', visitScheduledResult.data?.length || 0);
    
    if (visitScheduledResult.data && visitScheduledResult.data.length > 0) {
      console.log('');
      console.log('訪問予定の売主:');
      visitScheduledResult.data.forEach((seller: any) => {
        console.log(`  ${seller.sellerNumber}:`);
        console.log(`    visitDate = ${seller.visitDate}`);
        console.log(`    visitDate type = ${typeof seller.visitDate}`);
        console.log(`    visitAssignee = ${seller.visitAssignee}`);
        // スネークケースも確認
        console.log(`    visit_date = ${seller.visit_date}`);
        console.log(`    visit_assignee = ${seller.visit_assignee}`);
      });
    } else {
      console.log('⚠️ 訪問予定の売主が0件です');
    }
    
    console.log('');
    
    // 訪問済みを取得
    console.log('--- 訪問済み（visitCompleted） ---');
    const visitCompletedResult = await sellerService.listSellers({
      page: 1,
      pageSize: 100,
      statusCategory: 'visitCompleted',
    });
    
    console.log('total:', visitCompletedResult.total);
    console.log('data配列の長さ:', visitCompletedResult.data?.length || 0);
    
    if (visitCompletedResult.data && visitCompletedResult.data.length > 0) {
      console.log('');
      console.log('訪問済みの売主（最初の5件）:');
      visitCompletedResult.data.slice(0, 5).forEach((seller: any) => {
        console.log(`  ${seller.sellerNumber}:`);
        console.log(`    visitDate = ${seller.visitDate}`);
        console.log(`    visitDate type = ${typeof seller.visitDate}`);
        console.log(`    visitAssignee = ${seller.visitAssignee}`);
        // スネークケースも確認
        console.log(`    visit_date = ${seller.visit_date}`);
        console.log(`    visit_assignee = ${seller.visit_assignee}`);
      });
    } else {
      console.log('⚠️ 訪問済みの売主が0件です');
    }
    
    console.log('');
    console.log('=== フロントエンドのフィルタリングをシミュレート ===');
    
    // フロントエンドのisVisitScheduled/isVisitCompletedをシミュレート
    const allSellers = [...(visitScheduledResult.data || []), ...(visitCompletedResult.data || [])];
    
    // 日付比較用のヘルパー関数
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
    
    const isYesterdayOrBefore = (dateStr: string | Date | undefined | null): boolean => {
      const normalized = normalizeDateString(dateStr);
      if (!normalized) return false;
      const todayStr = getTodayJSTString();
      return normalized < todayStr;
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
    
    const isVisitCompleted = (seller: any): boolean => {
      if (!hasVisitAssignee(seller)) return false;
      const visitDate = seller.visitDate || seller.visit_date;
      if (!visitDate) return false;
      return isYesterdayOrBefore(visitDate);
    };
    
    console.log('今日の日付（JST）:', getTodayJSTString());
    console.log('');
    
    const filteredVisitScheduled = allSellers.filter(isVisitScheduled);
    const filteredVisitCompleted = allSellers.filter(isVisitCompleted);
    
    console.log('フィルタリング結果:');
    console.log('  訪問予定:', filteredVisitScheduled.length, '件');
    console.log('  訪問済み:', filteredVisitCompleted.length, '件');
    
    if (filteredVisitScheduled.length > 0) {
      console.log('');
      console.log('訪問予定の売主（フィルタリング後）:');
      filteredVisitScheduled.forEach((seller: any) => {
        console.log(`  ${seller.sellerNumber}: visitDate=${seller.visitDate}, visitAssignee=${seller.visitAssignee}`);
      });
    }
    
    if (filteredVisitCompleted.length > 0) {
      console.log('');
      console.log('訪問済みの売主（フィルタリング後、最初の5件）:');
      filteredVisitCompleted.slice(0, 5).forEach((seller: any) => {
        console.log(`  ${seller.sellerNumber}: visitDate=${seller.visitDate}, visitAssignee=${seller.visitAssignee}`);
      });
    }
    
  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

main().catch(console.error);
