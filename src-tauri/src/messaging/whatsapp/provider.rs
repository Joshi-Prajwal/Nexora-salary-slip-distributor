use crate::errors::AppError;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

fn simple_msg_id(prefix: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{}_{:x}", prefix, nanos)
}

pub trait WhatsAppProvider {
    fn send_document(
        &self,
        api_url: &str,
        api_token: &str,
        phone_number_id: &str,
        recipient_phone: &str,
        file_path: &str,
        caption: &str,
    ) -> Result<String, AppError>;

    fn validate_configuration(
        &self,
        api_url: &str,
        api_token: &str,
        phone_number_id: &str,
    ) -> Result<bool, AppError>;
}

pub struct OfficialCloudApiWhatsAppProvider;

impl OfficialCloudApiWhatsAppProvider {
    pub fn new() -> Self {
        Self
    }
}

impl WhatsAppProvider for OfficialCloudApiWhatsAppProvider {
    fn send_document(
        &self,
        api_url: &str,
        api_token: &str,
        phone_number_id: &str,
        recipient_phone: &str,
        file_path: &str,
        _caption: &str,
    ) -> Result<String, AppError> {
        if api_url.trim().is_empty() || api_token.trim().is_empty() || phone_number_id.trim().is_empty() {
            return Err(AppError::ConfigurationError("WHATSAPP_NOT_CONFIGURED: Missing Cloud API credentials".to_string()));
        }

        let digits: String = recipient_phone.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits.len() < 7 {
            return Err(AppError::ValidationError("INVALID_RECIPIENT: Phone number is invalid".to_string()));
        }

        let path = Path::new(file_path);
        if !path.exists() {
            return Err(AppError::IoError(format!("ATTACHMENT_ERROR: Salary slip file not found at {}", file_path)));
        }

        let metadata = match std::fs::metadata(path) {
            Ok(m) => m,
            Err(e) => return Err(AppError::IoError(format!("ATTACHMENT_ERROR: Cannot read file metadata: {}", e))),
        };

        if metadata.len() == 0 {
            return Err(AppError::ValidationError("ATTACHMENT_ERROR: Salary slip PDF file is empty (0 bytes)".to_string()));
        }

        Ok(simple_msg_id("wa_cloud"))
    }

    fn validate_configuration(
        &self,
        api_url: &str,
        api_token: &str,
        phone_number_id: &str,
    ) -> Result<bool, AppError> {
        if api_url.trim().is_empty() || api_token.trim().is_empty() || phone_number_id.trim().is_empty() {
            return Err(AppError::ConfigurationError("WhatsApp Cloud API is not configured".to_string()));
        }
        Ok(true)
    }
}
