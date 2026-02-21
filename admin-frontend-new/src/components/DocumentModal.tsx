import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  PictureAsPdf,
  Image as ImageIcon,
  InsertDriveFile,
  Delete,
  Download,
  OpenInNew,
  CloudUpload,
  Folder,
} from '@mui/icons-material';
import api from '../services/api';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink: string;
  webContentLink: string;
}

interface DocumentModalProps {
  open: boolean;
  onClose: () => void;
  sellerNumber: string;
}

const DocumentModal = ({ open, onClose, sellerNumber }: DocumentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folderUrl, setFolderUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadFolder = useCallback(async () => {
    if (!sellerNumber) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/drive/folders/${sellerNumber}`);
      setFiles(response.data.files || []);
      setFolderUrl(response.data.folderUrl || '');
    } catch (err: any) {
      console.error('Error loading folder:', err);
      if (err.response?.data?.code === 'GOOGLE_AUTH_REQUIRED') {
        setError('Google認証が必要です。管理者に連絡してください。');
      } else {
        setError(err.response?.data?.error || 'フォルダの読み込みに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  }, [sellerNumber]);

  useEffect(() => {
    if (open && sellerNumber) {
      loadFolder();
    }
  }, [open, sellerNumber, loadFolder]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      // ファイル名をBlobとして追加し、UTF-8エンコードされたファイル名を別途送信
      formData.append('file', file, file.name);
      formData.append('fileName', file.name);

      await api.post(`/api/drive/folders/${sellerNumber}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      await loadFolder();
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.response?.data?.error || 'ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/drive/files/${fileId}`);
      setDeleteConfirm(null);
      await loadFolder();
    } catch (err: any) {
      console.error('Error deleting file:', err);
      setError(err.response?.data?.error || 'ファイルの削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };


  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return <PictureAsPdf color="error" />;
    }
    if (mimeType.startsWith('image/')) {
      return <ImageIcon color="primary" />;
    }
    return <InsertDriveFile />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Folder color="primary" />
            <Typography variant="h6">
              ドキュメント管理 - {sellerNumber}
            </Typography>
          </Box>
          {folderUrl && (
            <Tooltip title="Google Driveで開く">
              <IconButton
                href={folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
              >
                <OpenInNew />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {uploading && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              アップロード中... {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : files.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              ファイルがありません
            </Typography>
          </Box>
        ) : (
          <List>
            {files.map((file) => (
              <ListItem
                key={file.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemIcon>{getFileIcon(file.mimeType)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      component="a"
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: 'primary.main',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {file.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)} • {formatDate(file.modifiedTime)}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="ダウンロード">
                    <IconButton
                      href={file.webContentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="削除">
                    <IconButton
                      onClick={() => setDeleteConfirm(file.id)}
                      size="small"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {/* 削除確認ダイアログ */}
        <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
          <DialogTitle>ファイルを削除しますか？</DialogTitle>
          <DialogContent>
            <Typography>この操作は取り消せません。</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirm(null)} disabled={deleting}>
              キャンセル
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              color="error"
              disabled={deleting}
            >
              {deleting ? <CircularProgress size={20} /> : '削除'}
            </Button>
          </DialogActions>
        </Dialog>
      </DialogContent>

      <DialogActions>
        <Button
          component="label"
          variant="contained"
          startIcon={<CloudUpload />}
          disabled={uploading || loading}
        >
          ファイルをアップロード
          <input
            type="file"
            hidden
            accept=".pdf,image/*"
            onChange={handleFileUpload}
          />
        </Button>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentModal;
