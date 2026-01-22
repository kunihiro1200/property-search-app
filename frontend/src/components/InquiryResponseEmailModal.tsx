import React, { useState, useEffect } from 'react';
import { PropertyListing } from '../types';
import { EmailTemplatePreview } from './EmailTemplatePreview';
import SenderAddressSelector from './SenderAddressSelector';
import api from '../services/api';

interface InquiryResponseEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProperties: PropertyListing[];
  onSuccess?: () => void;
  buyerInfo?: {
    name: string;
    email: string;
    buyerId: string;
  };
}

interface GeneratedEmailContent {
  subject: string;
  body: string;
  properties: Array<{
    propertyNumber: string;
    address: string;
    athomeUrl: string | null;
    preViewingInfo: string | null;
  }>;
}

export const InquiryResponseEmailModal: React.FC<InquiryResponseEmailModalProps> = ({
  isOpen,
  onClose,
  selectedProperties,
  onSuccess,
  buyerInfo,
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [senderAddress, setSenderAddress] = useState('tenant@ifoo-oita.com');
  const [emailContent, setEmailContent] = useState<GeneratedEmailContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  useEffect(() => {
    if (isOpen && buyerInfo) {
      // Auto-fill buyer information when modal opens
      setBuyerName(buyerInfo.name);
      setBuyerEmail(buyerInfo.email);
    }
  }, [isOpen, buyerInfo]);

  useEffect(() => {
    if (!isOpen) {
      // モーダルが閉じられたらリセット
      setBuyerName('');
      setBuyerEmail('');
      setSenderAddress('tenant@ifoo-oita.com');
      setEmailContent(null);
      setError(null);
      setStep('input');
    }
  }, [isOpen]);

  const handleGeneratePreview = async () => {
    if (!buyerName.trim()) {
      setError('買主名を入力してください');
      return;
    }

    if (!buyerEmail.trim()) {
      setError('買主メールアドレスを入力してください');
      return;
    }

    if (!isValidEmail(buyerEmail)) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const propertyNumbers = selectedProperties.map(p => p.property_number);
      
      const response = await api.post('/inquiry-response/generate', {
        propertyNumbers,
        buyerName,
        buyerEmail,
      });

      if (response.data.success) {
        setEmailContent(response.data.emailContent);
        setStep('preview');
      } else {
        setError(response.data.error || 'メールプレビューの生成に失敗しました');
      }
    } catch (err: any) {
      console.error('Error generating preview:', err);
      setError(err.response?.data?.error || 'メールプレビューの生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailContent) {
      setError('メール内容が生成されていません');
      return;
    }

    if (!senderAddress.trim()) {
      setError('送信元アドレスを選択してください');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const propertyNumbers = selectedProperties.map(p => p.property_number);
      
      const response = await api.post('/inquiry-response/send', {
        propertyNumbers,
        buyerName,
        buyerEmail,
        senderAddress,
        emailContent,
      });

      if (response.data.success) {
        alert('問い合わせ返信メールを送信しました');
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        setError(response.data.error || 'メール送信に失敗しました');
      }
    } catch (err: any) {
      console.error('Error sending email:', err);
      setError(err.response?.data?.error || 'メール送信に失敗しました');
    } finally {
      setIsSending(false);
    }
  };

  const handleEditContent = (newBody: string) => {
    if (emailContent) {
      setEmailContent({
        ...emailContent,
        body: newBody,
      });
    }
  };

  const handleBack = () => {
    setStep('input');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            問い合わせ返信メール
            {step === 'input' && ' - 情報入力'}
            {step === 'preview' && ' - プレビュー'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            選択物件: {selectedProperties.length}件
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  買主名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="例: 山田太郎"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  買主メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="例: buyer@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  送信元アドレス <span className="text-red-500">*</span>
                </label>
                <SenderAddressSelector
                  value={senderAddress}
                  onChange={setSenderAddress}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">選択物件</h3>
                <ul className="space-y-1">
                  {selectedProperties.map((property) => (
                    <li key={property.property_number} className="text-sm text-gray-600">
                      {property.property_number} - {property.address || '住所未設定'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && emailContent && (
            <EmailTemplatePreview
              emailContent={emailContent}
              onEdit={handleEditContent}
              editable={true}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          {step === 'input' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleGeneratePreview}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'プレビュー生成中...' : 'プレビュー'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                戻る
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSending ? '送信中...' : 'メール送信'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
