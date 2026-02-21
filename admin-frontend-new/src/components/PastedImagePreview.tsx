import { Box, Card, CardMedia, CardContent, Typography, IconButton, Grid, LinearProgress, Chip } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { PastedImage, MAX_TOTAL_IMAGE_SIZE } from '../types';
import { formatFileSize } from '../utils/clipboardImageUtils';

interface PastedImagePreviewProps {
  images: PastedImage[];
  onDelete: (imageId: string) => void;
  maxTotalSize?: number;
}

const PastedImagePreview = ({
  images,
  onDelete,
  maxTotalSize = MAX_TOTAL_IMAGE_SIZE,
}: PastedImagePreviewProps) => {
  if (images.length === 0) {
    return null;
  }

  // 合計サイズを計算
  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  const sizePercentage = (totalSize / maxTotalSize) * 100;

  return (
    <Box sx={{ mt: 2 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          貼り付けた画像 ({images.length}枚)
        </Typography>
        <Chip
          label={`${formatFileSize(totalSize)} / ${formatFileSize(maxTotalSize)}`}
          size="small"
          color={sizePercentage > 90 ? 'error' : sizePercentage > 70 ? 'warning' : 'default'}
        />
      </Box>

      {/* サイズプログレスバー */}
      <LinearProgress
        variant="determinate"
        value={Math.min(sizePercentage, 100)}
        sx={{
          mb: 2,
          height: 6,
          borderRadius: 3,
          backgroundColor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            backgroundColor: sizePercentage > 90 ? 'error.main' : sizePercentage > 70 ? 'warning.main' : 'primary.main',
          },
        }}
      />

      {/* 画像グリッド */}
      <Grid container spacing={2}>
        {images.map((image) => (
          <Grid item xs={12} sm={6} md={4} key={image.id}>
            <Card
              sx={{
                position: 'relative',
                '&:hover .delete-button': {
                  opacity: 1,
                },
              }}
            >
              <CardMedia
                component="img"
                height="150"
                image={image.dataUrl}
                alt={image.name}
                sx={{ objectFit: 'cover' }}
              />
              <IconButton
                className="delete-button"
                onClick={() => onDelete(image.id)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  },
                }}
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
              <CardContent sx={{ py: 1 }}>
                <Typography variant="body2" noWrap title={image.name}>
                  {image.name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {image.width} × {image.height}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(image.size)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PastedImagePreview;
