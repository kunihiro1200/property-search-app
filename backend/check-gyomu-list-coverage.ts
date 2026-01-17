import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';
import { GyomuListService } from './src/services/GyomuListService';

dotenv.config();

async function checkCoverage() {
  console.log('🔍 業務リストのカバレッジを確認中...\n');
  
  const propertyListingService = new PropertyListingService();
  const gyomuListService = new GyomuListService();
  
  // 公開物件を取得
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
  
  console.log(`📊 公開物件数: ${publicProperties.length}件\n`);
  
  // 業務リストのデータを取得
  const gyomuListData: any[] = [];
  for (const property of publicProperties) {
    const gyomuData = await gyomuListService.getByPropertyNumber(property.property_number);
    if (gyomuData) {
      gyomuListData.push({
        property_number: property.property_number,
        property_type: property.property_type,
        has_spreadsheet_url: !!gyomuData.spreadsheet_url,
        spreadsheet_url: gyomuData.spreadsheet_url
      });
    }
  }
  
  console.log(`📊 業務リストに登録済み: ${gyomuListData.length}件`);
  console.log(`📊 業務リストに未登録: ${publicProperties.length - gyomuListData.length}件\n`);
  
  // スプレッドシートURLがある物件
  const withSpreadsheetUrl = gyomuListData.filter(d => d.has_spreadsheet_url);
  console.log(`📊 スプレッドシートURLあり: ${withSpreadsheetUrl.length}件`);
  console.log(`📊 スプレッドシートURLなし: ${gyomuListData.length - withSpreadsheetUrl.length}件\n`);
  
  // 業務リストに未登録の物件リスト
  const gyomuPropertyNumbers = new Set(gyomuListData.map(d => d.property_number));
  const notInGyomuList = publicProperties.filter(p => !gyomuPropertyNumbers.has(p.property_number));
  
  if (notInGyomuList.length > 0) {
    console.log('⚠️ 業務リストに未登録の物件:');
    console.log('='.repeat(60));
    
    // 物件種別ごとに集計
    const typeStats: Record<string, string[]> = {};
    notInGyomuList.forEach(p => {
      const type = p.property_type || 'null';
      if (!typeStats[type]) typeStats[type] = [];
      typeStats[type].push(p.property_number);
    });
    
    Object.entries(typeStats).sort((a, b) => b[1].length - a[1].length).forEach(([type, numbers]) => {
      console.log(`\n${type} (${numbers.length}件):`);
      numbers.slice(0, 10).forEach(num => console.log(`   ${num}`));
      if (numbers.length > 10) {
        console.log(`   ... 他${numbers.length - 10}件`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 結論');
  console.log('='.repeat(60));
  console.log(`\n✅ お気に入り文言を取得可能: ${withSpreadsheetUrl.length}件`);
  console.log(`⚠️ お気に入り文言を取得不可: ${publicProperties.length - withSpreadsheetUrl.length}件`);
  console.log(`\n理由:`);
  console.log(`   - 業務リストに未登録: ${notInGyomuList.length}件`);
  console.log(`   - スプレッドシートURLなし: ${gyomuListData.length - withSpreadsheetUrl.length}件`);
}

checkCoverage().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
