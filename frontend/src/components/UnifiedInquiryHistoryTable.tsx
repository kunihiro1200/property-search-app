import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface InquiryHistory {
  buyer_id: string;
  buyer_number: string;
  property_id: string | null;
  property_number: string;
  reception_date: string;
  property_address: string | null;
  status: string | null;
}

interface UnifiedInquiryHistoryTableProps {
  buyerId: string;
}

const UnifiedInquiryHistoryTable: React.FC<UnifiedInquiryHistoryTableProps> = ({ buyerId }) => {
  const [inquiries, setInquiries] = useState<InquiryHistory[]>([]);
  const [buyerNumbers, setBuyerNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchUnifiedHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      
      const response = await api.get(`/buyers/${buyerId}/unified-inquiry-history`);
      setInquiries(response.data.inquiries || []);
      setBuyerNumbers(response.data.buyer_numbers || []);
    } catch (err: any) {
      console.error('Failed to fetch unified inquiry history', err);
      
      // Set empty arrays to prevent UI breaking
      setInquiries([]);
      setBuyerNumbers([]);
      
      // Handle specific error codes
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;
        
        setErrorCode(errorData?.code || `HTTP_${status}`);
        
        if (status === 400) {
          setError('無効な買主IDです。正しいIDを指定してください。');
        } else if (status === 404) {
          setError('買主が見つかりませんでした。');
        } else if (status === 500) {
          setError('サーバーエラーが発生しました。しばらく待ってから再試行してください。');
        } else {
          setError('統合問合せ履歴の取得に失敗しました。');
        }
      } else if (err.request) {
        setError('ネットワークエラーが発生しました。接続を確認してください。');
        setErrorCode('NETWORK_ERROR');
      } else {
        setError('予期しないエラーが発生しました。');
        setErrorCode('UNKNOWN_ERROR');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnifiedHistory();
  }, [buyerId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getBuyerNumberColor = (buyerNumber: string) => {
    // 買主番号ごとに異なる色を割り当て
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
    ];
    const buyerIndex = buyerNumbers.indexOf(buyerNumber);
    return colors[buyerIndex % colors.length];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">統合問合せ履歴</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">統合問合せ履歴</h2>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="flex items-start">
            <span className="text-red-600 mr-2">⚠️</span>
            <div className="flex-1">
              <p className="text-red-700 font-medium">{error}</p>
              {errorCode && (
                <p className="text-red-600 text-sm mt-1">エラーコード: {errorCode}</p>
              )}
              <button
                onClick={fetchUnifiedHistory}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                再試行
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">統合問合せ履歴</h2>
        <div className="text-gray-500 text-center py-8">
          問合せ履歴がありません
        </div>
      </div>
    );
  }

  // 買主番号が複数ある場合のみ統合履歴として表示
  const showUnified = buyerNumbers.length > 1;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        {showUnified ? '統合問合せ履歴' : '問合せ履歴'}
      </h2>

      {showUnified && (
        <div className="mb-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-3">
          <p className="font-medium mb-1">📊 統合表示中</p>
          <p className="text-xs">
            以下の買主番号の問合せ履歴を統合して表示しています：
            {buyerNumbers.map((bn) => (
              <span
                key={bn}
                className={`inline-block ml-2 px-2 py-0.5 rounded text-xs font-medium ${getBuyerNumberColor(bn)}`}
              >
                買主{bn}
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                問合せ日
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                買主番号
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                物件番号
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                物件住所
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inquiries.map((inquiry, index) => (
              <tr key={`${inquiry.buyer_id}-${inquiry.property_number}-${index}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(inquiry.reception_date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {inquiry.buyer_number ? (
                    <Link
                      to={`/buyers/${inquiry.buyer_number}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getBuyerNumberColor(inquiry.buyer_number)}`}
                      >
                        買主{inquiry.buyer_number}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-gray-600">
                      買主{inquiry.buyer_number || '（番号なし）'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {inquiry.property_number ? (
                    inquiry.property_id ? (
                      <Link
                        to={`/property-listings/${inquiry.property_id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {inquiry.property_number}
                      </Link>
                    ) : (
                      <span className="text-gray-500">{inquiry.property_number}</span>
                    )
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {inquiry.property_address || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {inquiry.status || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        全{inquiries.length}件の問合せ履歴
      </div>
    </div>
  );
};

export default UnifiedInquiryHistoryTable;
