import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testCC5Performance() {
  try {
    console.log('=== CC5 Database Performance Test ===\n');
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Test 1: Direct query
    console.log('Test 1: Direct property_details query');
    const start1 = Date.now();
    const { data: data1, error: error1 } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', 'CC5')
      .single();
    const elapsed1 = Date.now() - start1;
    console.log(`✅ Completed in ${elapsed1}ms`);
    console.log('Has data:', !!data1);
    console.log('');
    
    // Test 2: PropertyDetailsService
    console.log('Test 2: Using PropertyDetailsService');
    const start2 = Date.now();
    const { PropertyDetailsService } = await import('./src/services/PropertyDetailsService');
    const service = new PropertyDetailsService();
    const data2 = await service.getPropertyDetails('CC5');
    const elapsed2 = Date.now() - start2;
    console.log(`✅ Completed in ${elapsed2}ms`);
    console.log('Has data:', !!data2);
    console.log('');
    
    // Test 3: Complete API simulation
    console.log('Test 3: Simulating complete API call');
    const start3 = Date.now();
    
    // Get property listing
    const { data: property, error: propError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'CC5')
      .single();
    
    if (property) {
      // Get property details
      const details = await service.getPropertyDetails(property.property_number);
      
      const elapsed3 = Date.now() - start3;
      console.log(`✅ Completed in ${elapsed3}ms`);
      console.log('Has property:', !!property);
      console.log('Has details:', !!details);
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testCC5Performance();
