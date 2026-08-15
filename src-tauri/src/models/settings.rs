use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailConfig {
    pub provider: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    pub from_address: String,
    pub from_name: String,
    #[serde(default = "default_security_mode")]
    pub security_mode: String,
    pub use_tls: bool,
    pub enabled: bool,
}

fn default_security_mode() -> String {
    "STARTTLS".to_string()
}

impl Default for EmailConfig {
    fn default() -> Self {
        Self {
            provider: "smtp".to_string(),
            host: "".to_string(),
            port: 587,
            username: "".to_string(),
            password: None,
            from_address: "".to_string(),
            from_name: "".to_string(),
            security_mode: "STARTTLS".to_string(),
            use_tls: true,
            enabled: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhatsAppConfig {
    pub provider: String,
    pub api_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_token: Option<String>,
    pub phone_number_id: String,
    pub template_name: Option<String>,
    pub enabled: bool,
}

impl Default for WhatsAppConfig {
    fn default() -> Self {
        Self {
            provider: "official_cloud_api".to_string(),
            api_url: "".to_string(),
            api_token: None,
            phone_number_id: "".to_string(),
            template_name: None,
            enabled: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageTemplateConfig {
    pub whatsapp_template: String,
    pub email_subject: String,
    pub email_body_html: String,
}

impl Default for MessageTemplateConfig {
    fn default() -> Self {
        Self {
            whatsapp_template: "Hello {{name}}, your salary slip for {{month}} {{year}} is attached.".to_string(),
            email_subject: "Salary Slip - {{month}} {{year}}".to_string(),
            email_body_html: "Dear {{name}},\n\nPlease find attached your salary slip for {{month}} {{year}}.\n\nRegards,\n{{company_name}}".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub id: String,
    pub company_name: String,
    pub email_config: EmailConfig,
    pub whatsapp_config: WhatsAppConfig,
    pub template_config: MessageTemplateConfig,
    pub auto_process_scan: bool,
    pub min_auto_match_confidence: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Sanitized response models for sending to React frontend (NO PLAINTEXT SECRETS)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailConfigResponse {
    pub provider: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub has_password: bool,
    pub from_address: String,
    pub from_name: String,
    pub security_mode: String,
    pub use_tls: bool,
    pub enabled: bool,
    pub configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhatsAppConfigResponse {
    pub provider: String,
    pub api_url: String,
    pub has_access_token: bool,
    pub phone_number_id: String,
    pub template_name: Option<String>,
    pub enabled: bool,
    pub configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsResponse {
    pub id: String,
    pub company_name: String,
    pub email_config: EmailConfigResponse,
    pub whatsapp_config: WhatsAppConfigResponse,
    pub template_config: MessageTemplateConfig,
    pub auto_process_scan: bool,
    pub min_auto_match_confidence: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestResult {
    pub success: bool,
    pub code: String,
    pub message: String,
}

// Payloads received from frontend during Save operations
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveEmailPayload {
    pub host: Option<String>,
    pub port: Option<u16>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub from_address: Option<String>,
    pub from_name: Option<String>,
    pub security_mode: Option<String>,
    pub use_tls: Option<bool>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveWhatsAppPayload {
    pub api_url: Option<String>,
    pub api_token: Option<String>,
    pub phone_number_id: Option<String>,
    pub provider: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTemplatePayload {
    pub whatsapp_template: Option<String>,
    pub email_subject: Option<String>,
    pub email_body_html: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAppSettingsPayload {
    pub company_name: Option<String>,
    pub email_config: Option<SaveEmailPayload>,
    pub whatsapp_config: Option<SaveWhatsAppPayload>,
    pub template_config: Option<SaveTemplatePayload>,
    pub auto_process_scan: Option<bool>,
    pub min_auto_match_confidence: Option<f64>,
}
