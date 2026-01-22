import React from 'react';
import { Search } from 'lucide-react';
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

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="物件検索"
      className={`unified-search-bar ${className}`}
    >
      <div className="search-input-wrapper">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="検索キーワードを入力"
          className="search-input"
        />
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
