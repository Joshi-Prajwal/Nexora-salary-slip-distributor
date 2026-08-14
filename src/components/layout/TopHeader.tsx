import React from 'react';

export const TopHeader: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 z-10 shadow-2xs">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Nexora</h2>
      </div>
      <div className="flex items-center gap-3">
        {/* Clean application header bar */}
      </div>
    </header>
  );
};
