import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { InlineEditableField } from './InlineEditableField';
import api from '../services/api';

interface ConfirmationToAssigneeProps {
  buyer: {
    buyer_number: string;
    name: string;
    property_number: string;
    confirmation_to_assignee?: string;
  };
  propertyAssignee: string | null;
  onSendSuccess: () => void;
}

export const ConfirmationToAssignee: React.FC<ConfirmationToAssigneeProps> = ({
  buyer,
  propertyAssignee,
  onSendSuccess,
}) => {
  const [confirmationText, setConfirmationText] = useState(buyer.confirmation_to_assignee || '');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 繝・く繧ｹ繝医′蜈･蜉帙＆繧後※縺・ｋ縺九メ繧ｧ繝・け・育ｩｺ逋ｽ縺ｮ縺ｿ縺ｯ髯､螟厄ｼ・  const hasText = confirmationText.trim().length > 0;

  // 騾∽ｿ｡蜃ｦ逅・  const handleSend = async () => {
    if (!hasText) {
      setError('遒ｺ隱堺ｺ矩・ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 迴ｾ蝨ｨ縺ｮ繝悶Λ繧ｦ繧ｶURL繧貞叙蠕暦ｼ郁ｲｷ荳ｻ隧ｳ邏ｰ逕ｻ髱｢縺ｮURL・・      const currentUrl = window.location.href;
      
      const response = await api.post(
        `/api/buyers/${buyer.buyer_number}/send-confirmation`,
        { 
          confirmationText,
          buyerDetailUrl: currentUrl // 迴ｾ蝨ｨ縺ｮURL繧帝∽ｿ｡
        }
      );

      if (response.data.success) {
        setSuccessMessage('騾∽ｿ｡縺励∪縺励◆');
        setError(null);
        onSendSuccess();
        
        // 3遘貞ｾ後↓謌仙粥繝｡繝・そ繝ｼ繧ｸ繧呈ｶ医☆
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setError(response.data.error || '繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
        setSuccessMessage(null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || '繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆';
      setError(errorMessage);
      setSuccessMessage(null);
      
      // 繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ繧定ｨ倬鹸
      console.error('[ConfirmationToAssignee] Send failed:', {
        buyerNumber: buyer.buyer_number,
        error: err.message,
        response: err.response?.data,
      });
    } finally {
      setIsSending(false);
    }
  };

  // 繝輔ぅ繝ｼ繝ｫ繝我ｿ晏ｭ伜・逅・  const handleFieldSave = async (newValue: string) => {
    setConfirmationText(newValue);
    
    // 繝・・繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ・    try {
      await api.put(`/api/buyers/${buyer.buyer_number}`, {
        confirmation_to_assignee: newValue,
      });
    } catch (err: any) {
      console.error('[ConfirmationToAssignee] Save failed:', err);
      throw new Error('菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆');
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* 諡・ｽ薙∈縺ｮ遒ｺ隱堺ｺ矩・ヵ繧｣繝ｼ繝ｫ繝・*/}
      <InlineEditableField
        label="諡・ｽ薙∈縺ｮ遒ｺ隱堺ｺ矩・
        value={confirmationText}
        fieldName="confirmation_to_assignee"
        fieldType="textarea"
        onSave={handleFieldSave}
        readOnly={false}
        buyerId={buyer.buyer_number}
        enableConflictDetection={true}
        alwaysShowBorder={true}
        borderPlaceholder="諡・ｽ楢・∈縺ｮ遒ｺ隱堺ｺ矩・ｄ雉ｪ蝠上ｒ蜈･蜉・.."
        showEditIndicator={true}
      />

      {/* 騾∽ｿ｡繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ・医ユ繧ｭ繧ｹ繝医′蜈･蜉帙＆繧後※縺・ｋ蝣ｴ蜷医・縺ｿ陦ｨ遉ｺ・・*/}
      {hasText && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              諡・ｽ楢・<strong>{propertyAssignee}</strong> 縺ｫ騾∽ｿ｡
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={isSending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? '騾∽ｿ｡荳ｭ...' : '騾∽ｿ｡'}
            </Button>
          </Box>

          {/* 謌仙粥繝｡繝・そ繝ｼ繧ｸ */}
          {successMessage && (
            <Alert
              severity="success"
              icon={<CheckIcon fontSize="inherit" />}
              sx={{ mt: 1 }}
            >
              {successMessage}
            </Alert>
          )}

          {/* 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ */}
          {error && (
            <Alert
              severity="error"
              icon={<ErrorIcon fontSize="inherit" />}
              sx={{ mt: 1 }}
            >
              {error}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
};
