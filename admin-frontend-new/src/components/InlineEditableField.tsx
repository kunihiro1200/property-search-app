import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Typography,
  CircularProgress,
  Tooltip,
  Autocomplete,
  ClickAwayListener,
  Modal,
  Backdrop,
} from '@mui/material';
import {
  Lock as LockIcon,
  Check as CheckIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import { useInlineEdit } from '../hooks/useInlineEdit';
import { ValidationRule, getValidationRulesForFieldType } from '../utils/fieldValidation';
import { FieldPermissions, getFieldMetadata } from '../types/fieldPermissions';
import { ConflictNotification } from './ConflictNotification';

export interface InlineEditableFieldProps {
  value: any;
  fieldName: string;
  fieldType: 'text' | 'email' | 'phone' | 'date' | 'time' | 'dropdown' | 'textarea' | 'number';
  onSave: (value: any) => Promise<void>;
  validation?: (value: any) => string | null;
  validationRules?: ValidationRule[];
  readOnly?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any; category?: string }>;
  multiline?: boolean;
  permissions?: FieldPermissions;
  label?: string;
  buyerId?: string;
  enableConflictDetection?: boolean;
  alwaysShowBorder?: boolean;  // 常に囲い枠を表示するかどうか
  borderPlaceholder?: string;  // 囲い枠内に表示するプレースホルダー
  showEditIndicator?: boolean;  // 編集可能インジケーターを常時表示するか（デフォルト: true）
  oneClickDropdown?: boolean;  // プルダウンを1クリックで開くか（デフォルト: false）
}

export const InlineEditableField: React.FC<InlineEditableFieldProps> = memo(({
  value,
  fieldName,
  fieldType,
  onSave,
  validation,
  validationRules,
  readOnly = false,
  placeholder = '',
  options = [],
  multiline = false,
  permissions,
  label,
  buyerId,
  enableConflictDetection = true,
  alwaysShowBorder = false,
  borderPlaceholder,
  showEditIndicator = true,
  oneClickDropdown = false,
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Cache field metadata to avoid repeated lookups
  const fieldMetadata = useMemo(() => getFieldMetadata(fieldName), [fieldName]);
  
  // Memoize effective permissions to prevent unnecessary recalculations
  const effectivePermissions = useMemo(
    () => permissions || fieldMetadata?.permissions || { canEdit: true },
    [permissions, fieldMetadata]
  );
  
  // Memoize effective read-only state
  const effectiveReadOnly = useMemo(
    () => readOnly || fieldMetadata?.readOnly || false,
    [readOnly, fieldMetadata]
  );

  // Cache validation rules to avoid repeated lookups
  const effectiveValidationRules = useMemo(
    () => validationRules || fieldMetadata?.validation || getValidationRulesForFieldType(fieldType, fieldName),
    [validationRules, fieldMetadata, fieldType, fieldName]
  );

  const {
    isEditing,
    editValue,
    error,
    isSaving,
    saveSuccess,
    hasConflict,
    conflictInfo,
    startEdit,
    cancelEdit,
    updateValue,
    saveValue,
    resolveConflict,
    clearConflict,
  } = useInlineEdit({
    initialValue: value,
    onSave,
    validation,
    validationRules: effectiveValidationRules,
    fieldName,
    buyerId,
    enableConflictDetection,
  });

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Check if field is editable
  const isEditable = useMemo(
    () => !effectiveReadOnly && effectivePermissions.canEdit,
    [effectiveReadOnly, effectivePermissions]
  );

  // Handle click to activate edit mode
  const handleClick = () => {
    if (!isEditable) return;
    
    if (fieldType === 'dropdown' && oneClickDropdown) {
      // プルダウンの1クリック編集が有効な場合は即座に開く
      setDropdownOpen(true);
    } else if (!isEditing) {
      // その他のフィールドは従来通り編集モードに入る
      startEdit();
    }
  };

  // Handle dropdown change with auto-save (for one-click dropdown)
  const handleDropdownChange = async (newValue: any) => {
    if (!oneClickDropdown) return;
    
    try {
      await onSave(newValue);
      setDropdownOpen(false);
    } catch (err) {
      console.error('Failed to save dropdown value:', err);
    }
  };

  // Handle blur to save
  const handleBlur = async () => {
    if (isEditing && !isSaving) {
      await saveValue();
    }
  };

  // Handle keyboard events
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
      return;
    }

    if (e.key === 'Enter') {
      if (fieldType === 'textarea') {
        return; // Allow line breaks in textarea
      } else {
        e.preventDefault();
        await saveValue();
        return;
      }
    }

    // テキストエリアで選択範囲がある場合、DeleteキーやBackspaceキーで選択範囲全体を削除
    if (fieldType === 'textarea' && (e.key === 'Delete' || e.key === 'Backspace')) {
      const target = e.target as HTMLTextAreaElement;
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      
      // 選択範囲がある場合（選択開始位置と終了位置が異なる）
      if (selectionStart !== selectionEnd) {
        e.preventDefault();
        
        // 選択範囲を削除
        const newValue = 
          editValue.substring(0, selectionStart) + 
          editValue.substring(selectionEnd);
        
        updateValue(newValue);
        
        // カーソル位置を選択開始位置に設定（次のレンダリング後）
        setTimeout(() => {
          if (inputRef.current) {
            (inputRef.current as HTMLTextAreaElement).setSelectionRange(selectionStart, selectionStart);
          }
        }, 0);
      }
    }
  };

  // Format display value
  const getDisplayValue = () => {
    if (value === null || value === undefined || value === '') {
      return borderPlaceholder || placeholder || '-';
    }

    if (fieldType === 'dropdown' && options.length > 0) {
      const option = options.find((opt) => opt.value === value);
      return option ? option.label : value;
    }

    if (fieldType === 'date' && value) {
      try {
        return new Date(value).toLocaleDateString('ja-JP');
      } catch {
        return value;
      }
    }

    return String(value);
  };

  // Render input based on field type
  const renderInput = () => {
    const commonProps = {
      inputRef: inputRef,
      value: editValue ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        updateValue(e.target.value),
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      placeholder,
      disabled: isSaving,
      error: !!error,
      helperText: error,
      fullWidth: true,
      size: 'small' as const,
      autoFocus: true,
      sx: { mt: 0.5 },
    };

    switch (fieldType) {
      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            minRows={6}
            maxRows={20}
            sx={{
              ...commonProps.sx,
              '& .MuiInputBase-root': {
                minHeight: alwaysShowBorder ? 120 : 80,
              },
            }}
          />
        );

      case 'dropdown':
        // Check if options have categories (for grouped dropdown)
        const hasCategories = options.some(opt => opt.category);
        
        if (hasCategories) {
          return (
            <Autocomplete
              fullWidth
              size="small"
              options={options}
              groupBy={(option) => option.category || ''}
              getOptionLabel={(option) => option.label}
              value={options.find(opt => opt.value === editValue) || null}
              onChange={(_, newValue) => updateValue(newValue?.value || '')}
              onBlur={handleBlur}
              disabled={isSaving}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={placeholder || '選択してください'}
                  error={!!error}
                  helperText={error}
                  sx={{ mt: 0.5 }}
                />
              )}
              renderGroup={(params) => (
                <li key={params.key}>
                  <Typography
                    component="div"
                    sx={{
                      position: 'sticky',
                      top: -8,
                      padding: '4px 10px',
                      color: 'primary.main',
                      backgroundColor: 'background.paper',
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                    }}
                  >
                    {params.group}
                  </Typography>
                  <ul style={{ padding: 0 }}>{params.children}</ul>
                </li>
              )}
              componentsProps={{
                popper: {
                  disablePortal: false,
                  placement: 'top-start',
                  sx: {
                    zIndex: 9999,
                  },
                },
                paper: {
                  sx: {
                    bgcolor: 'background.paper',
                    boxShadow: 5,
                    maxHeight: 400,
                  },
                },
              }}
            />
          );
        }

        return (
          <FormControl fullWidth size="small" sx={{ mt: 0.5 }} error={!!error}>
            <Select
              value={editValue ?? ''}
              onChange={(e) => updateValue(e.target.value)}
              onBlur={handleBlur}
              disabled={isSaving}
              MenuProps={{
                disablePortal: false,
                sx: {
                  zIndex: 9999,
                },
                PaperProps: {
                  sx: {
                    bgcolor: 'background.paper',
                    boxShadow: 5,
                    maxHeight: 400,
                  },
                },
                BackdropProps: {
                  sx: {
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  },
                },
                anchorOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
              }}
            >
              <MenuItem value="">選択してください</MenuItem>
              {options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {error}
              </Typography>
            )}
          </FormControl>
        );

      case 'date':
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              {...commonProps}
              type="date"
              InputLabelProps={{ shrink: true }}
              sx={{ ...commonProps.sx, flex: 1 }}
            />
            {editValue && (
              <Box
                onClick={async (e) => {
                  e.stopPropagation();
                  // 直接空文字で保存
                  try {
                    await onSave('');
                    setIsEditing(false);
                  } catch (err) {
                    console.error('Failed to delete date:', err);
                  }
                }}
                sx={{
                  mt: 0.5,
                  px: 1,
                  py: 0.5,
                  cursor: 'pointer',
                  color: 'error.main',
                  fontSize: '0.75rem',
                  border: '1px solid',
                  borderColor: 'error.main',
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                  },
                }}
              >
                削除
              </Box>
            )}
          </Box>
        );

      case 'time':
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              {...commonProps}
              type="time"
              InputLabelProps={{ shrink: true }}
              sx={{ ...commonProps.sx, flex: 1 }}
            />
            {editValue && (
              <Box
                onClick={async (e) => {
                  e.stopPropagation();
                  // 直接空文字で保存
                  try {
                    await onSave('');
                    setIsEditing(false);
                  } catch (err) {
                    console.error('Failed to delete time:', err);
                  }
                }}
                sx={{
                  mt: 0.5,
                  px: 1,
                  py: 0.5,
                  cursor: 'pointer',
                  color: 'error.main',
                  fontSize: '0.75rem',
                  border: '1px solid',
                  borderColor: 'error.main',
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                  },
                }}
              >
                削除
              </Box>
            )}
          </Box>
        );

      case 'number':
        return <TextField {...commonProps} type="number" />;

      case 'email':
        return <TextField {...commonProps} type="email" />;

      case 'phone':
        return <TextField {...commonProps} type="tel" />;

      case 'text':
      default:
        return <TextField {...commonProps} type="text" />;
    }
  };

  return (
    <Box sx={{ mb: 1 }}>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {label}
          {isEditing && !(fieldType === 'dropdown' && oneClickDropdown) && (
            <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }}>
              編集中
            </Typography>
          )}
        </Typography>
      )}
      
      {/* oneClickDropdownが有効な場合は編集モードをスキップ */}
      {isEditing && !(fieldType === 'dropdown' && oneClickDropdown) ? (
        <Box sx={{ position: 'relative' }}>
          {renderInput()}
          {isSaving && (
            <Box sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
              <CircularProgress size={16} />
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ position: 'relative' }}>
          {/* oneClickDropdownが有効な場合はAutocompleteを追加 */}
          {fieldType === 'dropdown' && oneClickDropdown ? (
            <ClickAwayListener onClickAway={() => setDropdownOpen(false)}>
              <Box sx={{ position: 'relative' }}>
                {/* 表示用のBox */}
                <Box
                  onClick={() => {
                    if (isEditable) {
                      setDropdownOpen(true);
                    }
                  }}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 1,
                    borderRadius: 1,
                    cursor: isEditable ? 'pointer' : 'default',
                    border: '1px solid',
                    borderColor: isEditable && showEditIndicator
                      ? (isHovered || dropdownOpen ? 'primary.main' : 'rgba(0, 0, 0, 0.23)')
                      : 'transparent',
                    bgcolor: isEditable && (isHovered || dropdownOpen) ? 'action.hover' : 
                             (isEditable && showEditIndicator ? 'background.paper' : 'transparent'),
                    transition: 'all 0.2s ease',
                    minHeight: 36,
                    '&:hover': isEditable ? {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    } : {},
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      color: (value === null || value === undefined || value === '') ? 'text.disabled' : 'text.primary',
                    }}
                  >
                    {getDisplayValue()}
                  </Typography>
                  
                  {isEditable && showEditIndicator && (
                    <ArrowDropDownIcon 
                      sx={{ 
                        ml: 0.5, 
                        fontSize: 20, 
                        color: isHovered || dropdownOpen ? 'primary.main' : 'text.secondary',
                        transition: 'color 0.2s ease',
                      }} 
                    />
                  )}
                  
                  {!isEditable && (
                    <Tooltip title={effectivePermissions.reason || '編集不可'}>
                      <LockIcon sx={{ ml: 1, fontSize: 16, color: 'text.disabled' }} />
                    </Tooltip>
                  )}
                </Box>
                
                {/* ドロップダウンをフィールド直下に表示 */}
                {dropdownOpen && (
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 10000,
                      mt: 0.5,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      boxShadow: 5,
                      maxHeight: 400,
                      overflow: 'auto',
                    }}
                  >
                    <Box sx={{ p: 1 }}>
                      <TextField
                        autoFocus
                        placeholder="検索..."
                        size="small"
                        fullWidth
                        sx={{ mb: 1 }}
                        onChange={(e) => {
                          // 検索フィルタリング用（オプション）
                        }}
                      />
                      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {options.map((option) => (
                          <Box
                            key={option.value}
                            onClick={() => {
                              handleDropdownChange(option.value);
                            }}
                            sx={{
                              px: 2,
                              py: 1,
                              cursor: 'pointer',
                              borderRadius: 1,
                              bgcolor: value === option.value ? 'action.selected' : 'transparent',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                            }}
                          >
                            <Typography variant="body2">{option.label}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </ClickAwayListener>
          ) : (
            <Box
              onClick={handleClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              sx={{
                display: 'flex',
                alignItems: (alwaysShowBorder || showEditIndicator) && fieldType === 'textarea' ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 1,
                borderRadius: 1,
                cursor: isEditable ? 'pointer' : 'default',
                border: '1px solid',
                // 編集可能フィールドには常時ボーダーを表示（showEditIndicator有効時）
                borderColor: isEditable && showEditIndicator
                  ? (isHovered ? 'primary.main' : 'rgba(0, 0, 0, 0.23)')
                  : (alwaysShowBorder 
                      ? (isEditable && isHovered ? 'primary.main' : 'rgba(0, 0, 0, 0.23)')
                      : (isEditable && isHovered ? 'primary.main' : 'transparent')),
                bgcolor: isEditable && isHovered ? 'action.hover' : 
                         (alwaysShowBorder || (isEditable && showEditIndicator) ? 'background.paper' : 'transparent'),
                transition: 'all 0.2s ease',
                minHeight: (alwaysShowBorder || showEditIndicator) && fieldType === 'textarea' ? 120 : 36,
                '&:hover': isEditable ? {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                } : {},
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: fieldType === 'textarea' ? 'pre-wrap' : 'normal',
                  wordBreak: 'break-word',
                  flex: 1,
                  color: (value === null || value === undefined || value === '') ? 'text.disabled' : 'text.primary',
                }}
              >
                {getDisplayValue()}
              </Typography>
              
              {/* ドロップダウンフィールドには常時矢印アイコンを表示 */}
              {isEditable && fieldType === 'dropdown' && showEditIndicator && (
                <ArrowDropDownIcon 
                  sx={{ 
                    ml: 0.5, 
                    fontSize: 20, 
                    color: isHovered ? 'primary.main' : 'text.secondary',
                    transition: 'color 0.2s ease',
                  }} 
                />
              )}
              
              {!isEditable && (
                <Tooltip title={effectivePermissions.reason || '編集不可'}>
                  <LockIcon sx={{ ml: 1, fontSize: 16, color: 'text.disabled' }} />
                </Tooltip>
              )}
              
              {/* oneClickDropdownが有効な場合は「クリックして編集」を非表示 */}
              {isEditable && isHovered && !(fieldType === 'dropdown' && oneClickDropdown) && (
                <Typography variant="caption" color="primary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                  クリックして編集
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Success message */}
      {saveSuccess && !isSaving && !error && (
        <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <CheckIcon sx={{ fontSize: 14, mr: 0.5 }} />
          保存しました
        </Typography>
      )}

      {/* Conflict notification */}
      {hasConflict && conflictInfo && (
        <ConflictNotification
          conflict={conflictInfo}
          fieldName={label || fieldName}
          onResolve={async (resolution) => {
            await resolveConflict(resolution);
          }}
          onCancel={() => {
            clearConflict();
            cancelEdit();
          }}
        />
      )}
    </Box>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.fieldName === nextProps.fieldName &&
    prevProps.fieldType === nextProps.fieldType &&
    prevProps.readOnly === nextProps.readOnly &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.multiline === nextProps.multiline &&
    prevProps.label === nextProps.label &&
    prevProps.buyerId === nextProps.buyerId &&
    prevProps.enableConflictDetection === nextProps.enableConflictDetection &&
    prevProps.alwaysShowBorder === nextProps.alwaysShowBorder &&
    prevProps.borderPlaceholder === nextProps.borderPlaceholder &&
    prevProps.showEditIndicator === nextProps.showEditIndicator &&
    prevProps.oneClickDropdown === nextProps.oneClickDropdown &&
    JSON.stringify(prevProps.options) === JSON.stringify(nextProps.options) &&
    JSON.stringify(prevProps.permissions) === JSON.stringify(nextProps.permissions)
  );
});
