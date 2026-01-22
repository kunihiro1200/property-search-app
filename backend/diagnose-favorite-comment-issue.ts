import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { GyomuListService } from './src/services/GyomuListService';

dotenv.config();

async function diagnose() {
  console.log('🔍 お気に入り文言取得の問題を診断中...\n');
  
  const propertyListingService = new PropertyListingService();
  const favoriteCommentService = new FavoriteCommentService();
  const gyomuListService = new GyomuListService();
  
  // テスト物件: AA1120（データなしだった物件）
  const testPropertyNumber = 'AA1120';
  
  console.log(`📝 テスト物件: ${testPropertyNumber}\n`);
  
  // 1. 物件情報を取得
  const property = await propertyListingService.getByPropertyNumber(testPropertyNumber);
  
  if (!property) {
    console.error(`❌ 物件 ${testPropertyNumber} が見つかりません`);
    return;
  }
  
  console.log('✅ 物件情報:');
  console.log(`   ID: ${property.id}`);
  console.log(`   物件番号: ${property.property_number}`);
  console.log(`   物件種別: ${property.property_type}`);
  console.log(`   ATBB状態: ${property.atbb_status}`);
  console.log(`   storage_location: ${property.storage_location || '(空)'}\n`);
  
  // 2. 業務リストを確認
  console.log('🔍 業務リストを確認中...');
  const gyomuData = await gyomuListService.getByPropertyNumber(testPropertyNumber);
  
  if (gyomuData) {
    console.log('✅ 業務リストに存在:');
    console.log(`   物件番号: ${gyomuData.property_number}`);
    console.log(`   スプシURL: ${gyomuData.spreadsheet_url || '(なし)'}`);
    console.log(`   格納先URL: ${gyomuData.storage_url || '(なし)'}\n`);
  } else {
    console.log('❌ 業務リストに存在しません\n');
  }
  
  // 3. お気に入り文言を取得試行
  console.log('🔍 お気に入り文言を取得試行中...');
  try {
    const result = await favoriteCommentService.getFavoriteComment(property.id);
    
    if (result.comment) {
      console.log('✅ お気に入り文言取得成功:');
      console.log(`   "${result.comment.substring(0, 100)}..."`);
    } else {
      console.log('⚠️ お気に入り文言が取得できませんでした');
      console.log(`   理由: ${result.error || '不明'}`);
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 診断結果サマリー');
  console.log('='.repeat(60));
  
  // 4. 公開物件全体の統計
  console.log('\n🔍 公開物件全体の統計を取得中...');
  
  const PUBLIC_ATBB_STATUSES = [
    '一般・公開中',
    '専任・公開中',
    '非公開（配信メールのみ）'
  ];
  
  const { data: allProperties } = await propertyListingService.getAll({
    limit: 1000,
    offset: 0,
    orderBy: 'created_at',
    orderDirection: 'desc'
  });
  
  const publicProperties = allProperties.filter(p => 
    p.atbb_status && PUBLIC_ATBB_STATUSES.includes(p.atbb_status)
  );
  
  console.log(`\n📊 公開物件統計:`);
  console.log(`   総物件数: ${allProperties.length}`);
  console.log(`   公開物件数: ${publicProperties.length}`);
  
  // 物件種別ごとの統計
  const typeStats: Record<string, number> = {};
  publicProperties.forEach(p => {
    const type = p.property_type || 'null';
    typeStats[type] = (typeStats[type] || 0) + 1;
  });
  
  console.log(`\n📊 物件種別ごとの統計:`);
  Object.entries(typeStats).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}件`);
  });
  
  // 業務リストにある物件の統計
  const gyomuList = await gyomuListService.getAll();
  const gyomuPropertyNumbers = new Set(gyomuList.map(g => g.property_number));
  
  const inGyomuList = publicProperties.filter(p => gyomuPropertyNumbers.has(p.property_number));
  const notInGyomuList = publicProperties.filter(p => !gyomuPropertyNumbers.has(p.property_number));
  
  console.log(`\n📊 業務リスト登録状況:`);
  console.log(`   業務リストに登録済み: ${inGyomuList.length}件`);
  console.log(`   業務リストに未登録: ${notInGyomuList.length}件`);
  
  if (notInGyomuList.length > 0) {
    console.log(`\n⚠️ 業務リストに未登録の物件（最初の10件）:`);
    notInGyomuList.slice(0, 10).forEach(p => {
      console.log(`   ${p.property_number} (${p.property_type || 'null'})`);
    });
  }
}

diagnose().catch(error => {
  console.error('❌ 診断エラー:', error);
  process.exit(1);
});
