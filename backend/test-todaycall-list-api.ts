/**
 * todayCallカテゴリのlistSellers APIを直接テストするスクリプト
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { SellerService } from './src/services/SellerService.supabase';

async function main() {
  console.log('=== todayCall listSellers テスト ===\n');

  const sellerService = new SellerService();
  
  try {
    const result = await sellerService.listSellers({
      page: 1,
      pageSize: 500,
      sortBy: 'next_call_date',
      sortOrder: 'asc',
      statusCategory: 'todayCall',
    });
    
    console.log(`📊 todayCallカテゴリの売主: ${result.total}件（取得: ${result.data.length}件）`);
    
    console.log('\n最初の10件:');
    result.data.slice(0, 10).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.sellerNumber}: status="${s.status}", nextCallDate="${s.nextCallDate}", visitAssignee="${s.visitAssignee || ''}"`);
      console.log(`      contactMethod="${s.contactMethod || ''}", preferredContactTime="${s.preferredContactTime || ''}", phoneContactPerson="${s.phoneContactPerson || ''}"`);
    });
    
    // フロントエンドのisTodayCall条件でフィルタリング
    const filteredByFrontend = result.data.filter(s => {
      // 営担チェック
      const visitAssignee = s.visitAssignee || '';
      const hasAssignee = visitAssignee && visitAssignee.trim() !== '' && visitAssignee.trim() !== '外す';
      if (hasAssignee) return false;
      
      // ステータスチェック
      const status = s.status || '';
      const isFollowingUp = typeof status === 'string' && status.includes('追客中');
      if (!isFollowingUp) return false;
      
      // 次電日チェック（今日以前）
      const nextCallDate = s.nextCallDate;
      if (!nextCallDate) return false;
      
      // コミュニケーション情報チェック
      const contactMethod = s.contactMethod || '';
      const preferredContactTime = s.preferredContactTime || '';
      const phoneContactPerson = s.phoneContactPerson || '';
      const hasContactInfo = 
        (contactMethod && contactMethod.trim() !== '') ||
        (preferredContactTime && preferredContactTime.trim() !== '') ||
        (phoneContactPerson && phoneContactPerson.trim() !== '');
      
      return !hasContactInfo;
    });
    
    console.log(`\n📊 フロントエンドのisTodayCall条件でフィルタリング後: ${filteredByFrontend.length}件`);
    
    if (filteredByFrontend.length !== result.data.length) {
      console.log('\n⚠️ フィルタリングで除外された売主:');
      const excluded = result.data.filter(s => !filteredByFrontend.includes(s));
      excluded.slice(0, 10).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.sellerNumber}: status="${s.status}", visitAssignee="${s.visitAssignee || ''}", contactMethod="${s.contactMethod || ''}", preferredContactTime="${s.preferredContactTime || ''}", phoneContactPerson="${s.phoneContactPerson || ''}"`);
      });
    }
  } catch (error) {
    console.log(`❌ エラー: ${error}`);
  }
}

main().catch(console.error);
