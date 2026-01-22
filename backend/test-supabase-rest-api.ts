import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSupabaseRestAPI() {
  console.log('🔍 Testing Supabase REST API Connection...');
  console.log('============================================================');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY is not set');
    process.exit(1);
  }
  
  console.log(`📝 Supabase URL: ${supabaseUrl}`);
  console.log('');
  
  try {
    // Test 1: Check if email_history table exists
    console.log('📊 Test 1: Checking email_history table...');
    const response = await fetch(`${supabaseUrl}/rest/v1/email_history?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ email_history table accessible via REST API`);
      console.log(`📝 Current records: ${Array.isArray(data) ? data.length : 0}`);
    } else {
      const errorText = await response.text();
      console.log(`⚠️  Response status: ${response.status}`);
      console.log(`⚠️  Response: ${errorText}`);
      
      if (response.status === 404) {
        console.log('❌ email_history table not found or not exposed via PostgREST');
      }
    }
    
    console.log('');
    console.log('============================================================');
    console.log('✅ REST API test completed');
    
  } catch (error: any) {
    console.error('❌ REST API test failed:', error.message);
    console.error('');
    console.error('Error details:', error);
    process.exit(1);
  }
}

testSupabaseRestAPI();
