import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface WorkTaskData {
  id: string;
  property_number: string;
  [key: string]: any;
}

interface WorkTaskSectionProps {
  sellerNumber: string;
}

// カテゴリ定義
const CATEGORIES = {
  '基本情報': [
    { key: 'property_address', label: '物件所在' },
    { key: 'seller_name', label: '売主' },
    { key: 'sales_assignee', label: '営業担当' },
  ],
  '媒介契約': [
    { key: 'mediation_type', label: '媒介形態' },
    { key: 'mediation_deadline', label: '媒介作成締め日' },
    { key: 'mediation_completed', label: '媒介作成完了' },
    { key: 'mediation_creator', label: '媒介作成者' },
    { key: 'mediation_notes', label: '媒介備考' },
  ],
  'サイト登録': [
    { key: 'site_registration_deadline', label: 'サイト登録締め日' },
    { key: 'site_registration_request_date', label: 'サイト登録依頼日' },
    { key: 'site_registration_confirmed', label: 'サイト登録確認' },
    { key: 'site_registration_confirmer', label: 'サイト登録確認者' },
    { key: 'floor_plan', label: '間取図' },
    { key: 'floor_plan_completed_date', label: '間取図完了日' },
    { key: 'site_notes', label: 'サイト備考' },
  ],
  '売買契約': [
    { key: 'sales_contract_deadline', label: '売買契約締め日' },
    { key: 'sales_contract_assignee', label: '売買契約担当' },
    { key: 'sales_contract_confirmed', label: '売買契約確認' },
    { key: 'binding_scheduled_date', label: '製本予定日' },
    { key: 'binding_completed', label: '製本完了' },
    { key: 'sales_contract_notes', label: '売買契約備考' },
  ],
  '決済': [
    { key: 'settlement_date', label: '決済日' },
    { key: 'settlement_scheduled_month', label: '決済予定月' },
    { key: 'brokerage_fee_seller', label: '仲介手数料（売）' },
    { key: 'brokerage_fee_buyer', label: '仲介手数料（買）' },
    { key: 'sales_price', label: '売買価格' },
    { key: 'payment_confirmed_seller', label: '入金確認（売）' },
    { key: 'payment_confirmed_buyer', label: '入金確認（買）' },
    { key: 'accounting_confirmed', label: '経理確認済み' },
  ],
};

const WorkTaskSection: React.FC<WorkTaskSectionProps> = ({ sellerNumber }) => {
  const [workTask, setWorkTask] = useState<WorkTaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['基本情報']));

  useEffect(() => {
    const fetchWorkTask = async () => {
      if (!sellerNumber) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/work-tasks/${sellerNumber}`);
        setWorkTask(response.data);
        setError(null);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setWorkTask(null);
          setError(null);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWorkTask();
  }, [sellerNumber]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    // 日付フォーマット
    if (key.includes('date') || key.includes('deadline')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('ja-JP');
        }
      } catch {
        // パースエラーの場合はそのまま表示
      }
    }

    // 金額フォーマット
    if (key.includes('fee') || key.includes('price')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toLocaleString('ja-JP') + '円';
      }
    }

    return String(value);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">業務依頼</h3>
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">業務依頼</h3>
        <div className="text-red-500">エラー: {error}</div>
      </div>
    );
  }

  if (!workTask) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">業務依頼</h3>
        <div className="text-gray-500">業務依頼データなし</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">業務依頼</h3>
      
      <div className="space-y-2">
        {Object.entries(CATEGORIES).map(([category, fields]) => (
          <div key={category} className="border rounded">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-2 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
            >
              <span>{category}</span>
              <span>{expandedCategories.has(category) ? '▼' : '▶'}</span>
            </button>
            
            {expandedCategories.has(category) && (
              <div className="p-4 grid grid-cols-2 gap-2 text-sm">
                {fields.map(({ key, label }) => (
                  <div key={key} className="flex">
                    <span className="text-gray-600 w-32 flex-shrink-0">{label}:</span>
                    <span className="font-medium">{formatValue(key, workTask[key])}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-xs text-gray-400">
        最終同期: {workTask.synced_at ? new Date(workTask.synced_at).toLocaleString('ja-JP') : '-'}
      </div>
    </div>
  );
};

export default WorkTaskSection;
