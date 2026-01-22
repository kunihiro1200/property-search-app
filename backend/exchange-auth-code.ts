/**
 * Exchange authorization code for tokens
 * 
 * Usage: npx ts-node exchange-auth-code.ts <AUTHORIZATION_CODE>
 */

import { GoogleAuthService } from './src/services/GoogleAuthService';

async function exchangeCode() {
  const code = process.argv[2];
  
  if (!code) {
    console.error('❌ Error: Authorization code is required');
    console.log('\nUsage: npx ts-node exchange-auth-code.ts <AUTHORIZATION_CODE>');
    console.log('\nGet the authorization code by running: npx ts-node re-authenticate-gmail.ts');
    process.exit(1);
  }
  
  console.log('🔄 Exchanging authorization code for tokens...\n');
  
  try {
    const authService = new GoogleAuthService();
    await authService.exchangeCodeForTokens(code);
    
    console.log('\n✅ Success! Gmail API is now authenticated with Send As permissions.');
    console.log('\nYou can now run: npx ts-node verify-send-as-config.ts');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you copied the entire authorization code');
    console.log('2. The code expires quickly - generate a new one if needed');
    console.log('3. Check that you granted all permissions in the consent screen');
    process.exit(1);
  }
}

exchangeCode();
