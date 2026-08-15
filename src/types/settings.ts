import { EmailConfig, WhatsAppConfig, MessageTemplateConfig } from './messaging';

export interface ConnectionTestResult {
  success: boolean;
  code: string;
  message: string;
}

export interface AppSettings {
  id: string;
  companyName: string;
  emailConfig: EmailConfig;
  whatsappConfig: WhatsAppConfig;
  templateConfig: MessageTemplateConfig;
  autoProcessScan: boolean;
  minAutoMatchConfidence: number;
  createdAt: string;
  updatedAt: string;
}
