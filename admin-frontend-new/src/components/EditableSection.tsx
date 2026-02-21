import React, { useState } from 'react';
import { Box, CircularProgress, IconButton, Paper, Typography } from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';

interface EditableSectionProps {
  title: string;
  isEditMode: boolean;
  onEditToggle: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * EditableSection - セクション単位で編集可能なコンポーネント
 * 
 * 読み取り専用モードと編集モードを切り替え可能。
 * 編集モード時は保存・キャンセルボタンを表示。
 */
const EditableSection: React.FC<EditableSectionProps> = ({
  title,
  isEditMode,
  onEditToggle,
  onSave,
  onCancel,
  children,
  maxWidth,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      onEditToggle(); // 保存後に読み取り専用モードに戻る
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2, maxWidth }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{title}</Typography>
        <Box>
          {!isEditMode ? (
            <IconButton onClick={onEditToggle} size="medium" title="編集">
              <EditIcon sx={{ fontSize: '1.5rem' }} />
            </IconButton>
          ) : (
            <>
              <IconButton 
                onClick={handleSave} 
                size="medium" 
                disabled={isSaving}
                title="保存"
                color="primary"
              >
                {isSaving ? <CircularProgress size={24} /> : <SaveIcon sx={{ fontSize: '1.5rem' }} />}
              </IconButton>
              <IconButton 
                onClick={onCancel} 
                size="medium" 
                disabled={isSaving}
                title="キャンセル"
              >
                <CancelIcon sx={{ fontSize: '1.5rem' }} />
              </IconButton>
            </>
          )}
        </Box>
      </Box>
      {children}
    </Paper>
  );
};

export default EditableSection;
