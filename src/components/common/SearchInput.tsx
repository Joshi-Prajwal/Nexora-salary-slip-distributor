import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange?: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ className = '', onChange, onSearchChange, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (onSearchChange) onSearchChange(e.target.value);
  };

  return (
    <div className="relative flex items-center w-full max-w-xs">
      <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
      <input
        type="text"
        placeholder="Search..."
        onChange={handleChange}
        className={`w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all ${className}`}
        {...props}
      />
    </div>
  );
};
