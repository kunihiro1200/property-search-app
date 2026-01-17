import React from 'react';
import { Box, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import PropertyImageGallery from './PropertyImageGallery';
import { FavoriteCommentOverlay } from './FavoriteCommentOverlay';
import { getFavoriteComment } from '../services/publicApi';

interface PropertyImageWithFavoriteCommentProps {
  propertyId: string;
  canDelete?: boolean;
  canHide?: boolean;
  showHiddenImages?: boolean;
  showFavoriteComment?: boolean;
}

/**
 * 物件画像ギャラリーとお気に入り文言を統合したコンポーネント
 */
export const PropertyImageWithFavoriteComment: React.FC<PropertyImageWithFavoriteCommentProps> = ({
  propertyId,
  canDelete = false,
  canHide = false,
  showHiddenImages = false,
  showFavoriteComment = true,
}) => {
  // お気に入り文言を取得
  const { data: favoriteCommentData } = useQuery({
    queryKey: ['favoriteComment', propertyId],
    queryFn: () => getFavoriteComment(propertyId),
    enabled: showFavoriteComment,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: false, // エラー時はリトライしない（グレースフルデグラデーション）
  });

  const favoriteComment = favoriteCommentData?.comment;

  return (
    <Box sx={{ width: '100%' }}>
      {/* お気に入り文言セクション（「物件画像」見出しの上に表示） */}
      {favoriteComment && (
        <Box sx={{ marginBottom: '20px' }}>
          <FavoriteCommentOverlay comment={favoriteComment} />
        </Box>
      )}

      {/* 「物件画像」見出し（印刷時は非表示） */}
      <Typography variant="h6" sx={{ mb: 2 }} className="no-print">
        物件画像
      </Typography>

      {/* 画像ギャラリーセクション */}
      <PropertyImageGallery
        propertyId={propertyId}
        canDelete={canDelete}
        canHide={canHide}
        showHiddenImages={showHiddenImages}
      />
    </Box>
  );
};

export default PropertyImageWithFavoriteComment;
