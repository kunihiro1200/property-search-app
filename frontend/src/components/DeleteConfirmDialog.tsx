import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface DeleteConfirmDialogProps {
  open: boolean;
  imageUrl: string;
  imageName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  imageUrl,
  imageName,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  return (
    <Dialog
      open={open}
      onClose={isDeleting ? undefined : onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="warning" />
        画像の削除確認
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          この画像を削除してもよろしいですか？この操作は取り消せません。
        </Typography>
        
        {/* 画像プレビュー */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1,
            p: 2,
          }}
        >
          <Box
            component="img"
            src={imageUrl}
            alt={imageName}
            sx={{
              maxWidth: '100%',
              maxHeight: 200,
              objectFit: 'contain',
              borderRadius: 1,
              mb: 1,
            }}
          />
          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '100%' }}>
            {imageName}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onCancel}
          disabled={isDeleting}
          variant="outlined"
        >
          キャンセル
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isDeleting}
          variant="contained"
          color="error"
          startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
        >
          {isDeleting ? '削除中...' : '削除する'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmDialog;
