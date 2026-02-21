import React, { useRef, useEffect, useState } from 'react';
import { Box, FormHelperText, Typography, CircularProgress, Snackbar, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

interface RichTextEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  maxImageSize?: number;
  maxTotalImageSize?: number;
  onError?: (error: string) => void;
}

const EditorContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  minHeight: '200px',
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
  minHeight: '180px',
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
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
    margin: '10px 0',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
}));

const RichTextEmailEditor: React.FC<RichTextEmailEditorProps> = ({
  value,
  onChange,
  placeholder = 'メール本文を入力...',
  helperText = 'Ctrl+Vで画像を貼り付けられます（カーソル位置に挿入）',
  disabled = false,
  maxImageSize = 5 * 1024 * 1024, // 5MB
  maxTotalImageSize = 10 * 1024 * 1024, // 10MB
  onError,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // 画像ペーストハンドラー
  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    // 画像アイテムを探す
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        event.preventDefault(); // デフォルトのペースト動作を防ぐ
        
        const file = item.getAsFile();
        if (file) {
          // ペースト時の選択範囲を保存
          const selection = window.getSelection();
          let savedRange: Range | null = null;
          
          if (selection && selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0).cloneRange();
            console.log('🔍 [Paste] Selection saved:', {
              startContainer: savedRange.startContainer,
              startOffset: savedRange.startOffset,
              endOffset: savedRange.endOffset,
              collapsed: savedRange.collapsed
            });
          } else {
            console.warn('⚠️ [Paste] No selection found at paste time');
          }
          
          await insertImageAtCursor(file, savedRange);
        }
        break;
      }
    }
  };

  // カーソル位置に画像を挿入
  const insertImageAtCursor = async (file: File, savedRange?: Range | null): Promise<void> => {
    try {
      setIsProcessing(true);

      // 1. ファイルサイズの検証
      if (file.size > maxImageSize) {
        const error = '画像サイズが5MBを超えています';
        setErrorMessage(error);
        if (onError) onError(error);
        return;
      }

      // 2. 既存画像の合計サイズをチェック
      const existingImages = editorRef.current?.querySelectorAll('img') || [];
      let currentTotalSize = 0;
      
      // Base64データURLの長さから概算サイズを計算
      Array.from(existingImages).forEach((img) => {
        const dataUrl = (img as HTMLImageElement).src;
        if (dataUrl.startsWith('data:')) {
          // Base64は元のバイナリより約33%大きい
          currentTotalSize += (dataUrl.length * 0.75);
        }
      });

      if (currentTotalSize + file.size > maxTotalImageSize) {
        const error = '合計画像サイズが10MBを超えています';
        setErrorMessage(error);
        if (onError) onError(error);
        return;
      }

      // 3. ファイルをData URLとして読み込む
      const dataUrl = await readFileAsDataURL(file);

      // 4. エディタにフォーカスを戻す
      if (editorRef.current) {
        editorRef.current.focus();
      }

      // 5. 選択範囲を復元または取得
      let range: Range;
      
      if (savedRange) {
        // 保存された選択範囲を使用
        console.log('✅ [Insert] Using saved range');
        range = savedRange;
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          console.log('✅ [Insert] Range restored to selection');
        }
      } else {
        // 現在の選択範囲を取得
        console.log('⚠️ [Insert] No saved range, getting current selection');
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          // フォールバック: エディタの最後に追加
          console.warn('⚠️ [Insert] No selection available, appending to end');
          if (editorRef.current) {
            range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false); // 最後に移動
            console.log('📍 [Insert] Created range at end of editor');
          } else {
            const error = 'カーソル位置が取得できませんでした';
            setErrorMessage(error);
            if (onError) onError(error);
            return;
          }
        } else {
          range = selection.getRangeAt(0);
          console.log('✅ [Insert] Got current range');
        }
      }

      // 6. img要素を作成
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = `pasted-image-${Date.now()}`;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '10px 0';
      img.style.border = '1px solid #ddd';
      img.style.borderRadius = '4px';

      // 7. カーソル位置に挿入
      console.log('📍 [Insert] Inserting image at range position');
      range.deleteContents();
      range.insertNode(img);
      console.log('✅ [Insert] Image inserted, parent:', img.parentNode?.nodeName);

      // 8. カーソルを画像の後ろに移動
      range.setStartAfter(img);
      range.setEndAfter(img);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // 9. 変更を親コンポーネントに通知
      if (editorRef.current) {
        console.log('📤 [Insert] Notifying parent of HTML change');
        onChange(editorRef.current.innerHTML);
      }
    } catch (error) {
      const errorMsg = '画像の読み込みに失敗しました';
      setErrorMessage(errorMsg);
      if (onError) onError(errorMsg);
      console.error('Image insertion error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // FileをBase64 Data URLとして読み込む
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as data URL'));
        }
      };

      reader.onerror = () => {
        reject(new Error('FileReader error'));
      };

      reader.readAsDataURL(file);
    });
  };

  // エラーメッセージを閉じる
  const handleCloseError = () => {
    setErrorMessage(null);
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
          onPaste={handlePaste}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
        {isProcessing && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
      </EditorContainer>
      {helperText && isFocused && (
        <FormHelperText>
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        </FormHelperText>
      )}
      
      {/* エラー通知 */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={4000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RichTextEmailEditor;
