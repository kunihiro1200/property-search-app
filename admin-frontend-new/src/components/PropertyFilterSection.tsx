import { useState, useCallback } from 'react';
import {
  Paper,
  TextField,
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface PropertyFilterSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  showLinkedOnly: boolean;
  onToggleLinkedOnly: () => void;
  linkedCount: number;
  totalCount: number;
}

const PROPERTY_STATUSES = [
  '販売中',
  '商談中',
  '契約済',
  '引渡済',
  '販売停止',
  '取下げ',
];

export default function PropertyFilterSection({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  showLinkedOnly,
  onToggleLinkedOnly,
  linkedCount,
  totalCount,
}: PropertyFilterSectionProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce search input
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearchQuery(value);
      const timeoutId = setTimeout(() => {
        onSearchChange(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    },
    [onSearchChange]
  );

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      {/* Search input */}
      <TextField
        fullWidth
        size="small"
        placeholder="物件番号、所在地で検索"
        value={localSearchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Status filter */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>ステータス</InputLabel>
        <Select
          value={selectedStatus || ''}
          label="ステータス"
          onChange={(e) => onStatusChange(e.target.value || null)}
        >
          <MenuItem value="">
            <em>すべて</em>
          </MenuItem>
          {PROPERTY_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Linked-only toggle and count */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant={showLinkedOnly ? 'contained' : 'outlined'}
          onClick={onToggleLinkedOnly}
        >
          紐づく物件のみ ({linkedCount}件)
        </Button>
        <Typography variant="caption" color="text.secondary">
          全{totalCount}件
        </Typography>
      </Box>
    </Paper>
  );
}
