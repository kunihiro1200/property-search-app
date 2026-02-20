import React, { useRef, useEffect, useState } from 'react';
import { Box, FormHelperText, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

interface RichTextCommentEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
}

const EditorContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  minHeight: '100px',
  padding: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  cursor: 'text',
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    borderWidth: '2px',
    padding: `calc(${theme.spacing(1.5)} - 1px)`,
  },
  '&.disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    cursor: 'not-allowed',
  },
}));

const ContentEditable = styled('div')(({ theme }) => ({
  minHeight: '80px',
  outline: 'none',
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.body2.fontSize,
  lineHeight: 1.5,
  color: theme.palette.text.primary,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  '&:empty:before': {
    content: 'attr(data-placeholder)',
    color: theme.palette.text.disabled,
    pointerEvents: 'none',
  },
}));

const RichTextCommentEditor: React.FC<RichTextCommentEditorProps> = ({
  value,
  onChange,
  placeholder = 'コメントを入力...',
  helperText,
  disabled = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 初期値の設定
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // コンテンツ変更時のハンドラー
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  // フォーカス管理
  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // コンテナクリック時にエディタにフォーカス
  const handleContainerClick = () => {
    if (editorRef.current && !disabled) {
      editorRef.current.focus();
    }
  };

  return (
    <Box>
      <EditorContainer
        onClick={handleContainerClick}
        className={disabled ? 'disabled' : ''}
      >
        <ContentEditable
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
      </EditorContainer>
      {helperText && isFocused && (
        <FormHelperText>
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        </FormHelperText>
      )}
    </Box>
  );
};

export default RichTextCommentEditor;
