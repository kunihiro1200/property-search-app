import React, { useRef, useEffect, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { FormatBold, FormatColorText } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

interface RichTextCommentEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const EditorContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  minHeight: '300px',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  cursor: 'text',
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    borderWidth: '2px',
    padding: `calc(${theme.spacing(2)} - 1px)`,
  },
  '&.disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    cursor: 'not-allowed',
  },
}));

const ContentEditable = styled('div')(({ theme }) => ({
  minHeight: '280px',
  outline: 'none',
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.body1.fontSize,
  lineHeight: 1.6,
  color: theme.palette.text.primary,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  '&:empty:before': {
    content: 'attr(data-placeholder)',
    color: theme.palette.text.disabled,
    pointerEvents: 'none',
  },
  // 太字タグのスタイルを明示的に適用
  '& b, & strong': {
    fontWeight: 'bold',
  },
  // 赤字のスタイルを明示的に適用
  '& font[color="red"]': {
    color: 'red',
  },
}));

const RichTextCommentEditor: React.FC<RichTextCommentEditorProps> = ({
  value,
  onChange,
  placeholder = 'コメントを入力...',
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

  // 太字ボタンのハンドラー
  const handleBold = () => {
    document.execCommand('bold', false);
    handleInput();
  };

  // 赤字ボタンのハンドラー
  const handleRedText = () => {
    document.execCommand('foreColor', false, 'red');
    handleInput();
  };

  return (
    <Box>
      {/* ツールバー */}
      <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
        <Tooltip title="太字">
          <IconButton size="small" onClick={handleBold} disabled={disabled}>
            <FormatBold />
          </IconButton>
        </Tooltip>
        <Tooltip title="赤字">
          <IconButton size="small" onClick={handleRedText} disabled={disabled}>
            <FormatColorText sx={{ color: 'red' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* エディタ */}
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
    </Box>
  );
};

export default RichTextCommentEditor;
