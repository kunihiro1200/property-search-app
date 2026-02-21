import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  ImageList,
  ImageListItem,
  CircularProgress,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usePropertyImages } from '../hooks/usePublicProperties';
import ImageDeleteButton from './ImageDeleteButton';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import api, { propertyImageApi } from '../services/api';
import publicApi from '../services/publicApi';

interface PropertyImageGalleryProps {
  propertyId: string;
  canDelete?: boolean;
  canHide?: boolean;  // 非表示機能を有効にするか（管理者モード）
  showHiddenImages?: boolean;  // 非表示画像も表示するか
  isPublicSite?: boolean;  // 公開サイトかどうか
}

interface DeleteState {
  isOpen: boolean;
  imageId: string;
  imageName: string;
  imageUrl: string;
  isDeleting: boolean;
}

const PropertyImageGallery: React.FC<PropertyImageGalleryProps> = ({ 
  propertyId,
  canDelete = false,
  canHide = false,
  showHiddenImages = false,
  isPublicSite = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localHiddenImageIds, setLocalHiddenImageIds] = useState<string[]>([]);
  const [isHideLoading, setIsHideLoading] = useState<string | null>(null);
  const [showAllImages, setShowAllImages] = useState(false); // 全画像表示フラグ
  const [deleteState, setDeleteState] = useState<DeleteState>({
    isOpen: false,
    imageId: '',
    imageName: '',
    imageUrl: '',
    isDeleting: false,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 非表示画像を含めて取得するかどうか（管理者モードまたは非表示画像表示モード）
  const includeHidden = canHide || showHiddenImages;
  
  // キャッシュクリア状態
  const [isClearingCache, setIsClearingCache] = useState(false);
  
  // 格納先URL入力フィールドの状態
  const [storageUrlInput, setStorageUrlInput] = useState('');
  const [isUpdatingStorageUrl, setIsUpdatingStorageUrl] = useState(false);
  
  // デバッグログ
  console.log('PropertyImageGallery - propertyId:', propertyId);
  console.log('PropertyImageGallery - includeHidden:', includeHidden);
  console.log('PropertyImageGallery - canHide:', canHide);
  console.log('PropertyImageGallery - isPublicSite:', isPublicSite);
  
  const { data, isLoading, isError, refetch } = usePropertyImages(propertyId, includeHidden);
  
  // デバッグログ
  console.log('PropertyImageGallery - data:', data);
  console.log('PropertyImageGallery - isLoading:', isLoading);
  console.log('PropertyImageGallery - isError:', isError);

  // 画像キャッシュをクリアして再取得
  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      // publicApiインスタンスを使用
      const response = await publicApi.post(`/api/public/properties/${propertyId}/clear-image-cache`);
      
      if (response.data.success) {
        // キャッシュクリア成功後、画像を再取得
        await refetch();
        
        setSnackbar({
          open: true,
          message: '画像キャッシュをクリアしました。最新の画像が表示されます。',
          severity: 'success',
        });
      }
    } catch (error: any) {
      console.error('Failed to clear image cache:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || '画像キャッシュのクリアに失敗しました',
        severity: 'error',
      });
    } finally {
      setIsClearingCache(false);
    }
  };
  
  // 格納先URLを更新
  const handleUpdateStorageUrl = async () => {
    console.log('[handleUpdateStorageUrl] Starting...');
    console.log('[handleUpdateStorageUrl] propertyId:', propertyId);
    console.log('[handleUpdateStorageUrl] storageUrlInput:', storageUrlInput);
    console.log('[handleUpdateStorageUrl] canHide:', canHide);
    
    if (!storageUrlInput.trim()) {
      setSnackbar({
        open: true,
        message: 'Google DriveフォルダURLを入力してください',
        severity: 'error',
      });
      return;
    }
    
    setIsUpdatingStorageUrl(true);
    try {
      // 公開サイトのエンドポイントなので、publicApiを使用（認証不要）
      const apiClient = publicApi;
      console.log('[handleUpdateStorageUrl] Using API client: publicApi (no auth)');
      
      const url = `/api/public/properties/${propertyId}/update-storage-url`;
      console.log('[handleUpdateStorageUrl] Request URL:', url);
      console.log('[handleUpdateStorageUrl] Request body:', { storageUrl: storageUrlInput.trim() });
      
      const response = await apiClient.post(url, {
        storageUrl: storageUrlInput.trim()
      });
      
      console.log('[handleUpdateStorageUrl] Response:', response.data);
      
      if (response.data.success) {
        // 成功後、画像を再取得
        await refetch();
        
        setSnackbar({
          open: true,
          message: '格納先URLを更新しました。画像を取得しています...',
          severity: 'success',
        });
        
        // 入力フィールドをクリア
        setStorageUrlInput('');
      }
    } catch (error: any) {
      console.error('[handleUpdateStorageUrl] Error:', error);
      console.error('[handleUpdateStorageUrl] Error response:', error.response);
      console.error('[handleUpdateStorageUrl] Error message:', error.message);
      
      setSnackbar({
        open: true,
        message: error.response?.data?.message || '格納先URLの更新に失敗しました',
        severity: 'error',
      });
    } finally {
      setIsUpdatingStorageUrl(false);
    }
  };

  // APIから取得した非表示画像リストとローカル状態をマージ
  const hiddenImageIds = useMemo(() => {
    const apiHiddenImages = data?.hiddenImages || [];
    // ローカル状態が更新されている場合はそちらを優先
    if (localHiddenImageIds.length > 0) {
      return localHiddenImageIds;
    }
    return apiHiddenImages;
  }, [data?.hiddenImages, localHiddenImageIds]);

  // APIレスポンスが更新されたらローカル状態をリセット
  useEffect(() => {
    if (data?.hiddenImages) {
      setLocalHiddenImageIds([]);
    }
  }, [data?.hiddenImages]);

  const allImages = data?.images || [];
  
  // 表示する画像をフィルタリング（非表示画像を除外）
  const filteredImages = showHiddenImages 
    ? allImages 
    : allImages.filter(img => !hiddenImageIds.includes(img.id));

  // 表示する画像（最初8枚 or 全て）
  const INITIAL_IMAGE_COUNT = 8;
  const images = showAllImages ? filteredImages : filteredImages.slice(0, INITIAL_IMAGE_COUNT);
  const hasMoreImages = filteredImages.length > INITIAL_IMAGE_COUNT;

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const handleShowAllImages = () => {
    setShowAllImages(true);
  };

  const handleHideExtraImages = () => {
    setShowAllImages(false);
  };

  const handleClose = () => {
    setLightboxOpen(false);
  };

  // 画像のプリロード（次と前の画像を事前に読み込む）
  useEffect(() => {
    if (!lightboxOpen || images.length === 0) return;

    const preloadImage = (index: number) => {
      if (index >= 0 && index < images.length) {
        const img = new Image();
        img.src = images[index].fullImageUrl;
      }
    };

    // 現在の画像の前後をプリロード
    const nextIndex = (currentIndex + 1) % images.length;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    
    preloadImage(nextIndex);
    preloadImage(prevIndex);
  }, [currentIndex, lightboxOpen, images]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      handlePrevious();
    } else if (event.key === 'ArrowRight') {
      handleNext();
    } else if (event.key === 'Escape') {
      handleClose();
    }
  };

  // 削除ダイアログを開く
  const handleDeleteClick = (imageId: string, imageName: string, imageUrl: string) => {
    setDeleteState({
      isOpen: true,
      imageId,
      imageName,
      imageUrl,
      isDeleting: false,
    });
  };

  // 削除をキャンセル
  const handleDeleteCancel = () => {
    if (!deleteState.isDeleting) {
      setDeleteState({
        isOpen: false,
        imageId: '',
        imageName: '',
        imageUrl: '',
        isDeleting: false,
      });
    }
  };

  // 削除を実行
  const handleDeleteConfirm = async () => {
    setDeleteState(prev => ({ ...prev, isDeleting: true }));

    try {
      // 公開サイトではpublicApiを使用、管理サイトではapiを使用
      const apiClient = isPublicSite ? publicApi : api;
      await apiClient.delete(`/api/public/properties/${propertyId}/images/${deleteState.imageId}`);
      
      // 成功通知
      setSnackbar({
        open: true,
        message: '画像を削除しました',
        severity: 'success',
      });

      // ダイアログを閉じる
      setDeleteState({
        isOpen: false,
        imageId: '',
        imageName: '',
        imageUrl: '',
        isDeleting: false,
      });

      // ライトボックスが開いている場合の処理
      if (lightboxOpen) {
        const deletedIndex = images.findIndex(img => img.id === deleteState.imageId);
        if (deletedIndex !== -1) {
          // 削除後の画像数
          const newLength = images.length - 1;
          if (newLength === 0) {
            // 画像がなくなったらライトボックスを閉じる
            setLightboxOpen(false);
          } else if (currentIndex >= newLength) {
            // 最後の画像を削除した場合は前の画像に移動
            setCurrentIndex(newLength - 1);
          }
        }
      }

      // 画像リストを再取得
      refetch();
    } catch (error: any) {
      console.error('Error deleting image:', error);
      
      // エラーメッセージを取得
      let errorMessage = '画像の削除に失敗しました';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 403) {
        errorMessage = 'このファイルを削除する権限がありません。フォルダの所有者にサービスアカウントへの編集権限の付与を依頼してください。';
      } else if (error.response?.status === 500) {
        // 500エラーの場合、詳細メッセージを確認
        const detail = error.response?.data?.details || error.response?.data?.message || '';
        if (detail.includes('permission') || detail.includes('403')) {
          errorMessage = 'このファイルを削除する権限がありません。フォルダの所有者にサービスアカウントへの編集権限の付与を依頼してください。';
        }
      }
      
      // エラー通知
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });

      setDeleteState(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // スナックバーを閉じる
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 画像を非表示にする
  const handleHideImage = async (imageId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    setIsHideLoading(imageId);
    
    try {
      const result = await propertyImageApi.hideImage(propertyId, imageId);
      // ローカル状態を更新
      setLocalHiddenImageIds(result.hiddenImages || []);
      
      setSnackbar({
        open: true,
        message: '画像を非表示にしました',
        severity: 'success',
      });

      // ライトボックスが開いている場合の処理
      if (lightboxOpen && !showHiddenImages) {
        const hiddenIndex = images.findIndex(img => img.id === imageId);
        if (hiddenIndex !== -1) {
          const newLength = images.length - 1;
          if (newLength === 0) {
            setLightboxOpen(false);
          } else if (currentIndex >= newLength) {
            setCurrentIndex(newLength - 1);
          }
        }
      }
      
      // データを再取得
      refetch();
    } catch (error: any) {
      console.error('Error hiding image:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || '画像の非表示に失敗しました',
        severity: 'error',
      });
    } finally {
      setIsHideLoading(null);
    }
  };

  // 画像を復元する
  const handleRestoreImage = async (imageId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    setIsHideLoading(imageId);
    
    try {
      const result = await propertyImageApi.restoreImage(propertyId, imageId);
      // ローカル状態を更新
      setLocalHiddenImageIds(result.hiddenImages || []);
      
      setSnackbar({
        open: true,
        message: '画像を復元しました',
        severity: 'success',
      });
      
      // データを再取得
      refetch();
    } catch (error: any) {
      console.error('Error restoring image:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || '画像の復元に失敗しました',
        severity: 'error',
      });
    } finally {
      setIsHideLoading(null);
    }
  };

  // 画像が非表示かどうかを判定
  const isImageHidden = (imageId: string) => hiddenImageIds.includes(imageId);

  // ローディング状態
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  // エラー状態または画像なし
  const hasNoImages = isError || images.length === 0;

  // グリッドの列数を画面サイズに応じて調整
  const cols = isMobile ? 2 : isTablet ? 3 : 4;

  return (
    <>
      <Box sx={{ position: 'relative', width: '100%' }}>
        {/* ヘッダー部分（非表示画像カウンター + 格納先URL入力 + キャッシュクリアボタン） */}
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 上段: 非表示画像カウンター */}
          {canHide && hiddenImageIds.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<VisibilityOffIcon />}
                label={`非表示: ${hiddenImageIds.length}枚`}
                size="small"
                color="warning"
                variant="outlined"
              />
              {!showHiddenImages && (
                <Typography variant="caption" color="text.secondary">
                  ※非表示画像は公開サイトに表示されません
                </Typography>
              )}
            </Box>
          )}
          
          {/* 下段: 格納先URL入力 + ボタン（管理者モード時のみ） */}
          {canHide && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: '300px', display: 'flex', gap: 1 }}>
                <input
                  type="text"
                  value={storageUrlInput}
                  onChange={(e) => setStorageUrlInput(e.target.value)}
                  placeholder="Google DriveフォルダURL（例: https://drive.google.com/drive/folders/...）"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleUpdateStorageUrl}
                  disabled={isUpdatingStorageUrl || !storageUrlInput.trim()}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {isUpdatingStorageUrl ? '更新中...' : 'URL更新'}
                </Button>
              </Box>
              
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearCache}
                disabled={isClearingCache}
                startIcon={isClearingCache ? <CircularProgress size={16} /> : <RefreshIcon />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {isClearingCache ? '更新中...' : '画像を更新'}
              </Button>
            </Box>
          )}
        </Box>

        {/* 画像がない場合のメッセージ */}
        {hasNoImages && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              bgcolor: 'grey.100',
              borderRadius: 2,
            }}
          >
            <ImageNotSupportedIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              画像がありません
            </Typography>
          </Box>
        )}

        {/* 画像グリッド */}
        {!hasNoImages && (
          <ImageList cols={cols} gap={8} sx={{ m: 0 }}>
          {images.map((image, index) => {
            const isHidden = isImageHidden(image.id);
            const isLoading = isHideLoading === image.id;
            
            return (
              <ImageListItem
                key={image.id}
                sx={{
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 1,
                  position: 'relative',
                  // 非表示画像のグレーアウト表示
                  ...(isHidden && showHiddenImages && {
                    opacity: 0.5,
                    filter: 'grayscale(70%)',
                  }),
                  '&:hover': {
                    opacity: isHidden && showHiddenImages ? 0.6 : 0.9,
                  },
                }}
                onClick={() => handleImageClick(index)}
              >
                {/* 非表示インジケーター */}
                {isHidden && showHiddenImages && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      zIndex: 2,
                      bgcolor: 'rgba(255, 152, 0, 0.9)',
                      borderRadius: '4px',
                      px: 0.5,
                      py: 0.25,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <VisibilityOffIcon sx={{ fontSize: 14, color: 'white' }} />
                    <Typography variant="caption" sx={{ color: 'white', fontSize: 10 }}>
                      非表示
                    </Typography>
                  </Box>
                )}

                {/* 非表示/復元ボタン（管理者モード） */}
                {canHide && (
                  <Tooltip title={isHidden ? '復元する' : '非表示にする'}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isHidden) {
                          handleRestoreImage(image.id, e);
                        } else {
                          handleHideImage(image.id, e);
                        }
                      }}
                      disabled={isLoading}
                      sx={{
                        position: 'absolute',
                        top: isHidden && showHiddenImages ? 28 : 4,
                        left: 4,
                        zIndex: 2,
                        bgcolor: isHidden ? 'rgba(76, 175, 80, 0.9)' : 'rgba(255, 152, 0, 0.9)',
                        color: 'white',
                        '&:hover': {
                          bgcolor: isHidden ? 'rgba(76, 175, 80, 1)' : 'rgba(255, 152, 0, 1)',
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'rgba(0, 0, 0, 0.3)',
                          color: 'white',
                        },
                      }}
                    >
                      {isLoading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : isHidden ? (
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <VisibilityOffIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}

                {/* 削除ボタン（認証済みの場合のみ表示） */}
                {canDelete && (
                  <ImageDeleteButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(image.id, image.name, image.fullImageUrl);
                    }}
                  />
                )}
                <img
                  src={image.fullImageUrl}
                  alt={image.name}
                  loading="lazy"
                  crossOrigin="anonymous"
                  className="property-gallery-image"
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                  }}
                />
              </ImageListItem>
            );
          })}
        </ImageList>
        )}

        {/* 「他の画像を見る」ボタン */}
        {!showAllImages && hasMoreImages && !hasNoImages && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleShowAllImages}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'medium',
              }}
            >
              他の画像を見る（残り{filteredImages.length - INITIAL_IMAGE_COUNT}枚）
            </Button>
          </Box>
        )}

        {/* 「閉じる」ボタン（全画像表示中） */}
        {showAllImages && hasMoreImages && !hasNoImages && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleHideExtraImages}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'medium',
              }}
            >
              閉じる
            </Button>
          </Box>
        )}
      </Box>

      {/* ライトボックス */}
      <Dialog
        open={lightboxOpen}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        onKeyDown={handleKeyDown}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            boxShadow: 'none',
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            minHeight: '60vh',
          }}
        >
          {/* 閉じるボタン */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* 削除ボタン（ライトボックス内、認証済みの場合のみ） */}
          {canDelete && images[currentIndex] && (
            <IconButton
              onClick={() => handleDeleteClick(
                images[currentIndex].id,
                images[currentIndex].name,
                images[currentIndex].fullImageUrl
              )}
              sx={{
                position: 'absolute',
                top: 8,
                right: 56,
                color: 'white',
                bgcolor: 'rgba(211, 47, 47, 0.7)',
                '&:hover': {
                  bgcolor: 'rgba(211, 47, 47, 0.9)',
                },
              }}
            >
              <DeleteIcon />
            </IconButton>
          )}

          {/* 非表示/復元ボタン（ライトボックス内、管理者モード） */}
          {canHide && images[currentIndex] && (
            <Tooltip title={isImageHidden(images[currentIndex].id) ? '復元する' : '非表示にする'}>
              <IconButton
                onClick={() => {
                  const currentImage = images[currentIndex];
                  if (isImageHidden(currentImage.id)) {
                    handleRestoreImage(currentImage.id);
                  } else {
                    handleHideImage(currentImage.id);
                  }
                }}
                disabled={isHideLoading === images[currentIndex].id}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: canDelete ? 104 : 56,
                  color: 'white',
                  bgcolor: isImageHidden(images[currentIndex].id) 
                    ? 'rgba(76, 175, 80, 0.7)' 
                    : 'rgba(255, 152, 0, 0.7)',
                  '&:hover': {
                    bgcolor: isImageHidden(images[currentIndex].id) 
                      ? 'rgba(76, 175, 80, 0.9)' 
                      : 'rgba(255, 152, 0, 0.9)',
                  },
                }}
              >
                {isHideLoading === images[currentIndex].id ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isImageHidden(images[currentIndex].id) ? (
                  <VisibilityIcon />
                ) : (
                  <VisibilityOffIcon />
                )}
              </IconButton>
            </Tooltip>
          )}

          {/* 前へボタン（中央左） */}
          {images.length > 1 && (
            <IconButton
              onClick={handlePrevious}
              sx={{
                position: 'absolute',
                left: 8,
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <ChevronLeftIcon fontSize="large" />
            </IconButton>
          )}

          {/* 前へボタン（上部左） */}
          {images.length > 1 && (
            <IconButton
              onClick={handlePrevious}
              sx={{
                position: 'absolute',
                top: 8,
                left: canHide || canDelete ? 160 : 8, // 他のボタンがある場合は右にずらす
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
                zIndex: 1,
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
          )}

          {/* 画像 */}
          {images[currentIndex] && (
            <Box
              component="img"
              src={images[currentIndex].fullImageUrl}
              alt={images[currentIndex].name}
              crossOrigin="anonymous"
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          )}

          {/* 次へボタン（中央右） */}
          {images.length > 1 && (
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 8,
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <ChevronRightIcon fontSize="large" />
            </IconButton>
          )}

          {/* 次へボタン（上部右） */}
          {images.length > 1 && (
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                top: 8,
                right: canDelete ? 160 : (canHide ? 112 : 64), // 閉じるボタンの左側に配置
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
                zIndex: 1,
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          )}

          {/* 画像カウンター（下部中央） */}
          {images.length > 1 && (
            <Typography
              variant="body2"
              sx={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                px: 2,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              {currentIndex + 1} / {images.length}
            </Typography>
          )}

          {/* 画像カウンター（上部中央） */}
          {images.length > 1 && (
            <Typography
              variant="body2"
              sx={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                px: 2,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              {currentIndex + 1} / {images.length}
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        open={deleteState.isOpen}
        imageUrl={deleteState.imageUrl}
        imageName={deleteState.imageName}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={deleteState.isDeleting}
      />

      {/* 通知スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PropertyImageGallery;
