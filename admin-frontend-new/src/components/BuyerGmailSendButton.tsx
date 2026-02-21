import { useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert, Typography, Box } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { InquiryHistoryItem } from './InquiryHistoryTable';
import TemplateSelectionModal from './TemplateSelectionModal';
import BuyerEmailCompositionModal from './BuyerEmailCompositionModal';
import { EmailTemplate, EmailData, MergedEmailContent } from '../types/emailTemplate';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface BuyerGmailSendButtonProps {
  buyerId: string;
  buyerEmail: string;
  buyerName: string;
  inquiryHistory: InquiryHistoryItem[];
  selectedPropertyIds: Set<string>; // チェックボックスで選択された物件ID
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
}

/**
 * Gmail send button for buyer detail page
 * Shows when there is at least one inquiry history record
 * Opens template selection modal when clicked
 * Uses selectedPropertyIds from checkbox selection in InquiryHistoryTable
 */
export default function BuyerGmailSendButton({
  buyerId,
  buyerEmail,
  buyerName,
  inquiryHistory,
  selectedPropertyIds,
  size = 'medium',
  variant = 'contained'
}: BuyerGmailSendButtonProps) {
  const [loading, setLoading] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [compositionModalOpen, setCompositionModalOpen] = useState(false);
  
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [mergedContent, setMergedContent] = useState<MergedEmailContent | null>(null);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get current user email from auth store
  const { employee } = useAuthStore();

  // Don't show button if no inquiry history
  if (!inquiryHistory || inquiryHistory.length === 0) {
    return null;
  }

  // 選択数を取得
  const selectedCount = selectedPropertyIds.size;
  const isDisabled = selectedCount === 0 || loading;

  const handleClick = () => {
    // 選択物件がない場合はエラーメッセージを表示
    if (selectedCount === 0) {
      setErrorMessage('物件を選択してください');
      return;
    }

    // PropertySelectionModalをスキップして直接テンプレート選択へ
    setTemplateModalOpen(true);
  };

  const handleTemplateSelect = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateModalOpen(false);
    setLoading(true);

    try {
      // 選択された物件IDsを配列に変換
      const propertyIds = Array.from(selectedPropertyIds);
      
      // 複数物件のデータを取得してマージ
      const response = await api.post(`/api/email-templates/${template.id}/merge-multiple`, {
        buyer: {
          buyerName,
          email: buyerEmail
        },
        propertyIds
      });

      setMergedContent(response.data);
      setCompositionModalOpen(true);
    } catch (err: any) {
      console.error('Failed to merge template:', err);
      setErrorMessage(err.response?.data?.error || 'テンプレートの準備に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (emailData: EmailData) => {
    try {
      // Get sender email from authenticated employee
      const senderEmail = employee?.email;
      if (!senderEmail) {
        throw new Error('送信者のメールアドレスが取得できません');
      }

      // 選択された物件IDsを配列に変換
      const propertyIds = Array.from(selectedPropertyIds);

      // Send email via Gmail API
      await api.post('/api/gmail/send', {
        buyerId: emailData.buyerId,
        propertyIds,
        senderEmail,
        subject: emailData.subject,
        body: emailData.body
      });

      setSuccessMessage('メールを送信しました');
      setCompositionModalOpen(false);
      resetState();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'メールの送信に失敗しました');
    }
  };

  const resetState = () => {
    setSelectedTemplate(null);
    setMergedContent(null);
  };

  const handleCancel = () => {
    setTemplateModalOpen(false);
    setCompositionModalOpen(false);
    resetState();
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant={variant}
          size={size}
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
          onClick={handleClick}
          disabled={isDisabled}
        >
          Gmail送信
        </Button>
        {selectedCount > 0 && (
          <Typography variant="body2" color="text.secondary">
            {selectedCount}件選択中
          </Typography>
        )}
      </Box>

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        open={templateModalOpen}
        onSelect={handleTemplateSelect}
        onCancel={handleCancel}
      />

      {/* Email Composition Modal */}
      {mergedContent && selectedTemplate && (
        <BuyerEmailCompositionModal
          open={compositionModalOpen}
          buyerId={buyerId}
          buyerEmail={buyerEmail}
          propertyIds={Array.from(selectedPropertyIds)}
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.name}
          mergedContent={mergedContent}
          onSend={handleSendEmail}
          onCancel={handleCancel}
        />
      )}

      {/* Success/Error Notifications */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
      >
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
