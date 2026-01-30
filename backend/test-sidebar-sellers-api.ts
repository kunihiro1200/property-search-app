/**
 * サイドバー用売主リストAPIのテスト
 * 
 * CallModePageのサイドバーで使用されるAPIレスポンスを確認
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function testSidebarSellersApi() {
  console.log('=== サイドバー用売主リストAPIテスト ===\n');
  
  try {
    // CallModePageと同じパラメータでAPIを呼び出し
    const response = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        page: 1,
        pageSize: 200,
        sortBy: 'inquiry_date',
        sortOrder: 'desc',
      },
    });
    
    const sellers = response.data.data || [];
    console.log('取得件数:', sellers.length);
    
    if (sellers.length === 0) {
      console.log('❌ 売主データが取得できませんでした');
      return;
    }
    
    // サンプルデータを表示
    console.log('\n=== サンプル売主データ（最初の3件） ===');
    sellers.slice(0, 3).forEach((seller: any, index: number) => {
      console.log(`\n--- 売主 ${index + 1}: ${seller.sellerNumber} ---`);
      console.log('status:', seller.status);
      console.log('nextCallDate:', seller.nextCallDate);
      console.log('contactMethod:', seller.contactMethod);
      console.log('preferredContactTime:', seller.preferredContactTime);
      console.log('phoneContactPerson:', seller.phoneContactPerson);
    });
    
    // AA13507とAA13489を探す
    console.log('\n=== 特定の売主を検索 ===');
    const aa13507 = sellers.find((s: any) => s.sellerNumber === 'AA13507');
    const aa13489 = sellers.find((s: any) => s.sellerNumber === 'AA13489');
    
    if (aa13507) {
      console.log('\n--- AA13507 ---');
      console.log('status:', aa13507.status);
      console.log('nextCallDate:', aa13507.nextCallDate);
      console.log('contactMethod:', aa13507.contactMethod);
      console.log('preferredContactTime:', aa13507.preferredContactTime);
      console.log('phoneContactPerson:', aa13507.phoneContactPerson);
    } else {
      console.log('AA13507: 見つかりませんでした');
    }
    
    if (aa13489) {
      console.log('\n--- AA13489 ---');
      console.log('status:', aa13489.status);
      console.log('nextCallDate:', aa13489.nextCallDate);
      console.log('contactMethod:', aa13489.contactMethod);
      console.log('preferredContactTime:', aa13489.preferredContactTime);
      console.log('phoneContactPerson:', aa13489.phoneContactPerson);
    } else {
      console.log('AA13489: 見つかりませんでした');
    }
    
    // フィルタリング条件を確認
    console.log('\n=== フィルタリング条件の確認 ===');
    
    // 追客中の売主を数える
    const followingUpSellers = sellers.filter((s: any) => {
      const status = s.status || '';
      return typeof status === 'string' && status.includes('追客中');
    });
    console.log('追客中の売主:', followingUpSellers.length);
    
    // 次電日が今日以前の売主を数える
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrBeforeSellers = sellers.filter((s: any) => {
      const nextCallDate = s.nextCallDate;
      if (!nextCallDate) return false;
      const date = new Date(nextCallDate);
      date.setHours(0, 0, 0, 0);
      return date.getTime() <= today.getTime();
    });
    console.log('次電日が今日以前の売主:', todayOrBeforeSellers.length);
    
    // 当日TELの共通条件を満たす売主
    const todayCallBaseSellers = sellers.filter((s: any) => {
      const status = s.status || '';
      const isFollowingUp = typeof status === 'string' && status.includes('追客中');
      if (!isFollowingUp) return false;
      
      const nextCallDate = s.nextCallDate;
      if (!nextCallDate) return false;
      const date = new Date(nextCallDate);
      date.setHours(0, 0, 0, 0);
      return date.getTime() <= today.getTime();
    });
    console.log('当日TEL共通条件を満たす売主:', todayCallBaseSellers.length);
    
    // コミュニケーション情報がない売主（当日TEL分）
    const todayCallSellers = todayCallBaseSellers.filter((s: any) => {
      const contactMethod = s.contactMethod || '';
      const preferredContactTime = s.preferredContactTime || '';
      const phoneContactPerson = s.phoneContactPerson || '';
      return !contactMethod && !preferredContactTime && !phoneContactPerson;
    });
    console.log('当日TEL分（コミュニケーション情報なし）:', todayCallSellers.length);
    
    // コミュニケーション情報がある売主（当日TEL（内容））
    const todayCallWithInfoSellers = todayCallBaseSellers.filter((s: any) => {
      const contactMethod = s.contactMethod || '';
      const preferredContactTime = s.preferredContactTime || '';
      const phoneContactPerson = s.phoneContactPerson || '';
      return contactMethod || preferredContactTime || phoneContactPerson;
    });
    console.log('当日TEL（内容）（コミュニケーション情報あり）:', todayCallWithInfoSellers.length);
    
    if (todayCallWithInfoSellers.length > 0) {
      console.log('\n当日TEL（内容）の売主:');
      todayCallWithInfoSellers.forEach((s: any) => {
        const info = s.contactMethod || s.preferredContactTime || s.phoneContactPerson;
        console.log(`  ${s.sellerNumber}: ${info}`);
      });
    }
    
    console.log('\n✅ テスト完了');
    
  } catch (error: any) {
    console.error('❌ APIエラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', error.response.data);
    }
  }
}

testSidebarSellersApi();
