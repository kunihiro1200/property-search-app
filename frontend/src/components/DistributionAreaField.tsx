import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Calculate as CalculateIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import api from '../services/api';

interface DistributionAreaFieldProps {
  propertyNumber: string;
  googleMapUrl?: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function DistributionAreaField({
  propertyNumber,
  googleMapUrl,
  value = '',
  onChange,
  disabled = false,
}: DistributionAreaFieldProps) {
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [recalcDialogOpen, setRecalcDialogOpen] = useState(false);
  const [pendingCalculation, setPendingCalculation] = useState(false);

  // Auto-calculate on mount if Google Map URL exists and no value
  useEffect(() => {
    if (googleMapUrl && !value && !manuallyEdited) {
      handleCalculate();
    }
  }, []);

  const handleCalculate = async () => {
    if (!googleMapUrl) {
      setError('GoogleマップURLが設定されていません');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const response = await api.post(
        `/properties/${propertyNumber}/calculate-distribution-areas`
      );

      if (response.data.success && response.data.areas) {
        onChange(response.data.areas);
        setManuallyEdited(false);
      } else {
        setError(response.data.message || '計算に失敗しました');
      }
    } catch (err: any) {
      console.error('Failed to calculate distribution areas:', err);
      setError(
        err.response?.data?.message || 'エリア番号の計算に失敗しました'
      );
    } finally {
      setCalculating(false);
      setPendingCalculation(false);
    }
  };

  const handleManualChange = (newValue: string) => {
    onChange(newValue);
    setManuallyEdited(true);
    setError(null);
  };

  const handleRecalculate = () => {
    if (manuallyEdited && value) {
      // Show confirmation dialog
      setPendingCalculation(true);
      setRecalcDialogOpen(true);
    } else {
      // No manual edits, just recalculate
      handleCalculate();
    }
  };

  const handleConfirmRecalculate = () => {
    setRecalcDialogOpen(false);
    handleCalculate();
  };

  const handleCancelRecalculate = () => {
    setRecalcDialogOpen(false);
    setPendingCalculation(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <TextField
          fullWidth
          label="配信エリア番号"
          value={value}
          onChange={(e) => handleManualChange(e.target.value)}
          disabled={disabled || calculating}
          placeholder="例: ①,②,③,㊵"
          helperText="カンマ、スペース、または連続で入力可能"
          size="small"
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleRecalculate}
          disabled={!googleMapUrl || calculating || disabled}
          startIcon={calculating ? <CircularProgress size={16} /> : <CalculateIcon />}
          sx={{ minWidth: '100px', height: '40px' }}
        >
          {calculating ? '計算中' : value ? '再計算' : '計算'}
        </Button>
      </Box>

      {manuallyEdited && (
        <Alert severity="info" sx={{ mt: 1 }}>
          手動編集されています。GoogleマップURLを変更した場合は「再計算」ボタンで更新できます。
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      {!googleMapUrl && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          GoogleマップURLを設定すると、自動的にエリア番号を計算できます。
        </Alert>
      )}

      {/* Recalculation confirmation dialog */}
      <Dialog open={recalcDialogOpen} onClose={handleCancelRecalculate}>
        <DialogTitle>エリア番号を再計算しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            現在の値は手動で編集されています。再計算すると、手動で編集した内容が上書きされます。
          </Typography>
          <Typography sx={{ mt: 2, fontWeight: 'bold' }}>
            現在の値: {value}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRecalculate}>キャンセル</Button>
          <Button onClick={handleConfirmRecalculate} variant="contained" color="primary">
            再計算する
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
