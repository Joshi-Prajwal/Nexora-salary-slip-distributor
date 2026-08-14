import { EmailConfig, WhatsAppConfig, MessageTemplateConfig } from './messaging';

export interface AppSettings {
  id: string;
  companyName: string;
  emailConfig: EmailConfig;
  whatsappConfig: WhatsAppConfig;
  templateConfig: MessageTemplateConfig;
  autoProcessScan: boolean;
  minAutoMatchConfidence: number; // default e.g. 0.85
  createdAt: string;
  updatedAt: string;
}
