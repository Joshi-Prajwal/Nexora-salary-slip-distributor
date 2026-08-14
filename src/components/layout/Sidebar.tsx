import React from 'react';
import { useAppStore, ActivePage } from '../../stores/appStore';
import { LayoutDashboard, Users, FileText, CheckSquare, Send, Clock, Settings } from 'lucide-react';

const primaryNav: { id: ActivePage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'salary-slips', label: 'Salary Slips', icon: FileText },
  { id: 'review', label: 'Review', icon: CheckSquare },
  { id: 'send', label: 'Send', icon: Send },
  { id: 'history', label: 'History', icon: Clock },
];

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage } = useAppStore();

  return (
    <aside className="w-60 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-screen select-none z-20">
      <div>
        {/* Nexora Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3">
          <img
            src="/branding/nexora-logo.png"
            alt="Nexora"
            className="w-8 h-8 rounded-lg shadow-xs object-cover"
          />
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">Nexora</h1>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Salary Slip Distributor</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Navigation
          </div>
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold border border-sky-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Secondary Nav & Footer */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => setActivePage('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activePage === 'settings'
              ? 'bg-sky-50 text-sky-700 font-semibold border border-sky-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Settings className={`w-4 h-4 ${activePage === 'settings' ? 'text-sky-600' : 'text-slate-400'}`} />
          <span>Settings</span>
        </button>

        <div className="mt-4 pt-3 border-t border-slate-100 px-3 flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-medium text-slate-500">System Ready</span>
        </div>
      </div>
    </aside>
  );
};
