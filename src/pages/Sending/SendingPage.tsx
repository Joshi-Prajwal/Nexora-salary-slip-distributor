import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Toast } from '../../components/common/Toast';
import { useSalarySlipStore } from '../../stores/salarySlipStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { useAppStore } from '../../stores/appStore';
import { DeliveryBatchSummary, DeliveryPreview } from '../../types/delivery';
import { Mail, MessageSquare, Send, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';

export const SendingPage: React.FC = () => {
  const { setActivePage } = useAppStore();
  const { slips, fetchSalarySlips } = useSalarySlipStore();
  const {
    isSending,
    progress,
    previewBatch,
    sendBatch,
    cancelBatch,
  } = useDeliveryStore();

  const [selectedChannel, setSelectedChannel] = useState<'EMAIL' | 'WHATSAPP' | 'BOTH' | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<DeliveryPreview | null>(null);
  const [batchSummary, setBatchSummary] = useState<DeliveryBatchSummary | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSalarySlips();
  }, [fetchSalarySlips]);

  const approvedSlips = slips.filter(
    (s) => s.approvalStatus === 'APPROVED' || s.matchStatus === 'MANUALLY_CONFIRMED'
  );

  const pendingReviewSlips = slips.filter(
    (s) => s.approvalStatus === 'PENDING' || (s.approvalStatus !== 'APPROVED' && s.matchStatus !== 'MANUALLY_CONFIRMED')
  );

  const handleOpenPreview = async () => {
    if (!selectedChannel || approvedSlips.length === 0) return;
    const slipIds = approvedSlips.map((s) => s.id);
    const prev = await previewBatch(slipIds, selectedChannel);
    if (prev) {
      setActivePreview(prev);
      setIsPreviewModalOpen(true);
    }
  };

  const handleConfirmSend = async () => {
    setIsPreviewModalOpen(false);
    if (!selectedChannel || approvedSlips.length === 0) return;
    const slipIds = approvedSlips.map((s) => s.id);
    const summary = await sendBatch(slipIds, selectedChannel);
    if (summary) {
      setBatchSummary(summary);
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

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
            <span className="text-xs text-slate-500 font-medium">Pending Review / Unapproved</span>
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

        {approvedSlips.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-3.5 rounded-lg border border-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>0 salary slips are approved. Please go to the Review & Matching page to confirm and approve salary slips before sending.</span>
          </div>
        )}

        {pendingReviewSlips.length > 0 && approvedSlips.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-100 p-3 rounded-lg border border-slate-200">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{pendingReviewSlips.length} slips are pending approval and will be safely excluded from delivery.</span>
          </div>
        )}
      </Card>

      {/* Channel Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Select Delivery Channel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => !isSending && setSelectedChannel('EMAIL')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'EMAIL'
                ? 'bg-sky-50/60 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-sky-100 text-sky-700">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Email</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Email Delivery</h4>
            <p className="text-xs text-slate-500 mt-1">Send original salary slips as attachments to employee email addresses.</p>
          </div>

          <div
            onClick={() => !isSending && setSelectedChannel('WHATSAPP')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'WHATSAPP'
                ? 'bg-sky-50/60 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-300">
                  NOT CONFIGURED
                </span>
                <span className="text-xs font-semibold text-slate-500">WhatsApp</span>
              </div>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">WhatsApp Delivery</h4>
            <p className="text-xs text-slate-500 mt-1">Official Meta WhatsApp Cloud API integration (Cloud API credentials not configured yet).</p>
          </div>

          <div
            onClick={() => !isSending && setSelectedChannel('BOTH')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'BOTH'
                ? 'bg-sky-50/60 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700">
                <Send className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Email + WhatsApp</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Both Email & WhatsApp</h4>
            <p className="text-xs text-slate-500 mt-1">Attempt independent delivery through both available channels.</p>
          </div>
        </div>
      </div>

      {/* Progress UI Bar when sending */}
      {isSending && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">Sending salary slips...</span>
              <span className="font-mono font-bold text-slate-900">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sky-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>{progress.currentName}</span>
              <Button variant="ghost" size="sm" onClick={cancelBatch}>
                Cancel Batch
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          icon={<Send className="w-4 h-4" />}
          disabled={approvedSlips.length === 0 || selectedChannel === null || isSending}
          isLoading={isSending}
          onClick={handleOpenPreview}
        >
          Send Salary Slips ({approvedSlips.length})
        </Button>
      </div>

      {/* Pre-Send Validation Modal */}
      {isPreviewModalOpen && activePreview && (
        <ConfirmDialog
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          onConfirm={handleConfirmSend}
          title="Confirm Salary Slip Batch Send"
          confirmLabel="Confirm & Start Sending"
          message={`You are about to send ${approvedSlips.length} approved salary slips via ${selectedChannel}.`}
        >
          <div className="space-y-3 pt-3 text-xs text-slate-700">
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="text-slate-500 block">Eligible Slips</span>
                <span className="font-bold text-emerald-800">{activePreview.eligibleCount}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Estimated Deliveries</span>
                <span className="font-bold text-slate-900">{activePreview.estimatedDeliveries}</span>
              </div>
              {activePreview.alreadySentCount > 0 && (
                <div>
                  <span className="text-slate-500 block">Already Sent (Skipped)</span>
                  <span className="font-bold text-amber-700">{activePreview.alreadySentCount}</span>
                </div>
              )}
              {activePreview.missingEmailCount > 0 && (
                <div>
                  <span className="text-slate-500 block">Missing Email</span>
                  <span className="font-bold text-rose-700">{activePreview.missingEmailCount}</span>
                </div>
              )}
              {activePreview.missingWhatsappCount > 0 && (
                <div>
                  <span className="text-slate-500 block">Missing Phone</span>
                  <span className="font-bold text-rose-700">{activePreview.missingWhatsappCount}</span>
                </div>
              )}
            </div>
          </div>
        </ConfirmDialog>
      )}

      {/* Batch Completion Summary Modal */}
      {batchSummary && (
        <ConfirmDialog
          isOpen={!!batchSummary}
          onClose={() => setBatchSummary(null)}
          onConfirm={() => {
            setBatchSummary(null);
            setActivePage('history');
          }}
          title="Delivery Batch Complete"
          confirmLabel="View History"
          cancelLabel="Done"
          message={`Completed batch execution for ${batchSummary.total} salary slips.`}
        >
          <div className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sent Successfully: <strong>{batchSummary.sent}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Failed: <strong>{batchSummary.failed}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Already Sent / Skipped: <strong>{batchSummary.skipped}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-sky-600" />
                <span>Total Scope: <strong>{batchSummary.total}</strong></span>
              </div>
            </div>
          </div>
        </ConfirmDialog>
      )}

      {toastMessage && (
        <Toast type="info" message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
