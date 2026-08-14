export type CommunicationChannel = 'WHATSAPP' | 'EMAIL' | 'BOTH';

export interface WhatsAppConfig {
  provider: 'official_cloud_api' | 'meta_business';
  apiUrl: string;
  apiToken: string;
  phoneNumberId: string;
  templateName?: string;
  enabled: boolean;
}

export interface EmailConfig {
  provider: 'smtp' | 'aws_ses' | 'sendgrid';
  host: string;
  port: number;
  username: string;
  password?: string;
  fromAddress: string;
  fromName: string;
  useTls: boolean;
  enabled: boolean;
}

export interface MessageTemplateConfig {
  whatsappTemplate: string;
  emailSubject: string;
  emailBodyHtml: string;
}
