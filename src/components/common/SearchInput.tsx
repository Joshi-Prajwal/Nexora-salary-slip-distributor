import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange?: (value: string) => void;
  containerClassName?: string;
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  className = '',
  containerClassName = 'w-full max-w-2xl flex-1',
  onChange,
  onSearchChange,
  onClear,
  placeholder = 'Search employee name, employee ID, email, phone, or salary slip filename...',
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (onSearchChange) onSearchChange(e.target.value);
  };

  const handleClear = () => {
    if (onClear) onClear();
    if (onSearchChange) onSearchChange('');
  };

  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  return (
    <div className={`relative flex items-center ${containerClassName}`}>
      <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        className={`w-full pl-10 pr-9 h-11 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-2xs ${className}`}
        {...props}
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
