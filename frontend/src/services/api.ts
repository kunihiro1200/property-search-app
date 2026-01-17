import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター（JWT認証トークンを追加）
api.interceptors.request.use(
  async (config) => {
    const sessionToken = localStorage.getItem('session_token');
    
    if (sessionToken) {
      config.headers.Authorization = `Bearer ${sessionToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（エラーハンドリングとリトライ）
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 認証エラーの場合
    if (error.response?.status === 401) {
      // リトライ済みの場合はログイン画面へ
      if (originalRequest._retry) {
        localStorage.removeItem('session_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // リフレッシュトークンで再試行
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        originalRequest._retry = true;

        try {
          // インターセプターをスキップして直接リクエスト
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken },
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
          const { access_token, refresh_token: newRefreshToken } = response.data;

          localStorage.setItem('session_token', access_token);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          // 元のリクエストを再実行
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem('session_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem('session_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    // リトライ可能なエラーの場合（ネットワークエラー、サーバーエラー）
    if (
      !originalRequest._retryCount &&
      (error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.response?.status === 429 || // Rate limit
        error.response?.status === 500 ||
        error.response?.status === 502 ||
        error.response?.status === 503 ||
        error.response?.status === 504)
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      if (originalRequest._retryCount <= 3) {
        // 指数バックオフで待機
        const delay = Math.min(1000 * Math.pow(2, originalRequest._retryCount - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));

        console.log(`⚠️ Retrying request (${originalRequest._retryCount}/3)...`);
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Google Calendar API
export const googleCalendarApi = {
  // 接続状態を確認
  getStatus: async () => {
    const response = await api.get('/api/auth/google/calendar/status');
    return response.data;
  },

  // OAuth認証URLを取得
  getAuthUrl: async () => {
    const response = await api.get('/api/auth/google/calendar');
    return response.data;
  },

  // Google Calendar連携を解除
  revoke: async () => {
    const response = await api.post('/api/auth/google/calendar/revoke');
    return response.data;
  },
};

// Employee API
export const employeeApi = {
  // 全従業員の一覧とカレンダー接続状態を取得
  getAll: async (calendarStatus?: string) => {
    const params = calendarStatus ? { calendarStatus } : {};
    const response = await api.get('/employees', { params });
    return response.data;
  },

  // 特定の従業員のカレンダー接続状態を取得
  getCalendarStatus: async (employeeId: string) => {
    const response = await api.get(`/employees/${employeeId}/calendar-status`);
    return response.data;
  },
};

// Email Image Attachment API
export const emailImageApi = {
  // Google Driveフォルダの内容を取得
  listFolderContents: async (folderId: string | null) => {
    const response = await api.get('/api/drive/folders/contents', {
      params: folderId ? { folderId } : {},
    });
    return response.data;
  },

  // フォルダパスを取得
  getFolderPath: async (folderId: string) => {
    const response = await api.get(`/api/drive/folders/${folderId}/path`);
    return response.data;
  },

  // 画像付きメールを送信（新しい形式）
  sendEmailWithImages: async (emailData: {
    sellerId: string;
    sellerNumber: string;
    to: string;
    subject: string;
    body: string;
    selectedImages: any[]; // ImageFile[]
  }) => {
    const response = await api.post('/api/emails/with-images', emailData);
    return response.data;
  },

  // 売主の画像一覧を取得（旧形式 - 後方互換性のため残す）
  getSellerImages: async (sellerNumber: string) => {
    const response = await api.get(`/api/emails/images/${sellerNumber}`);
    return response.data;
  },

  // 画像プレビューを取得
  getImagePreview: async (fileId: string) => {
    const response = await api.get(`/api/emails/images/preview/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Buyer API with bidirectional sync support
export interface BuyerUpdateOptions {
  sync?: boolean;  // スプレッドシート同期を有効にする
  force?: boolean; // 競合を無視して強制上書き
}

export interface BuyerUpdateResult {
  buyer: any;
  syncStatus?: 'synced' | 'pending' | 'failed';
  syncError?: string;
  conflicts?: Array<{
    fieldName: string;
    dbValue: any;
    spreadsheetValue: any;
    expectedValue: any;
  }>;
}

export const buyerApi = {
  // 買主情報を更新（双方向同期対応）
  update: async (
    id: string,
    data: Record<string, any>,
    options?: BuyerUpdateOptions
  ): Promise<BuyerUpdateResult> => {
    const params = new URLSearchParams();
    if (options?.sync) params.append('sync', 'true');
    if (options?.force) params.append('force', 'true');
    
    const url = `/api/buyers/${id}${params.toString() ? `?${params.toString()}` : ''}`;
    
    try {
      const response = await api.put(url, data);
      return {
        buyer: response.data,
        syncStatus: response.data.syncStatus,
        syncError: response.data.syncError
      };
    } catch (error: any) {
      // 競合エラーの場合
      if (error.response?.status === 409) {
        return {
          buyer: error.response.data.buyer,
          syncStatus: error.response.data.syncStatus,
          conflicts: error.response.data.conflicts
        };
      }
      throw error;
    }
  },

  // 買主情報を取得
  getById: async (id: string) => {
    const response = await api.get(`/api/buyers/${id}`);
    return response.data;
  },

  // 買主一覧を取得
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    assignee?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const response = await api.get('/api/buyers', { params });
    return response.data;
  },

  // 関連買主を取得
  getRelated: async (id: string) => {
    const response = await api.get(`/api/buyers/${id}/related`);
    return response.data;
  },

  // 問い合わせ履歴を取得
  getInquiryHistory: async (id: string) => {
    const response = await api.get(`/api/buyers/${id}/inquiry-history`);
    return response.data;
  },

  // 統合問い合わせ履歴を取得
  getUnifiedInquiryHistory: async (id: string) => {
    const response = await api.get(`/api/buyers/${id}/unified-inquiry-history`);
    return response.data;
  },

  // メール履歴を取得
  getEmailHistory: async (id: string) => {
    const response = await api.get(`/api/buyers/${id}/email-history`);
    return response.data;
  },

  // メール履歴を保存
  saveEmailHistory: async (buyerId: string, data: {
    propertyNumbers: string[];
    recipientEmail: string;
    subject: string;
    body: string;
    sentBy: string;
    emailType?: string;
  }) => {
    const response = await api.post(`/api/buyers/${buyerId}/email-history`, data);
    return response.data;
  }
};

// Property Image Hide/Restore API
export const propertyImageApi = {
  // 画像を非表示にする
  hideImage: async (propertyId: string, fileId: string) => {
    const response = await api.post(`/api/property-listings/${propertyId}/hide-image`, { fileId });
    return response.data;
  },

  // 画像を復元する（非表示を解除）
  restoreImage: async (propertyId: string, fileId: string) => {
    const response = await api.post(`/api/property-listings/${propertyId}/unhide-image`, { fileId });
    return response.data;
  },

  // 非表示画像リストを取得
  getHiddenImages: async (propertyId: string) => {
    const response = await api.get(`/api/property-listings/${propertyId}/hidden-images`);
    return response.data;
  }
};

