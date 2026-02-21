import { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Button,
  Typography,
  Link,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';

interface EditableUrlFieldProps {
  label: string;
  value: string | null;
  placeholder: string;
  urlPattern: RegExp;
  errorMessage: string;
  onSave: (newValue: string) => Promise<void>;
  disabled?: boolean;
  helperText?: string;
}

export default function EditableUrlField({
  label,
  value,
  placeholder,
  urlPattern,
  errorMessage,
  onSave,
  disabled = false,
  helperText,
}: EditableUrlFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setEditValue(value || '');
    setError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setError('');
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Validate
    const trimmedValue = editValue.trim();
    if (trimmedValue && !urlPattern.test(trimmedValue)) {
      setError(errorMessage);
      return;
    }

    try {
      setSaving(true);
      await onSave(trimmedValue);
      setIsEditing(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {value ? (
            <Link
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Typography variant="body2">{value}</Typography>
              <OpenInNewIcon fontSize="small" />
            </Link>
          ) : (
            <Typography variant="body2" color="text.secondary">
              未設定
            </Typography>
          )}
          {!disabled && (
            <IconButton size="small" onClick={handleEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        {helperText && (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        placeholder={placeholder}
        error={!!error}
        helperText={error || helperText}
        disabled={saving}
      />
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          保存
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={handleCancel}
          disabled={saving}
        >
          キャンセル
        </Button>
      </Box>
    </Box>
  );
}
