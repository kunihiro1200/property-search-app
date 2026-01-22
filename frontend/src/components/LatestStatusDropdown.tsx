import React from 'react';
import { Autocomplete, TextField, Typography, Box } from '@mui/material';

interface LatestStatusDropdownProps {
  value: string | null;
  isEditing: boolean;
  onChange: (value: string) => void;
  options?: string[];
}

const DEFAULT_OPTIONS = [
  '内覧予定',
  '内覧済み',
  '申込検討中',
  '申込済み',
  '契約予定',
  '契約済み',
  '見送り',
  '他社決定',
  '予算オーバー',
  '条件不一致',
  '連絡待ち',
  '再内覧希望',
  '資料送付済み',
  '追加情報待ち',
  '検討中',
  'その他',
];

const LatestStatusDropdown: React.FC<LatestStatusDropdownProps> = ({
  value,
  isEditing,
  onChange,
  options = DEFAULT_OPTIONS,
}) => {
  if (isEditing) {
    return (
      <Autocomplete
        freeSolo
        options={options}
        value={value || ''}
        onChange={(_, newValue) => {
          onChange(newValue || '');
        }}
        onInputChange={(_, newInputValue) => {
          onChange(newInputValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="最新状況"
            placeholder="状況を選択または入力"
            variant="outlined"
            fullWidth
          />
        )}
      />
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        最新状況
      </Typography>
      <Typography variant="body2">
        {value || '（未設定）'}
      </Typography>
    </Box>
  );
};

export default LatestStatusDropdown;
