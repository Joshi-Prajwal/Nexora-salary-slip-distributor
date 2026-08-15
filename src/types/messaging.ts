export type CommunicationChannel = 'WHATSAPP' | 'EMAIL' | 'BOTH';

export interface WhatsAppConfig {
  provider: string;
  apiUrl: string;
  apiToken?: string;
  hasAccessToken?: boolean;
  phoneNumberId: string;
  templateName?: string;
  enabled: boolean;
  configured?: boolean;
}

export interface EmailConfig {
  provider: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  hasPassword?: boolean;
  fromAddress: string;
  fromName: string;
  securityMode?: string;
  useTls: boolean;
  enabled: boolean;
  configured?: boolean;
}

export interface MessageTemplateConfig {
  whatsappTemplate: string;
  emailSubject: string;
  emailBodyHtml: string;
}
