/**
 * APIレスポンスデバッグスクリプト
 */

async function debugAPIResponse() {
  console.log('🔍 APIレスポンスをデバッグします...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/public/properties?limit=2`);
    const data = await response.json();
    
    console.log('📡 レスポンス全体:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    
    console.log('📊 レスポンス構造:');
    console.log(`- properties: ${Array.isArray(data.properties) ? 'Array' : typeof data.properties}`);
    console.log(`- properties.length: ${data.properties?.length || 0}`);
    console.log(`- pagination: ${typeof data.pagination}`);
    console.log(`- pagination.total: ${data.pagination?.total}`);
    console.log(`- pagination.limit: ${data.pagination?.limit}`);
    console.log(`- pagination.offset: ${data.pagination?.offset}`);
    console.log('');
    
    if (data.properties && data.properties.length > 0) {
      console.log('📋 最初の物件:');
      const first = data.properties[0];
      console.log(`- id: ${first.id}`);
      console.log(`- property_number: ${first.property_number}`);
      console.log(`- property_type: ${first.property_type}`);
      console.log(`- propertyType: ${first.propertyType}`);
      console.log(`- address: ${first.address}`);
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

debugAPIResponse().catch(console.error);
