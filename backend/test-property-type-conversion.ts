import { PropertyListingService } from './src/services/PropertyListingService';

async function testPropertyTypeConversion() {
  console.log('Testing property type conversion...\n');
  
  const service = new PropertyListingService();
  
  try {
    // Test 1: Get public properties list
    console.log('Test 1: Public properties list');
    const result = await service.getPublicProperties({ limit: 5 });
    
    console.log(`Found ${result.properties.length} properties\n`);
    
    result.properties.forEach(property => {
      console.log(`Property: ${property.property_number}`);
      console.log(`  Type (converted): ${property.property_type}`);
      console.log(`  Expected: detached_house, apartment, land, or other`);
      console.log();
    });
    
    // Test 2: Get property detail
    if (result.properties.length > 0) {
      const firstProperty = result.properties[0];
      console.log('\nTest 2: Property detail');
      console.log(`Fetching detail for ${firstProperty.property_number}...`);
      
      const detail = await service.getPublicPropertyById(firstProperty.id);
      
      if (detail) {
        console.log(`Property: ${detail.property_number}`);
        console.log(`  Type (converted): ${detail.property_type}`);
        console.log(`  Expected: detached_house, apartment, land, or other`);
      }
    }
    
    // Test 3: Verify all types are converted
    console.log('\n\nTest 3: Type distribution check');
    const allProperties = await service.getPublicProperties({ limit: 100 });
    
    const typeCounts: Record<string, number> = {};
    allProperties.properties.forEach(p => {
      typeCounts[p.property_type] = (typeCounts[p.property_type] || 0) + 1;
    });
    
    console.log('Converted property types:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Verify no Japanese types remain
    const hasJapaneseTypes = Object.keys(typeCounts).some(type => 
      /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(type)
    );
    
    if (hasJapaneseTypes) {
      console.log('\n❌ FAIL: Japanese property types found in response!');
    } else {
      console.log('\n✅ PASS: All property types converted to English');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testPropertyTypeConversion();
