import { BeppuAreaMappingService } from './src/services/BeppuAreaMappingService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testBeppuAreaMapping() {
  console.log('=== 別府市エリアマッピングテスト（AA13249） ===\n');

  const beppuService = new BeppuAreaMappingService();
  
  // 物件AA13249の住所
  const address = '別府市中島町15番31号アルファステイツ別府中島町 1003号室';
  
  console.log('テスト対象住所:', address);
  console.log('');

  try {
    const areas = await beppuService.getDistributionAreasForAddress(address);
    
    if (areas) {
      console.log('✅ マッピング成功');
      console.log('配信エリア番号:', areas);
      
      // エリア番号を分解して表示
      const areaChars = areas.split('');
      console.log('エリア番号（分解）:', areaChars.join(', '));
    } else {
      console.log('❌ マッピング失敗: エリア番号が見つかりませんでした');
      console.log('');
      console.log('フォールバック確認:');
      console.log('  - 別府市の物件なので、本来は㊶（別府市全体）が設定されるべき');
      console.log('  - BuyerCandidateService.getAreaNumbersForProperty()でフォールバック処理が動作するはず');
    }
  } catch (error) {
    console.error('❌ エラー発生:', error);
  }

  console.log('\n=== データベースマッピング確認 ===\n');
  
  try {
    const allMappings = await beppuService.getAllMappings();
    console.log('登録されているマッピング数:', allMappings.length);
    
    // 中島町のマッピングを検索
    const nakashimaMappings = allMappings.filter(m => 
      m.region_name && m.region_name.includes('中島')
    );
    
    if (nakashimaMappings.length > 0) {
      console.log('\n中島町関連のマッピング:');
      nakashimaMappings.forEach(m => {
        console.log(`  - ${m.region_name}: ${m.distribution_areas} (${m.school_district})`);
      });
    } else {
      console.log('\n中島町のマッピングは登録されていません');
    }
    
    // 統計情報
    console.log('\n学校区ごとのマッピング数:');
    const stats = await beppuService.getMappingStatistics();
    Object.entries(stats).forEach(([district, count]) => {
      console.log(`  - ${district}: ${count}件`);
    });
  } catch (error) {
    console.error('データベース確認エラー:', error);
  }
}

testBeppuAreaMapping().catch(console.error);
