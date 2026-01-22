// 公開物件詳細エンドポイントのテスト
import 'dotenv/config';
import { PropertyListingService } from './src/services/PropertyListingService';

async function testPublicPropertyDetail() {
  const service = new PropertyListingService();

  console.log('=== 公開物件詳細エンドポイントのテスト ===\n');

  try {
    // テスト1: サイト表示の物件を取得
    console.log('テスト1: サイト表示の物件を取得');
    const publicProperties = await service.getPublicProperties({
      limit: 1,
      offset: 0,
    });

    if (publicProperties.properties.length > 0) {
      const propertyId = publicProperties.properties[0].id;
      console.log(`物件ID: ${propertyId}`);

      const detail = await service.getPublicPropertyById(propertyId);
      
      if (detail) {
        console.log('✅ 詳細取得成功');
        console.log(`  - 物件番号: ${detail.property_number}`);
        console.log(`  - 住所: ${detail.address}`);
        console.log(`  - 価格: ${detail.price ? detail.price.toLocaleString() : 'N/A'}円`);
        console.log(`  - 物件種別: ${detail.property_type}`);
        
        // データサニタイゼーションの確認
        const hasSellerInfo = 'seller_name' in detail;
        const hasInternalInfo = 'sales_assignee' in detail;
        
        if (!hasSellerInfo && !hasInternalInfo) {
          console.log('✅ データサニタイゼーション: 機密情報が除外されています');
        } else {
          console.log('❌ データサニタイゼーション: 機密情報が含まれています');
        }
      } else {
        console.log('❌ 詳細取得失敗: nullが返されました');
      }
    } else {
      console.log('⚠️  サイト表示の物件が見つかりません');
    }

    console.log('\nテスト2: 存在しない物件IDで取得');
    const nonExistent = await service.getPublicPropertyById('00000000-0000-0000-0000-000000000000');
    
    if (nonExistent === null) {
      console.log('✅ 存在しない物件: 正しくnullが返されました');
    } else {
      console.log('❌ 存在しない物件: nullが返されませんでした');
    }

    console.log('\nテスト3: サイト表示でない物件を取得');
    // まず全物件から非公開のものを探す
    const allProperties = await service.getAll({ limit: 100 });
    const nonPublicProperty = allProperties.data.find(p => p.site_display !== 'サイト表示');
    
    if (nonPublicProperty) {
      console.log(`非公開物件ID: ${nonPublicProperty.id}`);
      const result = await service.getPublicPropertyById(nonPublicProperty.id);
      
      if (result === null) {
        console.log('✅ 非公開物件: 正しくnullが返されました（404相当）');
      } else {
        console.log('❌ 非公開物件: データが返されました（セキュリティ問題）');
      }
    } else {
      console.log('⚠️  非公開物件が見つかりません（全て公開状態）');
    }

    console.log('\n=== テスト完了 ===');
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

testPublicPropertyDetail();
