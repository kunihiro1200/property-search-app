import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 公開API用のaxiosインスタンス（認証不要）
const publicApi = axios.create({
  baseURL: `${API_BASE_URL}/api/public`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30秒タイムアウト（スプレッドシート取得に時間がかかる場合があるため）
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

    // サーバーエラー
    if (error.response.status >= 500) {
      console.error('Server error:', error.response.data);
      return Promise.reject({
        message: 'サーバーエラーが発生しました。しばらくしてから再度お試しください。',
        type: 'server',
        status: error.response.status,
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
    const response = await publicApi.get(`/properties/${propertyId}/favorite-comment`);
    return response.data;
  } catch (error) {
    console.error('Error fetching favorite comment:', error);
    // エラー時もnullを返す（グレースフルデグラデーション）
    return { comment: null, propertyType: 'unknown' };
  }
};

