import React, { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useSalarySlipStore } from '../../stores/salarySlipStore';
import { useMatchingStore } from '../../stores/matchingStore';
import { Mail, MessageSquare, Send, ShieldAlert } from 'lucide-react';

export const SendingPage: React.FC = () => {
  const { slips } = useSalarySlipStore();
  const { matches } = useMatchingStore();
  const [selectedChannel, setSelectedChannel] = useState<'EMAIL' | 'WHATSAPP' | 'BOTH' | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const approvedSlips = slips.filter((s) => s.matchStatus === 'CONFIRMED' || s.matchStatus === 'READY');
  const pendingReviewSlips = matches.filter((m) => !m.confirmed);

  const handleStartSending = () => {
    if (approvedSlips.length > 0) {
      setIsConfirmOpen(true);
    }
  };

  const handleConfirmSend = () => {
    setIsConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send Salary Slips"
        subtitle="Send approved salary slips to employees by email or WhatsApp."
      />

      {/* Pre-Send Summary Card */}
      <Card title="Pre-Distribution Summary" subtitle="Review batch scope prior to sending">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-lg mb-4">
          <div>
            <span className="text-xs text-slate-500 font-medium">Approved & Ready to Send</span>
            <h4 className="text-xl font-bold text-slate-900 mt-0.5">{approvedSlips.length} slips</h4>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Pending Review</span>
            <h4 className="text-xl font-bold text-slate-700 mt-0.5">{pendingReviewSlips.length} slips</h4>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Selected Channel</span>
            <h4 className="text-xl font-bold text-sky-600 mt-0.5">
              {selectedChannel === 'EMAIL'
                ? 'Email'
                : selectedChannel === 'WHATSAPP'
                ? 'WhatsApp'
                : selectedChannel === 'BOTH'
                ? 'Email + WhatsApp'
                : 'Choose a channel'}
            </h4>
          </div>
        </div>

        {pendingReviewSlips.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{pendingReviewSlips.length} slips are pending human approval and will not be dispatched until reviewed.</span>
          </div>
        )}
      </Card>

      {/* Channel Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Select Delivery Channel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setSelectedChannel('EMAIL')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'EMAIL'
                ? 'bg-sky-50/60 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-sky-100 text-sky-700">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Email</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Email Delivery</h4>
            <p className="text-xs text-slate-500 mt-1">Send salary slips directly to employee email addresses.</p>
          </div>

          <div
            onClick={() => setSelectedChannel('WHATSAPP')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'WHATSAPP'
                ? 'bg-sky-50/60 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">WhatsApp</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">WhatsApp Delivery</h4>
            <p className="text-xs text-slate-500 mt-1">Send salary slips through your connected WhatsApp Business account.</p>
          </div>

          <div
            onClick={() => setSelectedChannel('BOTH')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'BOTH'
                ? 'bg-sky-50/60 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700">
                <Send className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Email + WhatsApp</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Both Email & WhatsApp</h4>
            <p className="text-xs text-slate-500 mt-1">Send salary slips through both available channels.</p>
          </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          icon={<Send className="w-4 h-4" />}
          disabled={approvedSlips.length === 0 || selectedChannel === null}
          onClick={handleStartSending}
        >
          Send Salary Slips
        </Button>
      </div>

      {/* Confirmation Step Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSend}
        title="Confirm Distribution Batch"
        message={`You are about to send ${approvedSlips.length} salary slips. Please ensure your provider configurations are active.`}
        confirmLabel="Confirm & Start Sending"
      />
    </div>
  );
};
