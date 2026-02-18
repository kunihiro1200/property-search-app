/**
 * Vercel環境変数を確認
 */

console.log('🔍 Checking Vercel environment variables...\n');

const requiredEnvVars = [
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_DRIVE_PARENT_FOLDER_ID',
  'PROPERTY_LISTING_SPREADSHEET_ID',
  'PROPERTY_LISTING_SHEET_NAME',
  'GYOMU_LIST_SPREADSHEET_ID',
  'GYOMU_LIST_SHEET_NAME',
];

console.log('📊 Required environment variables:\n');

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  
  if (value) {
    if (varName === 'GOOGLE_SERVICE_ACCOUNT_JSON') {
      console.log(`✅ ${varName}: Set (${value.length} characters)`);
      
      // Base64デコードを試行
      try {
        const decoded = Buffer.from(value, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        console.log(`   - project_id: ${parsed.project_id}`);
        console.log(`   - client_email: ${parsed.client_email}`);
      } catch (e) {
        console.log(`   ⚠️ Failed to decode/parse: ${e}`);
      }
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n📝 Summary:');
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length === 0) {
  console.log('✅ All required environment variables are set');
} else {
  console.log(`❌ Missing ${missingVars.length} environment variables:`);
  missingVars.forEach(v => console.log(`   - ${v}`));
}
