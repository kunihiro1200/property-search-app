import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  CircularProgress,
  Typography,
  Button,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { DuplicateMatch, Activity } from '../types';
import DuplicateCard from './DuplicateCard';

interface DuplicateWithDetails extends DuplicateMatch {
  comments?: string;
  activities?: Activity[];
}

interface DuplicateDetailsModalProps {
  open: boolean;
  onClose: () => void;
  duplicates: DuplicateWithDetails[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const DuplicateDetailsModal: React.FC<DuplicateDetailsModalProps> = ({
  open,
  onClose,
  duplicates,
  loading,
  error,
  onRetry,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <DialogTitle>
        重複案件情報
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box p={3} textAlign="center">
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            {onRetry && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={onRetry}
              >
                再試行
              </Button>
            )}
          </Box>
        ) : duplicates.length > 0 ? (
          duplicates.map((duplicate) => (
            <DuplicateCard key={duplicate.sellerId} duplicate={duplicate} />
          ))
        ) : (
          <Box p={3} textAlign="center">
            <Typography variant="body1" color="text.secondary">
              重複案件が見つかりませんでした
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateDetailsModal;
