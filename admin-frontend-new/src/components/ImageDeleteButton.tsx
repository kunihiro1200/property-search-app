import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface ImageDeleteButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

const ImageDeleteButton: React.FC<ImageDeleteButtonProps> = ({
  onClick,
  disabled = false,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックイベントを防止
    onClick(e);
  };

  return (
    <Tooltip title="画像を削除">
      <IconButton
        onClick={handleClick}
        disabled={disabled}
        size="small"
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          color: 'error.main',
          '&:hover': {
            bgcolor: 'error.main',
            color: 'white',
          },
          '&.Mui-disabled': {
            bgcolor: 'rgba(255, 255, 255, 0.5)',
          },
          zIndex: 1,
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default ImageDeleteButton;
