import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { useSettingsStore } from '../../stores/settingsStore';
import { Building, Mail, MessageSquare, FileCode, HardDrive, Shield, CheckCircle2, AlertTriangle, Key, Send } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    isSaving,
    fetchSettings,
    saveEmailConfig,
    saveWhatsAppConfig,
    updateSettings,
    testEmailConnection,
    sendTestEmail,
    testWhatsAppConnection,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'company' | 'email' | 'whatsapp' | 'templates' | 'storage' | 'privacy'>('company');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Company Profile form state
  const [companyName, setCompanyName] = useState('');
  const [hrEmail, setHrEmail] = useState('');

  // Email form state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpName, setSmtpName] = useState('');
  const [securityMode, setSecurityMode] = useState('STARTTLS');

  // WhatsApp form state
  const [waUrl, setWaUrl] = useState('');
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waToken, setWaToken] = useState('');

  // Templates form state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBodyHtml, setEmailBodyHtml] = useState('');
  const [whatsappTemplate, setWhatsappTemplate] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || '');
      setHrEmail(settings.emailConfig?.fromAddress || '');

      setSmtpHost(settings.emailConfig?.host || '');
      setSmtpPort(settings.emailConfig?.port ? settings.emailConfig.port.toString() : '587');
      setSmtpUser(settings.emailConfig?.username || '');
      setSmtpPass(settings.emailConfig?.hasPassword ? '••••••••' : '');
      setSmtpFrom(settings.emailConfig?.fromAddress || '');
      setSmtpName(settings.emailConfig?.fromName || '');
      setSecurityMode(settings.emailConfig?.securityMode || 'STARTTLS');

      setWaUrl(settings.whatsappConfig?.apiUrl || '');
      setWaPhoneId(settings.whatsappConfig?.phoneNumberId || '');
      setWaToken(settings.whatsappConfig?.hasAccessToken ? '••••••••' : '');

      setEmailSubject(settings.templateConfig?.emailSubject || '');
      setEmailBodyHtml(settings.templateConfig?.emailBodyHtml || '');
      setWhatsappTemplate(settings.templateConfig?.whatsappTemplate || '');
    }
  }, [settings, activeTab]);

  const handleSave = async () => {
    let success = false;

    if (activeTab === 'company') {
      success = await updateSettings({
        companyName,
        emailConfig: {
          ...settings?.emailConfig,
          fromAddress: hrEmail,
        } as any,
      });
    } else if (activeTab === 'email') {
      const portNum = parseInt(smtpPort, 10) || 587;
      success = await saveEmailConfig({
        host: smtpHost,
        port: portNum,
        username: smtpUser,
        password: smtpPass,
        fromAddress: smtpFrom,
        fromName: smtpName,
        securityMode,
        enabled: true,
      });
    } else if (activeTab === 'whatsapp') {
      success = await saveWhatsAppConfig({
        apiUrl: waUrl,
        phoneNumberId: waPhoneId,
        apiToken: waToken,
        enabled: true,
      });
    } else if (activeTab === 'templates') {
      success = await updateSettings({
        templateConfig: {
          emailSubject,
          emailBodyHtml,
          whatsappTemplate,
        },
      });
    } else {
      success = true;
    }

    if (success) {
      await fetchSettings();
      setToastType('success');
      setToastMessage('Configuration saved successfully and updated in backend database.');
    } else {
      setToastType('error');
      setToastMessage('Failed to save settings to backend database.');
    }
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    try {
      const res = await testEmailConnection();
      if (res.success) {
        setToastType('success');
        setToastMessage(`✓ ${res.message}`);
      } else {
        setToastType('error');
        setToastMessage(`✕ ${res.message}`);
      }
    } catch (_err) {
      setToastType('error');
      setToastMessage('SMTP Email connection test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const res = await sendTestEmail(smtpFrom || smtpUser);
      if (res.success) {
        setToastType('success');
        setToastMessage(`✓ ${res.message}`);
      } else {
        setToastType('error');
        setToastMessage(`✕ ${res.message}`);
      }
    } catch (_err) {
      setToastType('error');
      setToastMessage('Failed to transmit test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setIsTesting(true);
    try {
      const res = await testWhatsAppConnection();
      if (res.success) {
        setToastType('success');
        setToastMessage(`✓ ${res.message}`);
      } else {
        setToastType('warning');
        setToastMessage(`✕ ${res.message}`);
      }
    } catch (_err) {
      setToastType('error');
      setToastMessage('WhatsApp API connection test failed.');
    } finally {
      setIsTesting(false);
    }
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
        subtitle="Manage company profile, SMTP email server, and WhatsApp Business API settings."
        action={
          <Button variant="primary" isLoading={isSaving} disabled={isSaving || isTesting || isSendingTest} onClick={handleSave}>
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

      {/* Company Profile Tab */}
      {activeTab === 'company' && (
        <Card title="Company Profile" subtitle="General organization details shown on communication templates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corporation"
            />
            <Input
              label="HR Contact Email"
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              placeholder="e.g. hr@company.com"
            />
          </div>
        </Card>
      )}

      {/* Email Provider Tab */}
      {activeTab === 'email' && (
        <Card
          title="Mail Server Provider Settings"
          subtitle="Configure your SMTP mail server for automated salary slip delivery (e.g., Gmail, AWS SES, Custom SMTP)."
          action={
            <div className="flex items-center gap-3">
              {settings?.emailConfig?.configured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Configured & Saved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not Configured
                </span>
              )}
              <Button variant="outline" size="sm" isLoading={isTesting} disabled={isSaving || isTesting || isSendingTest} onClick={handleTestEmail}>
                Test Connection
              </Button>
              <Button variant="primary" size="sm" icon={<Send className="w-3.5 h-3.5" />} isLoading={isSendingTest} disabled={isSaving || isTesting || isSendingTest} onClick={handleSendTestEmail}>
                Send Test Email
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Mail Server (SMTP Host)"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="e.g. smtp.gmail.com"
            />
            <Input
              label="Mail Server Port"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              placeholder="e.g. 587"
            />
            <Input
              label="Username / Account Email"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="e.g. user@gmail.com"
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">App Password / Secret</label>
                {settings?.emailConfig?.hasPassword && (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Key className="w-3 h-3" /> Password Saved
                  </span>
                )}
              </div>
              <Input
                isPassword
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={settings?.emailConfig?.hasPassword ? '•••••••• (Leave blank to keep saved password)' : 'Enter App Password'}
              />
            </div>
            <Input
              label="Sender Email Address"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="e.g. user@gmail.com"
            />
            <Input
              label="Sender Display Name"
              value={smtpName}
              onChange={(e) => setSmtpName(e.target.value)}
              placeholder="e.g. Nexora HR"
            />
            <div className="md:col-span-2">
              <Select
                label="Security Mode"
                value={securityMode}
                onChange={(e) => setSecurityMode(e.target.value)}
                options={[
                  { value: 'STARTTLS', label: 'STARTTLS (Port 587 — Recommended for Gmail)' },
                  { value: 'SSL/TLS', label: 'SSL/TLS (Port 465)' },
                  { value: 'NONE', label: 'None / Plain Text' },
                ]}
              />
            </div>
          </div>
        </Card>
      )}

      {/* WhatsApp API Tab */}
      {activeTab === 'whatsapp' && (
        <Card
          title="WhatsApp Business API"
          subtitle="Connect Meta WhatsApp Business Cloud API"
          action={
            <div className="flex items-center gap-3">
              {settings?.whatsappConfig?.configured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Configured & Saved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not Configured
                </span>
              )}
              <Button variant="outline" size="sm" isLoading={isTesting} onClick={handleTestWhatsApp}>
                Test WhatsApp Connection
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Service Endpoint (API URL)"
              value={waUrl}
              onChange={(e) => setWaUrl(e.target.value)}
              placeholder="e.g. https://graph.facebook.com/v18.0"
            />
            <Input
              label="Phone Number ID"
              value={waPhoneId}
              onChange={(e) => setWaPhoneId(e.target.value)}
              placeholder="e.g. 100020003000"
            />
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">Access Token</label>
                {settings?.whatsappConfig?.hasAccessToken && (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Key className="w-3 h-3" /> Access Token Saved
                  </span>
                )}
              </div>
              <Input
                isPassword
                value={waToken}
                onChange={(e) => setWaToken(e.target.value)}
                placeholder={settings?.whatsappConfig?.hasAccessToken ? '•••••••• (Leave blank to keep saved token)' : 'Enter Meta Access Token'}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Message Templates Tab */}
      {activeTab === 'templates' && (
        <Card title="Message Templates" subtitle="Default notification message templates sent to employees">
          <div className="space-y-4">
            <Input
              label="Email Subject Line"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Salary Slip - {{month}} {{year}}"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-700">Email Body Template</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                value={emailBodyHtml}
                onChange={(e) => setEmailBodyHtml(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-700">WhatsApp Message Template</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                value={whatsappTemplate}
                onChange={(e) => setWhatsappTemplate(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Storage & Data Tab */}
      {activeTab === 'storage' && (
        <Card title="Local Storage & Data Location" subtitle="Manage local application data storage">
          <div className="space-y-4">
            <Input label="Local SQLite Database" defaultValue="nexora.db (Local Storage)" readOnly />
            <p className="text-xs text-slate-500">
              Employee records, salary slip details, and settings are stored locally in the application database.
            </p>
          </div>
        </Card>
      )}

      {/* Privacy & Security Tab */}
      {activeTab === 'privacy' && (
        <Card title="Privacy & Security" subtitle="Protect employee information and provider secrets.">
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" readOnly />
              <div>
                <span className="font-semibold text-slate-900 block">Secrets Protection</span>
                <span>SMTP Passwords and WhatsApp Access Tokens are stored securely in local SQLite and never exposed to browser context or logs.</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" readOnly />
              <div>
                <span className="font-semibold text-slate-900 block">Local Data Ownership</span>
                <span>All employee profiles, salary slip PDF files, and audit logs remain strictly on this device.</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {toastMessage && (
        <Toast
          type={toastType}
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};
