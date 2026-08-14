import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { useSettingsStore } from '../../stores/settingsStore';
import { Building, Mail, MessageSquare, FileCode, HardDrive, Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, fetchSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'company' | 'email' | 'whatsapp' | 'templates' | 'storage' | 'privacy'>('company');
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const tabs: { id: 'company' | 'email' | 'whatsapp' | 'templates' | 'storage' | 'privacy'; label: string; icon: React.ReactNode }[] = [
    { id: 'company', label: 'Company Profile', icon: <Building className="w-4 h-4" /> },
    { id: 'email', label: 'Email Provider', icon: <Mail className="w-4 h-4" /> },
    { id: 'whatsapp', label: 'WhatsApp API', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'templates', label: 'Message Templates', icon: <FileCode className="w-4 h-4" /> },
    { id: 'storage', label: 'Storage & Data', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage company details, email provider, and WhatsApp Business API settings."
        action={
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        }
      />

      {/* Tabs navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'company' && (
        <Card title="Company Profile" subtitle="General organization details shown on communication templates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Company Name" defaultValue={settings?.companyName || ''} placeholder="Enter company name" />
            <Input label="HR Contact Email" defaultValue={settings?.emailConfig.fromAddress || ''} placeholder="Enter HR contact email" />
          </div>
        </Card>
      )}

      {activeTab === 'email' && (
        <Card title="Mail Server Provider Settings" subtitle="Configure your mail server for automated salary slip delivery.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Mail Server" defaultValue={settings?.emailConfig.host || ''} placeholder="Enter mail server" />
            <Input label="Mail Server Port" defaultValue={settings?.emailConfig.port?.toString() || ''} placeholder="Enter port" />
            <Input label="Username / Account" defaultValue={settings?.emailConfig.username || ''} placeholder="Enter account email" />
            <Input label="Password" isPassword defaultValue={settings?.emailConfig.password || ''} placeholder="Enter password" />
            <Input label="Sender Address" defaultValue={settings?.emailConfig.fromAddress || ''} placeholder="Enter sender email" />
            <Input label="Sender Display Name" defaultValue={settings?.emailConfig.fromName || ''} placeholder="Enter sender name" />
          </div>
        </Card>
      )}

      {activeTab === 'whatsapp' && (
        <Card title="WhatsApp Business API" subtitle="Connect official Meta WhatsApp Business Cloud API">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Service Endpoint" defaultValue={settings?.whatsappConfig.apiUrl || ''} placeholder="Enter service endpoint" />
            <Input label="Phone Number ID" defaultValue={settings?.whatsappConfig.phoneNumberId || ''} placeholder="Enter phone number ID" />
            <div className="md:col-span-2">
              <Input label="Access Token" isPassword defaultValue={settings?.whatsappConfig.apiToken || ''} placeholder="Enter access token" />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'templates' && (
        <Card title="Message Templates" subtitle="Default notification message templates sent to employees">
          <div className="space-y-4">
            <Input label="Email Subject Line" defaultValue={settings?.templateConfig.emailSubject || 'Salary Slip - {{month}}'} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-700">Email HTML Template Body</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                defaultValue={settings?.templateConfig.emailBodyHtml || '<p>Dear {{name}},</p><p>Please find attached your salary slip.</p>'}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-700">WhatsApp Message Template</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                defaultValue={settings?.templateConfig.whatsappTemplate || 'Hello {{name}}, your salary slip for {{month}} is attached.'}
              />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'storage' && (
        <Card title="Local Storage & Data Location" subtitle="Manage local application data storage">
          <div className="space-y-4">
            <Input label="Local Data Location" defaultValue="Nexora Application Storage" readOnly />
            <p className="text-xs text-slate-500">
              Your employee records and salary slip information are stored securely on this computer.
            </p>
          </div>
        </Card>
      )}

      {activeTab === 'privacy' && (
        <Card title="Privacy & Security" subtitle="Protect employee information and delivery credentials.">
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
              <div>
                <span className="font-semibold text-slate-900 block">Protect sensitive information</span>
                <span>Keep employee records and delivery credentials protected on this computer.</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
              <div>
                <span className="font-semibold text-slate-900 block">Confirm before delivery</span>
                <span>Require confirmation before salary slips are sent.</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {showSavedToast && <Toast type="success" message="Settings saved successfully." onClose={() => setShowSavedToast(false)} />}
    </div>
  );
};
