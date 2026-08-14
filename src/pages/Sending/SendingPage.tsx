import React, { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Alert } from '../../components/common/Alert';
import { Mail, MessageSquare, Send, ShieldAlert } from 'lucide-react';

export const SendingPage: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<'EMAIL' | 'WHATSAPP' | 'BOTH'>('EMAIL');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleStartSending = () => {
    setIsConfirmOpen(true);
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
            <h4 className="text-xl font-bold text-slate-900 mt-0.5">118 slips</h4>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Pending Review</span>
            <h4 className="text-xl font-bold text-amber-600 mt-0.5">3 slips</h4>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Selected Channel</span>
            <h4 className="text-xl font-bold text-sky-600 mt-0.5">
              {selectedChannel === 'EMAIL'
                ? 'Email Only'
                : selectedChannel === 'WHATSAPP'
                ? 'WhatsApp Only'
                : 'Both Email & WhatsApp'}
            </h4>
          </div>
        </div>

        <Alert type="warning">
          <div className="flex items-center gap-2 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>3 slips are pending human approval and will not be dispatched until reviewed.</span>
          </div>
        </Alert>
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
              <span className="text-xs font-semibold text-slate-500">SMTP Provider</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Email Delivery</h4>
            <p className="text-xs text-slate-500 mt-1">Send PDF attachments directly to employee email addresses.</p>
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
              <span className="text-xs font-semibold text-slate-500">Official Cloud API</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">WhatsApp Delivery</h4>
            <p className="text-xs text-slate-500 mt-1">Dispatch documents via authorized WhatsApp Business API.</p>
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
              <span className="text-xs font-semibold text-slate-500">Dual Channel</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Both Email & WhatsApp</h4>
            <p className="text-xs text-slate-500 mt-1">Send via both configured channels simultaneously.</p>
          </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="primary" size="lg" icon={<Send className="w-4 h-4" />} onClick={handleStartSending}>
          Send 118 Salary Slips
        </Button>
      </div>

      {/* Confirmation Step Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSend}
        title="Confirm Distribution Batch"
        message="You are about to send 118 salary slips to employee recipients. Please ensure your provider configurations are active."
        confirmLabel="Confirm & Start Sending"
      />
    </div>
  );
};
