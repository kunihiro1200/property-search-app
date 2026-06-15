import axios from 'axios';

// Vercelでは同じドメインにデプロイされているため、相対パスを使用
// ローカル開発時のみ localhost:3000 を使用
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.MODE === 'development' ? 'http://localhost:3000' : ''
);

// デバッグ用ログ（本番環境でも表示）
console.log('🔍 [publicApi] Environment:', {
  MODE: import.meta.env.MODE,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL: API_BASE_URL,
  timestamp: new Date().toISOString()
});

// 公開API用のaxiosインスタンス（認証不要）
const publicApi = axios.create({
  baseURL: API_BASE_URL, // /api/publicは各エンドポイントで指定
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000, // 90秒タイムアウト（概算書PDF生成に対応）
});

// レスポンスインターセプター（エラーハンドリング）
publicApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // ネットワークエラー
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject({
        message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
        type: 'network',
      });
    }

    // サーバーエラー（元のレスポンスデータを保持して上位に渡す）
    if (error.response.status >= 500) {
      console.error('Server error:', error.response.data);
      return Promise.reject({
        message: error.response.data?.message || 'サーバーエラーが発生しました。しばらくしてから再度お試しください。',
        type: 'server',
        status: error.response.status,
        response: { data: error.response.data },
        details: error.response.data?.details,
      });
    }

    // クライアントエラー
    return Promise.reject({
      message: error.response.data?.error || 'エラーが発生しました',
      type: 'client',
      status: error.response.status,
      details: error.response.data,
    });
  }
);

export default publicApi;

/**
 * お気に入り文言を取得
 * 
 * @param propertyId 物件ID
 * @returns お気に入り文言と物件タイプ
 */
export const getFavoriteComment = async (propertyId: string) => {
  try {
    const response = await publicApi.get(`/api/public/properties/${propertyId}/favorite-comment`);
    return response.data;
  } catch (error) {
    console.error('Error fetching favorite comment:', error);
    // エラー時もnullを返す（グレースフルデグラデーション）
    return { comment: null, propertyType: 'unknown' };
  }
};

