/**
 * Re-authenticate with Gmail API to get Send As permissions
 * 
 * This script helps you re-authenticate with the additional scope needed
 * to verify and manage Send As settings.
 */

import { GoogleAuthService } from './src/services/GoogleAuthService';

async function reAuthenticate() {
  console.log('🔐 Gmail Re-Authentication Helper\n');
  console.log('This script will generate a new authentication URL with the updated scopes.');
  console.log('You need to re-authenticate to grant permission to read Send As settings.\n');

  try {
    const authService = new GoogleAuthService();
    
    // Generate auth URL
    const authUrl = await authService.getAuthUrl();
    
    console.log('📋 Steps to re-authenticate:\n');
    console.log('1. Open this URL in your browser:');
    console.log(`\n   ${authUrl}\n`);
    console.log('2. Sign in with your Google account (tomoko.kunihiro@ifoo-oita.com)');
    console.log('3. Grant all requested permissions (including Gmail settings)');
    console.log('4. Copy the authorization code from the redirect URL');
    console.log('5. Run: npx ts-node exchange-auth-code.ts <CODE>\n');
    
    console.log('⚠️  Important Notes:');
    console.log('   - You must grant ALL permissions, including the new Gmail settings permission');
    console.log('   - If you previously denied any permissions, you may need to revoke access first');
    console.log('   - To revoke: https://myaccount.google.com/permissions\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

reAuthenticate();
