import React, { useState, useEffect } from 'react';
import { Phone, Settings, CheckCircle, XCircle, Loader, Save, TestTube } from 'lucide-react';
import { phoneApi } from '../services/phoneApi';
import { useAuthStore } from '../store/authStore';

interface PhoneConfig {
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  amazonConnectInstanceId: string;
  amazonConnectInstanceArn: string;
  amazonConnectContactFlowId: string;
  amazonConnectPhoneNumber: string;
  s3RecordingsBucket: string;
  transcribeCustomVocabulary: string;
  enableSentimentAnalysis: boolean;
  enableInboundCalls: boolean;
  enableOutboundCalls: boolean;
}

interface TestResult {
  service: string;
  status: 'success' | 'error';
  message: string;
}

export const PhoneSettingsPage: React.FC = () => {
  const { employee } = useAuthStore();
  const [config, setConfig] = useState<PhoneConfig>({
    awsRegion: 'ap-northeast-1',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    amazonConnectInstanceId: '',
    amazonConnectInstanceArn: '',
    amazonConnectContactFlowId: '',
    amazonConnectPhoneNumber: '',
    s3RecordingsBucket: '',
    transcribeCustomVocabulary: '',
    enableSentimentAnalysis: true,
    enableInboundCalls: true,
    enableOutboundCalls: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 管理者権限チェック
  const isAdmin = employee?.role === 'admin' || employee?.role === 'manager';

  useEffect(() => {
    if (!isAdmin) {
      setError('この機能は管理者のみアクセス可能です');
      return;
    }
    loadConfig();
  }, [isAdmin]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await phoneApi.getConfig();
      if (response.data) {
        setConfig(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PhoneConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await phoneApi.updateConfig(config);
      setSuccessMessage('設定を保存しました');
    } catch (err: any) {
      setError(err.response?.data?.error || '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestResults([]);
    try {
      const response = await phoneApi.testConfig();
      setTestResults(response.data.results || []);
      
      const allSuccess = response.data.results.every((r: TestResult) => r.status === 'success');
      if (allSuccess) {
        setSuccessMessage('すべての接続テストが成功しました');
      } else {
        setError('一部の接続テストが失敗しました');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '接続テストに失敗しました');
    } finally {
      setTesting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            アクセス権限がありません
          </h2>
          <p className="text-gray-600 text-center">
            この機能は管理者のみアクセス可能です
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI電話統合 設定</h1>
          </div>
          <p className="text-gray-600">
            Amazon Connect、Transcribe、S3などのAWS設定を管理します
          </p>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* AWS基本設定 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            AWS基本設定
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AWSリージョン
              </label>
              <input
                type="text"
                value={config.awsRegion}
                onChange={(e) => handleInputChange('awsRegion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ap-northeast-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AWSアクセスキーID
              </label>
              <input
                type="text"
                value={config.awsAccessKeyId}
                onChange={(e) => handleInputChange('awsAccessKeyId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AWSシークレットアクセスキー
              </label>
              <input
                type="password"
                value={config.awsSecretAccessKey}
                onChange={(e) => handleInputChange('awsSecretAccessKey', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ 入力された認証情報は暗号化して保存されます
              </p>
            </div>
          </div>
        </div>

        {/* Amazon Connect設定 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Amazon Connect設定</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                インスタンスID
              </label>
              <input
                type="text"
                value={config.amazonConnectInstanceId}
                onChange={(e) => handleInputChange('amazonConnectInstanceId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                インスタンスARN
              </label>
              <input
                type="text"
                value={config.amazonConnectInstanceArn}
                onChange={(e) => handleInputChange('amazonConnectInstanceArn', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="arn:aws:connect:ap-northeast-1:123456789012:instance/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                コンタクトフローID
              </label>
              <input
                type="text"
                value={config.amazonConnectContactFlowId}
                onChange={(e) => handleInputChange('amazonConnectContactFlowId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                発信元電話番号
              </label>
              <input
                type="text"
                value={config.amazonConnectPhoneNumber}
                onChange={(e) => handleInputChange('amazonConnectPhoneNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+81-3-xxxx-xxxx"
              />
            </div>
          </div>
        </div>

        {/* S3・Transcribe設定 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">S3・Transcribe設定</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                録音ファイル保存バケット
              </label>
              <input
                type="text"
                value={config.s3RecordingsBucket}
                onChange={(e) => handleInputChange('s3RecordingsBucket', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seller-system-call-recordings"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カスタム語彙名（オプション）
              </label>
              <input
                type="text"
                value={config.transcribeCustomVocabulary}
                onChange={(e) => handleInputChange('transcribeCustomVocabulary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="real-estate-terms"
              />
              <p className="text-xs text-gray-500 mt-1">
                不動産用語などのカスタム語彙を指定できます
              </p>
            </div>
          </div>
        </div>

        {/* 機能フラグ */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">機能設定</h2>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableOutboundCalls}
                onChange={(e) => handleInputChange('enableOutboundCalls', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700">発信機能を有効化</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableInboundCalls}
                onChange={(e) => handleInputChange('enableInboundCalls', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700">着信機能を有効化</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableSentimentAnalysis}
                onChange={(e) => handleInputChange('enableSentimentAnalysis', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700">感情分析を有効化（Amazon Comprehend）</span>
            </label>
          </div>
        </div>

        {/* 接続テスト結果 */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">接続テスト結果</h2>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-md ${
                    result.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  {result.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      result.status === 'success' ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {result.service}
                    </p>
                    <p className={`text-sm ${
                      result.status === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-4">
          <button
            onClick={handleTest}
            disabled={testing || saving}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
          >
            {testing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                接続テスト中...
              </>
            ) : (
              <>
                <TestTube className="w-5 h-5" />
                接続テスト
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || testing}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
          >
            {saving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                設定を保存
              </>
            )}
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>注意:</strong> AWS認証情報を変更した場合は、必ず接続テストを実行してから保存してください。
            誤った設定を保存すると、電話機能が正常に動作しなくなる可能性があります。
          </p>
        </div>
      </div>
    </div>
  );
};
