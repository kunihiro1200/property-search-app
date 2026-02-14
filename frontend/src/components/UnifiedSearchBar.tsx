import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import './UnifiedSearchBar.css';

interface UnifiedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
}

export const UnifiedSearchBar: React.FC<UnifiedSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '所在地で検索',
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (inputRef.current && clearButtonRef.current && value) {
      // 入力テキストの幅を計算
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        const computedStyle = window.getComputedStyle(inputRef.current);
        context.font = computedStyle.font;
        const textWidth = context.measureText(value).width;
        
        // ☓ボタンの位置を更新（パディング + テキスト幅 + 余白）
        clearButtonRef.current.style.left = `${16 + textWidth + 8}px`;
      }
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
    } else if (e.key === 'Escape') {
      onChange('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="物件検索"
      className={`unified-search-bar ${className}`}
    >
      <div className="search-input-wrapper">
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="検索キーワードを入力"
            className="search-input"
          />
          {value && (
            <button
              ref={clearButtonRef}
              type="button"
              onClick={handleClear}
              aria-label="検索をクリア"
              className="clear-button"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          type="submit"
          aria-label="検索を実行"
          className="search-button"
        >
          <Search size={20} />
          <span className="search-button-text">検索</span>
        </button>
      </div>
    </form>
  );
};

export default UnifiedSearchBar;
