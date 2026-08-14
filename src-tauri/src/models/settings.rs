use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub id: String,
    pub company_name: String,
    pub email_configuration: String,
    pub whatsapp_configuration: String,
    pub message_template_configuration: String,
    pub created_at: String,
    pub updated_at: String,
}
