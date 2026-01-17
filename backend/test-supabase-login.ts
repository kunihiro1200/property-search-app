import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

console.log('🔍 Testing Supabase Login Configuration\n');

console.log('1. Environment Variables:');
console.log('   SUPABASE_URL:', supabaseUrl);
console.log('   SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');
console.log('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'MISSING');
console.log('');

// Decode JWT to check project
const decodeJWT = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return {
        iss: payload.iss,
        ref: payload.ref,
        role: payload.role,
        exp: new Date(payload.exp * 1000).toISOString(),
      };
    }
  } catch (e) {
    return { error: 'Failed to decode' };
  }
  return { error: 'Invalid format' };
};

console.log('2. JWT Token Analysis:');
console.log('   ANON_KEY:', JSON.stringify(decodeJWT(supabaseAnonKey), null, 2));
console.log('   SERVICE_KEY:', JSON.stringify(decodeJWT(supabaseServiceKey), null, 2));
console.log('');

// Test Supabase connection
async function testConnection() {
  console.log('3. Testing Supabase Connection:');
  
  const client = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test basic connection
    const { error } = await client.from('employees').select('count').limit(1);
    
    if (error) {
      console.log('   ❌ Connection failed:', error.message);
    } else {
      console.log('   ✅ Connection successful');
    }
  } catch (error: any) {
    console.log('   ❌ Connection error:', error.message);
  }
  
  console.log('');
}

// Test Auth configuration
async function testAuthConfig() {
  console.log('4. Testing Auth Configuration:');
  
  const client = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Check if Google OAuth is configured
    const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
    
    if (error) {
      console.log('   ❌ Auth check failed:', error.message);
    } else {
      console.log('   ✅ Auth is accessible');
      console.log('   Total users:', data.users.length);
    }
  } catch (error: any) {
    console.log('   ❌ Auth error:', error.message);
  }
  
  console.log('');
}

async function main() {
  await testConnection();
  await testAuthConfig();
  
  console.log('5. Next Steps:');
  console.log('   - Check Supabase Dashboard > Authentication > Providers');
  console.log('   - Ensure Google OAuth is enabled');
  console.log('   - Verify redirect URLs are configured:');
  console.log('     * http://localhost:5173/auth/callback');
  console.log('     * http://localhost:5174/auth/callback');
  console.log('   - Check browser console for detailed error messages');
}

main().catch(console.error);
