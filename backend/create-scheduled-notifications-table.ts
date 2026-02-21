import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createScheduledNotificationsTable() {
  console.log('Creating scheduled_notifications table...');

  // テーブルを作成（既に存在する場合はスキップ）
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS scheduled_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_number TEXT NOT NULL,
        assignee TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        message TEXT NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- インデックスを作成
      CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status 
        ON scheduled_notifications(status);
      
      CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_at 
        ON scheduled_notifications(scheduled_at);
      
      CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_property_number 
        ON scheduled_notifications(property_number);

      -- updated_atを自動更新するトリガー
      CREATE OR REPLACE FUNCTION update_scheduled_notifications_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_update_scheduled_notifications_updated_at 
        ON scheduled_notifications;
      
      CREATE TRIGGER trigger_update_scheduled_notifications_updated_at
        BEFORE UPDATE ON scheduled_notifications
        FOR EACH ROW
        EXECUTE FUNCTION update_scheduled_notifications_updated_at();
    `
  });

  if (error) {
    console.error('Error creating table:', error);
    
    // exec_sql関数が存在しない場合は、直接SQLを実行
    console.log('Trying direct SQL execution...');
    
    // テーブル作成
    const { error: createError } = await supabase
      .from('scheduled_notifications')
      .select('id')
      .limit(1);
    
    if (createError && createError.message.includes('does not exist')) {
      console.log('Table does not exist. Please create it manually using the following SQL:');
      console.log(`
        CREATE TABLE scheduled_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          property_number TEXT NOT NULL,
          assignee TEXT NOT NULL,
          webhook_url TEXT NOT NULL,
          message TEXT NOT NULL,
          scheduled_at TIMESTAMPTZ NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          sent_at TIMESTAMPTZ,
          error_message TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX idx_scheduled_notifications_status 
          ON scheduled_notifications(status);
        
        CREATE INDEX idx_scheduled_notifications_scheduled_at 
          ON scheduled_notifications(scheduled_at);
        
        CREATE INDEX idx_scheduled_notifications_property_number 
          ON scheduled_notifications(property_number);

        CREATE OR REPLACE FUNCTION update_scheduled_notifications_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_update_scheduled_notifications_updated_at
          BEFORE UPDATE ON scheduled_notifications
          FOR EACH ROW
          EXECUTE FUNCTION update_scheduled_notifications_updated_at();
      `);
    } else {
      console.log('Table already exists or other error occurred');
    }
  } else {
    console.log('✅ scheduled_notifications table created successfully');
  }
}

createScheduledNotificationsTable()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
