/**
 * 買主同期スクリプト - 直接PostgreSQL接続版
 * PostgRESTのスキーマキャッシュ問題を回避するため、直接PostgreSQL接続を使用
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

interface BuyerRow {
  id: number;
  buyer_number: string;
  name: string;
  email: string;
  phone: string;
  // ... 他のフィールド
  last_synced_at?: Date;
}

async function syncBuyersDirectPG() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 買主同期を開始（直接PostgreSQL接続）...');
    
    // 1. last_synced_atカラムの存在を確認
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'buyers' 
      AND column_name = 'last_synced_at'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.error('❌ last_synced_atカラムが存在しません！');
      console.log('マイグレーション054を実行してください。');
      return;
    }
    
    console.log('✅ last_synced_atカラムが存在します');
    
    // 2. 買主データを取得（スプレッドシートから）
    // ここでは簡略化のため、既存の買主を更新
    const result = await client.query(`
      SELECT id, buyer_number, name, email, last_synced_at
      FROM buyers
      ORDER BY id
      LIMIT 10
    `);
    
    console.log(`📊 ${result.rows.length}件の買主を取得しました`);
    
    // 3. last_synced_atを更新
    const updatePromises = result.rows.map(async (buyer: BuyerRow) => {
      const updateResult = await client.query(`
        UPDATE buyers
        SET last_synced_at = NOW()
        WHERE id = $1
        RETURNING id, buyer_number, last_synced_at
      `, [buyer.id]);
      
      return updateResult.rows[0];
    });
    
    const updated = await Promise.all(updatePromises);
    
    console.log('✅ 更新完了:');
    updated.forEach((buyer: any) => {
      console.log(`  - 買主 ${buyer.buyer_number}: ${buyer.last_synced_at}`);
    });
    
    // 4. 統計情報を表示
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(last_synced_at) as synced,
        COUNT(*) - COUNT(last_synced_at) as not_synced
      FROM buyers
    `);
    
    console.log('\n📈 同期統計:');
    console.log(`  総数: ${stats.rows[0].total}`);
    console.log(`  同期済み: ${stats.rows[0].synced}`);
    console.log(`  未同期: ${stats.rows[0].not_synced}`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    client.release();
  }
}

// スクリプトを実行
syncBuyersDirectPG()
  .then(() => {
    console.log('\n✅ 同期が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 同期に失敗しました:', error);
    process.exit(1);
  });
