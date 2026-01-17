/**
 * Gmail Send As 設定を確認するスクリプト
 * 
 * 使用方法:
 * cd backend
 * npx ts-node verify-send-as-config.ts
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

async function verifySendAsConfiguration() {
  console.log('🔍 Verifying Gmail Send As configuration...\n');
  
  try {
    // OAuth2クライアントを作成
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
    
    // リフレッシュトークンを設定
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // 認証されたユーザー情報を取得
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log(`✅ Authenticated as: ${profile.data.emailAddress}\n`);
    
    // Send As 設定を取得
    const sendAsResponse = await gmail.users.settings.sendAs.list({
      userId: 'me'
    });
    
    const sendAsAddresses = sendAsResponse.data.sendAs || [];
    
    if (sendAsAddresses.length === 0) {
      console.log('❌ No Send As addresses configured\n');
      return;
    }
    
    console.log(`📧 Found ${sendAsAddresses.length} Send As address(es):\n`);
    
    // 必要なアドレス
    const requiredAddresses = [
      'tenant@ifoo-oita.com',
      'gyosha@ifoo-oita.com',
      'hiromitsu-kakui@ifoo-oita.com',
      'tomoko.kunihiro@ifoo-oita.com'
    ];
    
    // 各Send Asアドレスの詳細を表示
    sendAsAddresses.forEach((sendAs, index) => {
      console.log(`${index + 1}. ${sendAs.sendAsEmail}`);
      console.log(`   Display Name: ${sendAs.displayName || 'N/A'}`);
      console.log(`   Is Default: ${sendAs.isDefault ? 'Yes' : 'No'}`);
      console.log(`   Verification Status: ${sendAs.verificationStatus || 'N/A'}`);
      console.log(`   Treat as Alias: ${sendAs.treatAsAlias ? 'Yes' : 'No'}`);
      console.log(`   Reply To: ${sendAs.replyToAddress || 'N/A'}`);
      console.log('');
    });
    
    // 必要なアドレスが設定されているか確認
    console.log('📋 Checking required addresses:\n');
    
    const configuredAddresses = sendAsAddresses.map(sa => sa.sendAsEmail);
    
    requiredAddresses.forEach(required => {
      const isConfigured = configuredAddresses.includes(required);
      const sendAs = sendAsAddresses.find(sa => sa.sendAsEmail === required);
      
      if (isConfigured && sendAs) {
        const isVerified = sendAs.verificationStatus === 'accepted' || sendAs.isDefault;
        if (isVerified) {
          console.log(`✅ ${required} - Configured and Verified`);
        } else {
          console.log(`⚠️  ${required} - Configured but NOT Verified (Status: ${sendAs.verificationStatus})`);
        }
      } else {
        console.log(`❌ ${required} - NOT Configured`);
      }
    });
    
    console.log('\n');
    
    // 設定が不完全な場合の指示
    const missingAddresses = requiredAddresses.filter(
      required => !configuredAddresses.includes(required)
    );
    
    const unverifiedAddresses = requiredAddresses.filter(required => {
      const sendAs = sendAsAddresses.find(sa => sa.sendAsEmail === required);
      return sendAs && sendAs.verificationStatus !== 'accepted' && !sendAs.isDefault;
    });
    
    if (missingAddresses.length > 0) {
      console.log('⚠️  Missing Send As addresses:');
      missingAddresses.forEach(addr => console.log(`   - ${addr}`));
      console.log('\n📖 Please add these addresses in Gmail Settings:');
      console.log('   1. Go to Gmail → Settings → Accounts and Import');
      console.log('   2. Click "Add another email address" in "Send mail as" section');
      console.log('   3. Add each missing address and verify it\n');
    }
    
    if (unverifiedAddresses.length > 0) {
      console.log('⚠️  Unverified Send As addresses:');
      unverifiedAddresses.forEach(addr => console.log(`   - ${addr}`));
      console.log('\n📖 Please verify these addresses:');
      console.log('   1. Check the inbox of each address for verification email');
      console.log('   2. Click the verification link in the email');
      console.log('   3. Or enter the verification code in Gmail Settings\n');
    }
    
    if (missingAddresses.length === 0 && unverifiedAddresses.length === 0) {
      console.log('✅ All required Send As addresses are configured and verified!\n');
      console.log('🎉 You can now send emails from any of these addresses.\n');
    }
    
  } catch (error: any) {
    console.error('❌ Error verifying Send As configuration:', error.message);
    
    if (error.message?.includes('invalid_grant')) {
      console.log('\n💡 Tip: Your OAuth token may have expired. Try re-authenticating.');
    } else if (error.message?.includes('insufficient permissions')) {
      console.log('\n💡 Tip: Make sure your OAuth scope includes gmail.settings.basic or gmail.settings.sharing');
    }
  }
}

// スクリプトを実行
verifySendAsConfiguration()
  .then(() => {
    console.log('✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
