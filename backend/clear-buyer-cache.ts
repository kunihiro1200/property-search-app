import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

async function clearCache() {
  console.log('=== AA6381のキャッシュをクリア ===\n');

  try {
    // Redisキャッシュをクリア
    const keys = await redis.keys('buyer:*AA6381*');
    console.log(`見つかったキャッシュキー: ${keys.length}件`);
    
    if (keys.length > 0) {
      for (const key of keys) {
        console.log(`削除: ${key}`);
        await redis.del(key);
      }
      console.log('✅ Redisキャッシュをクリアしました');
    } else {
      console.log('ℹ️ クリアするキャッシュがありません');
    }

    redis.disconnect();
    console.log('\n完了');
  } catch (error) {
    console.error('エラー:', error);
    redis.disconnect();
  }
}

clearCache();
