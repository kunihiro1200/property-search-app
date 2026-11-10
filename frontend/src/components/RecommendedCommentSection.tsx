import React from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import publicApi from '../services/publicApi';

interface RecommendedCommentSectionProps {
  propertyId: string;
}

interface RecommendedCommentResponse {
  comments: string[][]; // 行ごとのコメント配列
  propertyType: string;
}

/**
 * おすすめコメントセクション
 * 
 * 公開物件詳細ページに表示される、業務リストスプレッドシートから
 * 取得したおすすめコメントを表示するコンポーネント
 */
const RecommendedCommentSection: React.FC<RecommendedCommentSectionProps> = ({
  propertyId,
}) => {
  const { data, isLoading, isError } = useQuery<RecommendedCommentResponse>({
    queryKey: ['recommendedComment', propertyId],
    queryFn: async () => {
      const response = await publicApi.get(`/properties/${propertyId}/recommended-comment`);
      return response.data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // ローディング中
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // エラーまたはコメントなし
  if (isError || !data?.comments || data.comments.length === 0) {
    return null;
  }

  // 「支払例」を含む行から下はすべて非表示にする
  const cutIndex = data.comments.findIndex((row) => row.join(' ').includes('支払例'));
  const visibleComments = cutIndex >= 0 ? data.comments.slice(0, cutIndex) : data.comments;
  if (visibleComments.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={2}
      className="recommended-comment-section"
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: '#FFF9E6',
        borderLeft: '4px solid #FFC107',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontWeight: 'bold',
          color: '#F57C00',
        }}
      >
        おすすめポイント
      </Typography>
      <Box sx={{ m: 0 }}>
        {visibleComments.map((row, rowIndex) => (
          <Typography
            key={rowIndex}
            variant="body1"
            sx={{
              mb: 1,
              lineHeight: 1.8,
              color: 'text.primary',
            }}
          >
            {/* 同じ行のセルを横並びで表示（スペース区切り） */}
            {row.join(' ')}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

export default RecommendedCommentSection;
