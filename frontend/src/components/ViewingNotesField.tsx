import React from 'react';
import { Box, TextField, Typography } from '@mui/material';

interface ViewingNotesFieldProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  isEditing?: boolean;
  buyerId?: string;
}

const ViewingNotesField: React.FC<ViewingNotesFieldProps> = ({
  value,
  onChange,
  disabled = false,
  isEditing,
  buyerId,
}) => {
  // 薄黄色の背景色
  const backgroundColor = '#FFF9E6';

  return (
    <Box sx={{ backgroundColor, p: 2, borderRadius: 1 }}>
      <TextField
        fullWidth
        multiline
        rows={3}
        label="内覧前伝達事項"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="内覧前に伝えたい事項を入力してください"
        variant="outlined"
        disabled={disabled}
        sx={{
          backgroundColor: 'white',
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'white',
          },
        }}
      />
    </Box>
  );
};

export default ViewingNotesField;
