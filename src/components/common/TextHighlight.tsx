import React from 'react';

interface TextHighlightProps {
  text: string;
  query: string;
  className?: string;
}

export const TextHighlight: React.FC<TextHighlightProps> = ({ text, query, className = '' }) => {
  if (!query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapeRegExp(query.trim())})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={index} className="bg-sky-100 text-sky-900 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};
