import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

interface EmailPreviewProps {
  html: string;
  loading?: boolean;
  error?: string | null;
}

const PreviewContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: '400px',
  maxHeight: '600px',
  overflow: 'auto',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

const PreviewContent = styled(Box)(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.body1.fontSize,
  lineHeight: 1.6,
  color: theme.palette.text.primary,
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
    margin: '10px 0',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  '& img[src^="cid:"]': {
    // CID参照の画像にはプレースホルダーを表示
    position: 'relative',
    '&::after': {
      content: '"[画像]"',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: theme.palette.grey[200],
      padding: theme.spacing(1),
      borderRadius: theme.shape.borderRadius,
    },
  },
}));

const LoadingOverlay = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '400px',
});

const ImagePlaceholder = styled(Box)(({ theme }) => ({
  display: 'inline-block',
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.grey[200],
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.text.secondary,
  fontSize: theme.typography.body2.fontSize,
  margin: '10px 0',
}));

const EmailPreview: React.FC<EmailPreviewProps> = ({
  html,
  loading = false,
  error = null,
}) => {
  const [processedHtml, setProcessedHtml] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    // CID参照をプレースホルダーに置き換える
    const processed = html.replace(
      /<img([^>]*)src="cid:([^"]+)"([^>]*)>/gi,
      (match, before, cid, after) => {
        return `<img${before}src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100'%3E%3Crect fill='%23f0f0f0' width='200' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666'%3E[画像]%3C/text%3E%3C/svg%3E" alt="[画像: ${cid}]"${after}>`;
      }
    );
    setProcessedHtml(processed);
  }, [html]);

  const handleImageError = (src: string) => {
    setImageErrors(prev => new Set(prev).add(src));
  };

  if (loading) {
    return (
      <PreviewContainer>
        <LoadingOverlay>
          <CircularProgress />
        </LoadingOverlay>
      </PreviewContainer>
    );
  }

  if (error) {
    return (
      <PreviewContainer>
        <Alert severity="error">{error}</Alert>
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer>
      <Typography variant="caption" color="text.secondary" gutterBottom>
        プレビュー（実際のメールの表示に近い形式）
      </Typography>
      <PreviewContent
        dangerouslySetInnerHTML={{ __html: processedHtml }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.tagName === 'IMG') {
            handleImageError(target.src);
          }
        }}
      />
      {imageErrors.size > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          一部の画像の読み込みに失敗しました
        </Alert>
      )}
    </PreviewContainer>
  );
};

export default EmailPreview;
