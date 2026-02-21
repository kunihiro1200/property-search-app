import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWebhookStatus() {
  console.log('🔍 Checking webhook status...\n');

  // Webhookチャンネルを確認
  const { data: channels, error: channelError } = await supabase
    .from('calendar_webhook_channels')
    .select('*');

  if (channelError) {
    console.error('❌ Error fetching webhook channels:', channelError);
  } else {
    console.log(`📡 Webhook Channels: ${channels?.length || 0}`);
    if (channels && channels.length > 0) {
      channels.forEach((channel: any) => {
        console.log(`   - Channel ID: ${channel.channel_id}`);
        console.log(`     Employee ID: ${channel.employee_id}`);
        console.log(`     Expiration: ${channel.expiration}`);
        console.log(`     Expired: ${new Date(channel.expiration) < new Date() ? 'YES' : 'NO'}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️ No webhooks registered');
    }
  }

  // Sync tokenを確認
  const { data: tokens, error: tokenError } = await supabase
    .from('calendar_sync_tokens')
    .select('*');

  if (tokenError) {
    console.error('❌ Error fetching sync tokens:', tokenError);
  } else {
    console.log(`🔄 Sync Tokens: ${tokens?.length || 0}`);
    if (tokens && tokens.length > 0) {
      tokens.forEach((token: any) => {
        console.log(`   - Employee ID: ${token.employee_id}`);
        console.log(`     Last Sync: ${token.last_sync_at}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️ No sync tokens found');
    }
  }

  // カレンダー接続を確認
  const { data: calendarTokens, error: calendarError } = await supabase
    .from('google_calendar_tokens')
    .select('employee_id');

  if (calendarError) {
    console.error('❌ Error fetching calendar tokens:', calendarError);
  } else {
    console.log(`📅 Connected Calendars: ${calendarTokens?.length || 0}`);
    if (calendarTokens && calendarTokens.length > 0) {
      calendarTokens.forEach((token: any) => {
        console.log(`   - Employee ID: ${token.employee_id}`);
      });
    } else {
      console.log('   ⚠️ No calendars connected');
    }
  }

  console.log('\n✅ Check complete');
}

checkWebhookStatus().catch(console.error);
