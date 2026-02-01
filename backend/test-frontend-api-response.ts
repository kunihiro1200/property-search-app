/**
 * フロントエンドが受け取るAPIレスポンスをテスト
 * 訪問予定/訪問済みのフィールドが正しく含まれているか確認
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function testFrontendApiResponse() {
  console.log('=== フロントエンドAPIレスポンステスト ===');
  console.log('API URL:', API_BASE_URL);
  console.log('');

  try {
    // visitScheduledカテゴリの売主を取得
    console.log('--- visitScheduled APIレスポンス ---');
    const visitScheduledResponse = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        page: 1,
        pageSize: 10,
        sortBy: 'next_call_date',
        sortOrder: 'asc',
        statusCategory: 'visitScheduled',
      },
    });

    const visitScheduledSellers = visitScheduledResponse.data?.data || [];
    console.log('取得件数:', visitScheduledSellers.length);
    
    if (visitScheduledSellers.length > 0) {
      console.log('\n最初の売主のフィールド:');
      const firstSeller = visitScheduledSellers[0];
      console.log('  sellerNumber:', firstSeller.sellerNumber);
      console.log('  name:', firstSeller.name);
      console.log('  visitDate:', firstSeller.visitDate);
      console.log('  visit_date:', firstSeller.visit_date);
      console.log('  visitAssignee:', firstSeller.visitAssignee);
      console.log('  visit_assignee:', firstSeller.visit_assignee);
      console.log('  appointmentDate:', firstSeller.appointmentDate);
      console.log('  assignedTo:', firstSeller.assignedTo);
      
      console.log('\n全フィールド一覧:');
      Object.keys(firstSeller).forEach(key => {
        const value = firstSeller[key];
        if (value !== null && value !== undefined && value !== '') {
          console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
        }
      });
    }

    // visitCompletedカテゴリの売主を取得
    console.log('\n--- visitCompleted APIレスポンス ---');
    const visitCompletedResponse = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        page: 1,
        pageSize: 10,
        sortBy: 'next_call_date',
        sortOrder: 'asc',
        statusCategory: 'visitCompleted',
      },
    });

    const visitCompletedSellers = visitCompletedResponse.data?.data || [];
    console.log('取得件数:', visitCompletedSellers.length);
    
    if (visitCompletedSellers.length > 0) {
      console.log('\n最初の売主のフィールド:');
      const firstSeller = visitCompletedSellers[0];
      console.log('  sellerNumber:', firstSeller.sellerNumber);
      console.log('  name:', firstSeller.name);
      console.log('  visitDate:', firstSeller.visitDate);
      console.log('  visit_date:', firstSeller.visit_date);
      console.log('  visitAssignee:', firstSeller.visitAssignee);
      console.log('  visit_assignee:', firstSeller.visit_assignee);
    }

    // フィルタリングテスト
    console.log('\n--- フィルタリングテスト ---');
    
    // isVisitScheduledのロジックをシミュレート
    const testVisitScheduled = (seller: any): boolean => {
      const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
      if (!visitAssignee || visitAssignee.trim() === '' || visitAssignee.trim() === '外す') {
        return false;
      }
      
      const visitDate = seller.visitDate || seller.visit_date;
      if (!visitDate) {
        return false;
      }
      
      // 今日以降かチェック
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const date = new Date(visitDate);
      date.setHours(0, 0, 0, 0);
      return date >= today;
    };

    // isVisitCompletedのロジックをシミュレート
    const testVisitCompleted = (seller: any): boolean => {
      const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
      if (!visitAssignee || visitAssignee.trim() === '' || visitAssignee.trim() === '外す') {
        return false;
      }
      
      const visitDate = seller.visitDate || seller.visit_date;
      if (!visitDate) {
        return false;
      }
      
      // 昨日以前かチェック
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const date = new Date(visitDate);
      date.setHours(0, 0, 0, 0);
      return date < today;
    };

    console.log('\nvisitScheduled売主のフィルタリング結果:');
    visitScheduledSellers.forEach((seller: any) => {
      const result = testVisitScheduled(seller);
      console.log(`  ${seller.sellerNumber}: ${result ? '✅ 訪問予定' : '❌ 対象外'}`);
      if (!result) {
        console.log(`    visitAssignee: "${seller.visitAssignee || seller.visit_assignee || '(空)'}"`);
        console.log(`    visitDate: "${seller.visitDate || seller.visit_date || '(空)'}"`);
      }
    });

    console.log('\nvisitCompleted売主のフィルタリング結果:');
    visitCompletedSellers.slice(0, 5).forEach((seller: any) => {
      const result = testVisitCompleted(seller);
      console.log(`  ${seller.sellerNumber}: ${result ? '✅ 訪問済み' : '❌ 対象外'}`);
      if (!result) {
        console.log(`    visitAssignee: "${seller.visitAssignee || seller.visit_assignee || '(空)'}"`);
        console.log(`    visitDate: "${seller.visitDate || seller.visit_date || '(空)'}"`);
      }
    });

  } catch (error: any) {
    console.error('エラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', error.response.data);
    }
  }
}

testFrontendApiResponse();
