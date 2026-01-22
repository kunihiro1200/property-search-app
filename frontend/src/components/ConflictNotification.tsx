import React, { memo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { ConflictInfo } from '../services/conflictDetectionService';

interface ConflictNotificationProps {
  conflict: ConflictInfo;
  fieldName: string;
  onResolve: (resolution: 'keep-mine' | 'keep-theirs') => void;
  onCancel: () => void;
}

/**
 * Conflict Notification Component
 * 
 * Displays a notification when a concurrent edit conflict is detected,
 * showing both values and allowing the user to choose which to keep.
 * 
 * Uses Material-UI components for consistent styling with the rest of the app.
 */
export const ConflictNotification: React.FC<ConflictNotificationProps> = memo(({
  conflict,
  fieldName,
  onResolve,
  onCancel,
}) => {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '(空)';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <Dialog
      open={true}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      aria-labelledby="conflict-dialog-title"
      aria-describedby="conflict-dialog-description"
    >
      <DialogTitle id="conflict-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: 'warning.main' }} />
          <Typography variant="h6" component="span">
            編集の競合が検出されました
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography
          id="conflict-dialog-description"
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          {conflict.conflictingUser}さんが{' '}
          {formatTimestamp(conflict.conflictingTimestamp)}に
          「{fieldName}」フィールドを編集しました。
          どちらの変更を保持しますか？
        </Typography>

        {/* Your changes */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            borderColor: 'primary.main',
            borderWidth: 2,
            bgcolor: 'primary.50',
          }}
        >
          <Typography variant="subtitle2" color="primary.main" sx={{ mb: 1 }}>
            あなたの変更
          </Typography>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {formatValue(conflict.currentValue)}
          </Typography>
        </Paper>

        {/* Their changes */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderColor: 'grey.400',
            borderWidth: 2,
            bgcolor: 'grey.50',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" color="text.primary">
              {conflict.conflictingUser}さんの変更
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(conflict.conflictingTimestamp)}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {formatValue(conflict.conflictingValue)}
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          color="inherit"
        >
          キャンセル
        </Button>
        <Button
          onClick={() => onResolve('keep-theirs')}
          variant="outlined"
          color="inherit"
        >
          相手の変更を保持
        </Button>
        <Button
          onClick={() => onResolve('keep-mine')}
          variant="contained"
          color="primary"
        >
          自分の変更を保持
        </Button>
      </DialogActions>
    </Dialog>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.fieldName === nextProps.fieldName &&
    prevProps.conflict.currentValue === nextProps.conflict.currentValue &&
    prevProps.conflict.conflictingValue === nextProps.conflict.conflictingValue &&
    prevProps.conflict.conflictingUser === nextProps.conflict.conflictingUser &&
    prevProps.conflict.conflictingTimestamp.getTime() === nextProps.conflict.conflictingTimestamp.getTime()
  );
});
