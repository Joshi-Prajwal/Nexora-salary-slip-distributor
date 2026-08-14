import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: string;
  title: string;
  subtitle: string;
  status: 'completed' | 'current' | 'upcoming' | 'attention';
}

interface StepIndicatorProps {
  steps: StepItem[];
  onStepClick?: (stepId: string) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, onStepClick }) => {
  const getStepStyles = (status: StepItem['status']) => {
    switch (status) {
      case 'completed':
        return {
          badge: 'bg-emerald-600 text-white border-emerald-600',
          text: 'text-slate-900',
          sub: 'text-emerald-700 font-medium',
          icon: <Check className="w-4 h-4" />,
        };
      case 'current':
        return {
          badge: 'bg-sky-600 text-white border-sky-600 ring-4 ring-sky-100',
          text: 'text-slate-900 font-semibold',
          sub: 'text-sky-700 font-medium',
          icon: null,
        };
      case 'attention':
        return {
          badge: 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-100',
          text: 'text-slate-900 font-semibold',
          sub: 'text-amber-700 font-medium',
          icon: null,
        };
      default:
        return {
          badge: 'bg-white text-slate-400 border-slate-300',
          text: 'text-slate-500',
          sub: 'text-slate-400',
          icon: null,
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {steps.map((step, idx) => {
        const style = getStepStyles(step.status);

        return (
          <div
            key={step.id}
            onClick={() => onStepClick && onStepClick(step.id)}
            className={`flex items-start gap-3 p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs ${
              onStepClick ? 'cursor-pointer hover:border-sky-300 transition-all' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 ${style.badge}`}
            >
              {style.icon ? style.icon : idx + 1}
            </div>
            <div>
              <h4 className={`text-xs uppercase font-semibold tracking-wider ${style.text}`}>{step.title}</h4>
              <p className={`text-xs mt-0.5 ${style.sub}`}>{step.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
