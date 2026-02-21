import { useState, useMemo } from 'react';
import { Box, Link, IconButton, Tooltip } from '@mui/material';
import { ContentCopy as ContentCopyIcon, Check as CheckIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { generatePublicPropertyUrl, truncateUrl } from '../utils/publicUrlGenerator';

interface PublicUrlCellProps {
  propertyNumber: string | null;
  onCopy?: (url: string) => void;
}

export default function PublicUrlCell({ propertyNumber, onCopy }: PublicUrlCellProps) {
  const [copied, setCopied] = useState(false);

  // URLを生成（メモ化）
  const url = useMemo(
    () => {
      const generatedUrl = propertyNumber ? generatePublicPropertyUrl(propertyNumber) : null;
      console.log('[PublicUrlCell] Generated URL:', { propertyNumber, url: generatedUrl });
      return generatedUrl;
    },
    [propertyNumber]
  );

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopy?.(url);
      
      // 3秒後にアイコンを元に戻す
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      
      // フォールバック: テキストエリアを使用
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        setCopied(true);
        onCopy?.(url);
        setTimeout(() => setCopied(false), 3000);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
    }
  };

  // 物件番号が存在しない場合は「-」を表示
  if (!url) {
    return (
      <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        -
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={url} placement="top">
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            fontSize: '0.875rem',
            maxWidth: 150,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            color: 'primary.main',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {truncateUrl(url)}
        </Link>
      </Tooltip>
      <Tooltip title="新しいタブで開く" placement="top">
        <IconButton
          size="small"
          component="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          sx={{
            padding: 0.25,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={copied ? 'コピーしました' : 'URLをコピー'} placement="top">
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{
            padding: 0.25,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          {copied ? (
            <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
          ) : (
            <ContentCopyIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
