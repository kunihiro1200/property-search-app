import { useState, useEffect } from 'react';
import { Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import EmailTemplateSelector from './EmailTemplateSelector';
import BuyerFilterSummaryModal from './BuyerFilterSummaryModal';
import DistributionConfirmationModal from './DistributionConfirmationModal';
import gmailDistributionService, { EnhancedBuyerEmailsResponse } from '../services/gmailDistributionService';
import { EmailTemplate, getAllTemplates } from '../utils/gmailDistributionTemplates';
import { getActiveEmployees } from '../services/employeeService';
import { 
  generateGmailComposeUrl, 
  isBccLimitExceeded, 
  limitBccRecipients,
  MAX_BCC_RECIPIENTS 
} from '../utils/gmailComposeUrl';
import api from '../services/api';

interface GmailDistributionButtonProps {
  propertyNumber: string;
  propertyAddress?: string;
  distributionAreas?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
}

const DEFAULT_SENDER = 'tenant@ifoo-oita.com';

export default function GmailDistributionButton({
  propertyNumber,
  propertyAddress,
  distributionAreas,
  size = 'small',
  variant = 'outlined'
}: GmailDistributionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [filterSummaryOpen, setFilterSummaryOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [buyerData, setBuyerData] = useState<EnhancedBuyerEmailsResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [senderAddress, setSenderAddress] = useState<string>(DEFAULT_SENDER);
  const [employees, setEmployees] = useState<any[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const templates = getAllTemplates();

  // 社員データを取得
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getActiveEmployees();
        setEmployees(data);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        // エラー時はデフォルトアドレスのみ使用
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

  // 送信元アドレスを変更
  const handleSenderAddressChange = (address: string) => {
    setSenderAddress(address);
  };

  const handleButtonClick = () => {
    // Check if distribution_areas is set
    if (!distributionAreas || distributionAreas.trim() === '') {
      setSnackbar({
        open: true,
        message: '配信エリア番号が設定されていません。物件詳細ページで配信エリア番号を計算・設定してください。',
        severity: 'warning'
      });
      return;
    }
    
    // 送信元アドレスが空の場合のみデフォルトに設定
    if (!senderAddress || senderAddress.trim() === '') {
      setSenderAddress(DEFAULT_SENDER);
    }
    setTemplateSelectorOpen(true);
  };

  const handleTemplateSelect = async (template: EmailTemplate) => {
    setLoading(true);
    setSelectedTemplate(template);
    
    try {
      // 買主のメールアドレスを取得（拡張版 - 複数条件フィルタリング）
      // 詳細情報を含めて取得
      const result = await gmailDistributionService.fetchQualifiedBuyerEmailsEnhanced(
        propertyNumber,
        true // 詳細情報を含める
      );
      
      if (result.count === 0) {
        setSnackbar({
          open: true,
          message: '配信対象の買主が見つかりませんでした',
          severity: 'warning'
        });
        setLoading(false);
        return;
      }

      // 買主データを保存してモーダルを開く
      setBuyerData(result);
      setFilterSummaryOpen(true);
      setTemplateSelectorOpen(false);
    } catch (error: any) {
      console.error('Failed to fetch buyer data:', error);
      setSnackbar({
        open: true,
        message: error.message || '買主データの取得に失敗しました',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSummaryConfirm = (emails: string[]) => {
    if (!selectedTemplate || emails.length === 0) {
      return;
    }
    
    // 選択されたメールアドレスを保存
    setSelectedEmails(emails);
    
    // フィルタサマリーモーダルを閉じて確認モーダルを開く
    setFilterSummaryOpen(false);
    setConfirmationOpen(true);
  };

  const handleConfirmationConfirm = async () => {
    if (!selectedTemplate || selectedEmails.length === 0) {
      return;
    }

    try {
      // 物件データを準備してテンプレートを置換
      const propertyData = {
        address: propertyAddress || '',
        propertyNumber: propertyNumber
      };

      // テンプレートのプレースホルダーを置換
      const subject = selectedTemplate.subject
        .replace(/\{address\}/g, propertyData.address)
        .replace(/\{propertyNumber\}/g, propertyData.propertyNumber);
      
      const body = selectedTemplate.body
        .replace(/\{address\}/g, propertyData.address)
        .replace(/\{propertyNumber\}/g, propertyData.propertyNumber);

      // バックエンドAPIを使用してメール送信
      const response = await api.post('/api/emails/send-distribution', {
        recipients: selectedEmails,
        subject: subject,
        body: body,
        from: senderAddress
      });

      const result = response.data;

      // 確認モーダルを閉じる
      setConfirmationOpen(false);

      // 送信元アドレスをデフォルトにリセット
      setSenderAddress(DEFAULT_SENDER);

      // 成功メッセージ
      if (result.failedBatches === 0) {
        setSnackbar({
          open: true,
          message: `メールを送信しました (${result.successCount}件)\n送信元: ${senderAddress}`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: `メール送信が完了しました\n成功: ${result.successCount}件\n失敗: ${result.failedCount}件`,
          severity: 'warning'
        });
      }
    } catch (error: any) {
      console.error('Failed to send emails via API:', error);
      
      // API失敗時はGmail Web UIへフォールバック
      setSnackbar({
        open: true,
        message: 'API経由での送信に失敗しました。Gmail Web UIで送信します。',
        severity: 'warning'
      });

      // 確認モーダルを閉じる
      setConfirmationOpen(false);

      // 送信元アドレスをデフォルトにリセット
      setSenderAddress(DEFAULT_SENDER);

      // Gmail Web UIへフォールバック
      fallbackToGmailWebUI();
    }
  };

  const fallbackToGmailWebUI = () => {
    if (!selectedTemplate || selectedEmails.length === 0) {
      return;
    }

    try {
      // BCC上限チェック
      let emailsToSend = selectedEmails;
      if (isBccLimitExceeded(selectedEmails)) {
        setSnackbar({
          open: true,
          message: `宛先が${MAX_BCC_RECIPIENTS}件を超えています。最初の${MAX_BCC_RECIPIENTS}件のみ追加されます。`,
          severity: 'warning'
        });
        emailsToSend = limitBccRecipients(selectedEmails);
      }

      // 物件データを準備してテンプレートを置換
      const propertyData = {
        address: propertyAddress || '',
        propertyNumber: propertyNumber
      };

      // テンプレートのプレースホルダーを置換
      const subject = selectedTemplate.subject
        .replace(/\{address\}/g, propertyData.address)
        .replace(/\{propertyNumber\}/g, propertyData.propertyNumber);
      
      const body = selectedTemplate.body
        .replace(/\{address\}/g, propertyData.address)
        .replace(/\{propertyNumber\}/g, propertyData.propertyNumber);

      // Gmail Compose URLを生成
      const gmailUrl = generateGmailComposeUrl({
        bcc: emailsToSend.join(','),
        subject: subject,
        body: body
      });

      // Gmailを新しいタブで開く
      const newWindow = window.open(gmailUrl, '_blank');
      
      // ポップアップブロックチェック
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        setSnackbar({
          open: true,
          message: 'ポップアップがブロックされました。ブラウザの設定を確認してください。',
          severity: 'error'
        });
        return;
      }

      // 送信元アドレスをデフォルトにリセット
      setSenderAddress(DEFAULT_SENDER);

      // 成功メッセージ
      setSnackbar({
        open: true,
        message: `Gmailを開きました (${emailsToSend.length}件の宛先)\n送信元: ${senderAddress}\n\n内容を確認して、Gmailで送信ボタンを押してください。`,
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Failed to open Gmail:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Gmailを開けませんでした。もう一度お試しください。',
        severity: 'error'
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        startIcon={loading ? <CircularProgress size={16} /> : <EmailIcon />}
        onClick={handleButtonClick}
        disabled={loading}
      >
        Gmailで配信
      </Button>

      <EmailTemplateSelector
        open={templateSelectorOpen}
        onClose={() => {
          setTemplateSelectorOpen(false);
          setSenderAddress(DEFAULT_SENDER);
        }}
        onSelect={handleTemplateSelect}
        templates={templates}
        senderAddress={senderAddress}
        onSenderAddressChange={handleSenderAddressChange}
        employees={employees}
      />

      <BuyerFilterSummaryModal
        open={filterSummaryOpen}
        onClose={() => {
          setFilterSummaryOpen(false);
          setSenderAddress(DEFAULT_SENDER);
        }}
        onConfirm={handleFilterSummaryConfirm}
        buyers={buyerData?.filteredBuyers || []}
        totalBuyers={buyerData?.totalBuyers || 0}
        senderAddress={senderAddress}
        onSenderAddressChange={handleSenderAddressChange}
        employees={employees}
      />

      <DistributionConfirmationModal
        open={confirmationOpen}
        onClose={() => {
          setConfirmationOpen(false);
          setSenderAddress(DEFAULT_SENDER);
        }}
        onConfirm={handleConfirmationConfirm}
        recipientCount={selectedEmails.length}
        senderAddress={senderAddress}
        onSenderAddressChange={handleSenderAddressChange}
        employees={employees}
        subject={selectedTemplate ? selectedTemplate.subject
          .replace(/\{address\}/g, propertyAddress || '')
          .replace(/\{propertyNumber\}/g, propertyNumber) : ''}
        bodyPreview={selectedTemplate ? selectedTemplate.body
          .replace(/\{address\}/g, propertyAddress || '')
          .replace(/\{propertyNumber\}/g, propertyNumber) : ''}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
