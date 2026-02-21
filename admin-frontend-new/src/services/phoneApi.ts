/**
 * AI電話統合機能のAPI Client
 */

import api from './api';
import type {
  OutboundCallRequest,
  OutboundCallResponse,
  GetCallLogsRequest,
  GetCallLogsResponse,
  CallLogWithDetails,
  GetTranscriptionResponse,
  GetRecordingResponse,
  GetCallStatisticsRequest,
  GetCallStatisticsResponse,
} from '../types/phone';

/**
 * 電話統合API Client
 */
export const phoneApi = {
  /**
   * 発信を開始
   */
  startOutboundCall: async (request: OutboundCallRequest): Promise<OutboundCallResponse> => {
    const response = await api.post('/api/calls/outbound', request);
    return response.data.data;
  },

  /**
   * 通話を終了
   */
  endCall: async (callId: string): Promise<void> => {
    await api.post(`/api/calls/${callId}/end`);
  },

  /**
   * 通話ログ一覧を取得
   */
  getCallLogs: async (request: GetCallLogsRequest = {}): Promise<GetCallLogsResponse> => {
    const response = await api.get('/api/calls', { params: request });
    return response.data.data;
  },

  /**
   * 通話ログ詳細を取得
   */
  getCallLog: async (callId: string): Promise<CallLogWithDetails> => {
    const response = await api.get(`/api/calls/${callId}`);
    return response.data.data;
  },

  /**
   * 文字起こしを取得
   */
  getTranscription: async (callId: string): Promise<GetTranscriptionResponse> => {
    const response = await api.get(`/api/calls/${callId}/transcription`);
    return response.data.data;
  },

  /**
   * 録音ファイルURLを取得
   */
  getRecording: async (callId: string): Promise<GetRecordingResponse> => {
    const response = await api.get(`/api/calls/${callId}/recording`);
    return response.data.data;
  },

  /**
   * 通話統計を取得
   */
  getStatistics: async (request: GetCallStatisticsRequest): Promise<GetCallStatisticsResponse> => {
    const response = await api.get('/api/calls/statistics', { params: request });
    return response.data.data;
  },

  /**
   * 売主の通話履歴を取得
   */
  getSellerCallLogs: async (
    sellerId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<GetCallLogsResponse> => {
    return phoneApi.getCallLogs({
      sellerId,
      page: options.page || 1,
      limit: options.limit || 10,
      sortBy: 'started_at',
      sortOrder: 'desc',
    });
  },

  // Get phone configuration
  getConfig: async (): Promise<ApiResponse<any>> => {
    return api.get('/calls/config');
  },

  // Update phone configuration
  updateConfig: async (config: any): Promise<ApiResponse<void>> => {
    return api.put('/calls/config', config);
  },

  // Test phone configuration
  testConfig: async (): Promise<ApiResponse<any>> => {
    return api.post('/calls/config/test');
  },
};

export default phoneApi;
