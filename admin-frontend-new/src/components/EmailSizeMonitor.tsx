import React, { useMemo } from 'react';
import { Box, LinearProgress, Typography, Alert, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface EmailSizeMonitorProps {
  html: string;
  maxSize?: number; // in bytes
  warningThreshold?: number; // percentage (0-1)
  errorThreshold?: number; // percentage (0-1)
}

const MonitorContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const SizeInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(1),
}));

const EmailSizeMonitor: React.FC<EmailSizeMonitorProps> = ({
  html,
  maxSize = 10 * 1024 * 1024, // 10MB default
  warningThreshold = 0.8, // 80%
  errorThreshold = 0.95, // 95%
}) => {
  const sizeInfo = useMemo(() => {
    // Calculate size of HTML content
    const htmlSize = new Blob([html]).size;
    
    // Extract data URLs and calculate their sizes
    const dataUrlRegex = /data:image\/[^;]+;base64,([^"')\s]+)/g;
    let match;
    let totalImageSize = 0;
    let imageCount = 0;
    
    while ((match = dataUrlRegex.exec(html)) !== null) {
      const base64Data = match[1];
      // Base64 is ~33% larger than binary, so divide by 1.33 to get approximate binary size
      const binarySize = (base64Data.length * 0.75);
      totalImageSize += binarySize;
      imageCount++;
    }
    
    const totalSize = htmlSize + totalImageSize;
    const percentage = (totalSize / maxSize) * 100;
    
    return {
      totalSize,
      htmlSize,
      imageSize: totalImageSize,
      imageCount,
      percentage: Math.min(percentage, 100),
      isWarning: percentage >= warningThreshold * 100,
      isError: percentage >= errorThreshold * 100,
    };
  }, [html, maxSize, warningThreshold, errorThreshold]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getStatusColor = (): 'success' | 'warning' | 'error' => {
    if (sizeInfo.isError) return 'error';
    if (sizeInfo.isWarning) return 'warning';
    return 'success';
  };

  const getStatusIcon = () => {
    if (sizeInfo.isError) return <ErrorIcon />;
    if (sizeInfo.isWarning) return <WarningIcon />;
    return <CheckCircleIcon />;
  };

  const getStatusMessage = (): string | null => {
    if (sizeInfo.isError) {
      return '警告: メールサイズが制限に近づいています。画像を削除するか、サイズを縮小してください。';
    }
    if (sizeInfo.isWarning) {
      return '注意: メールサイズが大きくなっています。';
    }
    return null;
  };

  return (
    <MonitorContainer>
      <SizeInfo>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon()}
          <Typography variant="body2" fontWeight="medium">
            メールサイズ
          </Typography>
        </Box>
        <Chip
          label={`${formatSize(sizeInfo.totalSize)} / ${formatSize(maxSize)}`}
          color={getStatusColor()}
          size="small"
        />
      </SizeInfo>

      <LinearProgress
        variant="determinate"
        value={sizeInfo.percentage}
        color={getStatusColor()}
        sx={{ mb: 1, height: 8, borderRadius: 4 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          HTML: {formatSize(sizeInfo.htmlSize)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          画像: {formatSize(sizeInfo.imageSize)} ({sizeInfo.imageCount}枚)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {sizeInfo.percentage.toFixed(1)}%
        </Typography>
      </Box>

      {getStatusMessage() && (
        <Alert severity={getStatusColor()} sx={{ mt: 1 }}>
          {getStatusMessage()}
          {sizeInfo.isError && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption">
                推奨アクション:
              </Typography>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                <li><Typography variant="caption">画像を削除する</Typography></li>
                <li><Typography variant="caption">画像を圧縮する</Typography></li>
                <li><Typography variant="caption">画像を添付ファイルとして送信する</Typography></li>
              </ul>
            </Box>
          )}
        </Alert>
      )}
    </MonitorContainer>
  );
};

export default EmailSizeMonitor;
