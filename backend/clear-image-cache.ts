/**
 * 画像キャッシュをクリアするスクリプト
 */

import dotenv from 'dotenv';
dotenv.config();

async function clearCache() {
  console.log('🧹 Clearing image cache by restarting the server...');
  console.log('Please restart the backend server to clear the cache.');
  console.log('');
  console.log('Or wait 5 minutes for the cache to expire automatically.');
}

clearCache();
