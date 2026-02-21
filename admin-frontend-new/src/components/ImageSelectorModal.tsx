import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  CheckCircle,
  Close,
  Image as ImageIcon,
  ZoomIn,
  Folder as FolderIcon,
  CloudUpload,
  Link as LinkIcon,
  NavigateNext,
  Home as HomeIcon,
} from '@mui/icons-material';
import { emailImageApi } from '../services/api';


interface ImageSelectorModalProps {
  open: boolean;
  onConfirm: (selectedImages: ImageFile[]) => void;
  onCancel: () => void;
}

// 統一された画像ファイル型
interface ImageFile {
  id: string;
  name: string;
  source: 'drive' | 'local' | 'url';
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  previewUrl: string;
  // ソース固有の情報
  driveFileId?: string;      // Google Drive用
  localFile?: File;          // ローカルファイル用
  url?: string;              // URL用
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  thumbnailLink?: string;
  webViewLink: string;
  isFolder: boolean;
}

interface FolderPathItem {
  id: string;
  name: string;
}

const ImageSelectorModal = ({
  open,
  onConfirm,
  onCancel,
}: ImageSelectorModalProps) => {
  // タブ管理
  const [activeTab, setActiveTab] = useState<'drive' | 'local' | 'url'>('drive');
  
  // 共通状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [previewImage, setPreviewImage] = useState<ImageFile | null>(null);
  
  // Google Drive用の状態
  const [folderPath, setFolderPath] = useState<FolderPathItem[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  
  // ローカルファイル用の状態
  const [dragActive, setDragActive] = useState(false);
  
  // URL用の状態
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // モーダルが開いたときにGoogle Driveのルートフォルダを読み込む
  useEffect(() => {
    if (open && activeTab === 'drive') {
      loadDriveFolder(null);
    }
  }, [open, activeTab]);

  // Google Driveフォルダの内容を読み込む
  const loadDriveFolder = async (folderId: string | null) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📂 Loading folder:', folderId);
      const response = await emailImageApi.listFolderContents(folderId);
      console.log('✅ Folder loaded:', response);
      setDriveFiles(response.files || []);
      setFolderPath(response.path || []);
    } catch (err: any) {
      console.error('❌ Error loading folder:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      const errorMessage = err.response?.data?.error?.message 
        || err.response?.data?.error 
        || err.message 
        || 'フォルダの読み込みに失敗しました';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // フォルダをクリックして移動
  const handleFolderClick = (folderId: string) => {
    loadDriveFolder(folderId);
  };

  // パンくずリストでフォルダに移動
  const handleBreadcrumbClick = (folderId: string | null) => {
    loadDriveFolder(folderId);
  };

  // 画像を選択/解除
  const handleImageToggle = (image: ImageFile) => {
    setSelectedImages(prev => {
      const isSelected = prev.some(img => img.id === image.id);
      if (isSelected) {
        return prev.filter(img => img.id !== image.id);
      } else {
        return [...prev, image];
      }
    });
  };

  // Google Drive画像をImageFile形式に変換
  const convertDriveFileToImageFile = (driveFile: DriveFile): ImageFile => {
    return {
      id: driveFile.id,
      name: driveFile.name,
      source: 'drive',
      size: driveFile.size,
      mimeType: driveFile.mimeType,
      thumbnailUrl: driveFile.thumbnailLink,
      previewUrl: driveFile.webViewLink,
      driveFileId: driveFile.id,
    };
  };

  // ローカルファイル選択
  const handleLocalFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      
      // ImageFile形式に変換して選択リストに追加
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageFile: ImageFile = {
            id: `local-${Date.now()}-${file.name}`,
            name: file.name,
            source: 'local',
            size: file.size,
            mimeType: file.type,
            previewUrl: e.target?.result as string,
            localFile: file,
          };
          setSelectedImages(prev => [...prev, imageFile]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // ドラッグ&ドロップ
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      
      // ImageFile形式に変換して選択リストに追加
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageFile: ImageFile = {
            id: `local-${Date.now()}-${file.name}`,
            name: file.name,
            source: 'local',
            size: file.size,
            mimeType: file.type,
            previewUrl: e.target?.result as string,
            localFile: file,
          };
          setSelectedImages(prev => [...prev, imageFile]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // URL追加
  const handleAddUrl = () => {
    setUrlError(null);
    
    if (!urlInput.trim()) {
      setUrlError('URLを入力してください');
      return;
    }

    // URL形式の簡易検証
    try {
      new URL(urlInput);
    } catch {
      setUrlError('有効なURLを入力してください');
      return;
    }

    // 画像URLかどうかを確認（拡張子チェック）
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasImageExtension = imageExtensions.some(ext => 
      urlInput.toLowerCase().includes(ext)
    );

    if (!hasImageExtension) {
      setUrlError('画像URL（.jpg, .png, .gif等）を入力してください');
      return;
    }

    const imageFile: ImageFile = {
      id: `url-${Date.now()}`,
      name: urlInput.split('/').pop() || 'image',
      source: 'url',
      size: 0, // URLの場合はサイズ不明
      mimeType: 'image/*',
      previewUrl: urlInput,
      url: urlInput,
    };

    setSelectedImages(prev => [...prev, imageFile]);
    setUrlInput('');
  };

  // 確定
  const handleConfirm = () => {
    // ファイルサイズチェック（5MB/枚、合計10MB）
    const totalSize = selectedImages.reduce((sum, img) => sum + img.size, 0);
    const maxSingleSize = 5 * 1024 * 1024; // 5MB
    const maxTotalSize = 10 * 1024 * 1024; // 10MB

    const oversizedImage = selectedImages.find(img => img.size > maxSingleSize);
    if (oversizedImage) {
      setError(`${oversizedImage.name} のサイズが5MBを超えています`);
      return;
    }

    if (totalSize > maxTotalSize) {
      setError('選択した画像の合計サイズが10MBを超えています');
      return;
    }

    onConfirm(selectedImages);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '不明';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isImageSelected = (imageId: string): boolean => {
    return selectedImages.some(img => img.id === imageId);
  };

  // 画像カードをレンダリング
  const renderImageCard = (image: ImageFile) => {
    const isSelected = isImageSelected(image.id);

    return (
      <Grid item xs={12} sm={6} md={4} key={image.id}>
        <Card
          sx={{
            cursor: 'pointer',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            position: 'relative',
            '&:hover': {
              boxShadow: 3,
            },
          }}
          onClick={() => handleImageToggle(image)}
        >
          <CardMedia
            component="img"
            height="200"
            image={image.thumbnailUrl || image.previewUrl}
            alt={image.name}
            sx={{ objectFit: 'cover' }}
          />
          {isSelected && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'primary.main',
                borderRadius: '50%',
              }}
            >
              <CheckCircle sx={{ color: 'white', fontSize: 32 }} />
            </Box>
          )}
          <CardContent>
            <Typography variant="body2" noWrap title={image.name}>
              {image.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(image.size)}
            </Typography>
            <Tooltip title="プレビュー">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(image);
                }}
                sx={{ ml: 1 }}
              >
                <ZoomIn fontSize="small" />
              </IconButton>
            </Tooltip>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  // フォルダカードをレンダリング
  const renderFolderCard = (folder: DriveFile) => {
    return (
      <Grid item xs={12} sm={6} md={4} key={folder.id}>
        <Card
          sx={{
            cursor: 'pointer',
            '&:hover': {
              boxShadow: 3,
              bgcolor: 'action.hover',
            },
          }}
          onClick={() => handleFolderClick(folder.id)}
        >
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.100',
            }}
          >
            <FolderIcon sx={{ fontSize: 80, color: 'primary.main' }} />
          </Box>
          <CardContent>
            <Typography variant="body2" noWrap title={folder.name}>
              {folder.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              フォルダ
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onCancel} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ImageIcon color="primary" />
              <Typography variant="h6">画像を選択</Typography>
              {selectedImages.length > 0 && (
                <Chip
                  label={`${selectedImages.length}枚選択済み`}
                  size="small"
                  color="primary"
                />
              )}
            </Box>
            <IconButton onClick={onCancel}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* タブ切り替え */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              label="Google Drive"
              value="drive"
              icon={<FolderIcon />}
              iconPosition="start"
            />
            <Tab
              label="ローカルファイル"
              value="local"
              icon={<CloudUpload />}
              iconPosition="start"
            />
            <Tab
              label="URL"
              value="url"
              icon={<LinkIcon />}
              iconPosition="start"
            />
          </Tabs>

          {/* Google Driveタブ */}
          {activeTab === 'drive' && (
            <Box>
              {/* パンくずリスト */}
              <Breadcrumbs
                separator={<NavigateNext fontSize="small" />}
                sx={{ mb: 2 }}
              >
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => handleBreadcrumbClick(null)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <HomeIcon fontSize="small" />
                  ルート
                </Link>
                {folderPath.map((folder) => (
                  <Link
                    key={folder.id}
                    component="button"
                    variant="body2"
                    onClick={() => handleBreadcrumbClick(folder.id)}
                  >
                    {folder.name}
                  </Link>
                ))}
              </Breadcrumbs>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {driveFiles.map((file) =>
                    file.isFolder
                      ? renderFolderCard(file)
                      : renderImageCard(convertDriveFileToImageFile(file))
                  )}
                  {driveFiles.length === 0 && (
                    <Grid item xs={12}>
                      <Alert severity="info">このフォルダには画像がありません</Alert>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>
          )}

          {/* ローカルファイルタブ */}
          {activeTab === 'local' && (
            <Box>
              {/* ファイル選択ボタン */}
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                >
                  ファイルを選択
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleLocalFileSelect}
                  />
                </Button>
              </Box>

              {/* ドラッグ&ドロップエリア */}
              <Box
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                sx={{
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: dragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: dragActive ? 'action.hover' : 'transparent',
                  mb: 3,
                }}
              >
                <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  ここにファイルをドラッグ&ドロップ
                </Typography>
              </Box>

              {/* 選択された画像一覧 */}
              {selectedImages.filter(img => img.source === 'local').length > 0 ? (
                <Grid container spacing={2}>
                  {selectedImages
                    .filter(img => img.source === 'local')
                    .map(renderImageCard)}
                </Grid>
              ) : (
                <Alert severity="info">ファイルを選択してください</Alert>
              )}
            </Box>
          )}

          {/* URLタブ */}
          {activeTab === 'url' && (
            <Box>
              {/* URL入力フィールド */}
              <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="画像URL"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  error={!!urlError}
                  helperText={urlError}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddUrl();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddUrl}
                  sx={{ minWidth: 100 }}
                >
                  追加
                </Button>
              </Box>

              {/* 追加された画像一覧 */}
              {selectedImages.filter(img => img.source === 'url').length > 0 ? (
                <Grid container spacing={2}>
                  {selectedImages
                    .filter(img => img.source === 'url')
                    .map(renderImageCard)}
                </Grid>
              ) : (
                <Alert severity="info">画像URLを入力して追加してください</Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onCancel}>キャンセル</Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={selectedImages.length === 0}
          >
            確定（{selectedImages.length}枚）
          </Button>
        </DialogActions>
      </Dialog>

      {/* 画像プレビューモーダル */}
      {previewImage && (
        <Dialog
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">画像プレビュー</Typography>
              <IconButton onClick={() => setPreviewImage(null)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <img
                src={previewImage.previewUrl}
                alt={previewImage.name}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </Box>
            <Typography variant="body2">
              <strong>ファイル名:</strong> {previewImage.name}
            </Typography>
            <Typography variant="body2">
              <strong>サイズ:</strong> {formatFileSize(previewImage.size)}
            </Typography>
            <Typography variant="body2">
              <strong>ソース:</strong>{' '}
              {previewImage.source === 'drive' && 'Google Drive'}
              {previewImage.source === 'local' && 'ローカルファイル'}
              {previewImage.source === 'url' && 'URL'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                handleImageToggle(previewImage);
                setPreviewImage(null);
              }}
              variant="contained"
            >
              {isImageSelected(previewImage.id) ? '選択を解除' : '選択'}
            </Button>
            <Button onClick={() => setPreviewImage(null)}>閉じる</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default ImageSelectorModal;
