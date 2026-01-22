import { SellerService } from './src/services/SellerService.supabase';

async function testGetSeller() {
  const sellerService = new SellerService();
  
  // ログから見た売主ID
  const sellerId = '0bf2f416-a503-45e9-bca8-162a2142080a';
  
  console.log('=== 売主情報取得テスト ===');
  console.log('売主ID:', sellerId);
  
  try {
    const seller = await sellerService.getSeller(sellerId);
    
    console.log('\n=== 取得結果 ===');
    console.log('売主名:', seller?.name);
    console.log('売主番号:', seller?.sellerNumber);
    console.log('物件情報の有無:', !!seller?.property);
    
    if (seller?.property) {
      console.log('\n=== 物件情報詳細 ===');
      console.log('物件ID:', seller.property.id);
      console.log('物件住所:', seller.property.address);
      console.log('物件種別:', seller.property.propertyType);
      console.log('土地面積:', seller.property.landArea);
      console.log('建物面積:', seller.property.buildingArea);
      console.log('築年:', seller.property.buildYear);
      console.log('構造:', seller.property.structure);
      console.log('間取り:', seller.property.floorPlan);
      console.log('状況(売主):', seller.property.sellerSituation);
    } else {
      console.log('\n⚠️ 物件情報がありません');
    }
    
    console.log('\n=== その他の情報 ===');
    console.log('サイト:', seller?.site);
    console.log('ステータス:', seller?.status);
    console.log('訪問予約日:', seller?.appointmentDate);
    console.log('担当者:', seller?.assignedTo);
    console.log('査定額1:', seller?.valuationAmount1);
    console.log('査定額2:', seller?.valuationAmount2);
    console.log('査定額3:', seller?.valuationAmount3);
    console.log('固定資産税路線価:', seller?.fixedAssetTaxRoadPrice);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  process.exit(0);
}

testGetSeller();
