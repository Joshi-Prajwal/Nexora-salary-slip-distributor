use crate::errors::AppError;

pub trait WhatsAppProvider {
    fn send_message(&self, recipient_phone: &str, message: &str) -> Result<String, AppError>;
    fn send_document(&self, recipient_phone: &str, file_path: &str, caption: &str) -> Result<String, AppError>;
    fn get_status(&self, message_id: &str) -> Result<String, AppError>;
}

pub struct OfficialCloudApiWhatsAppProvider;

impl OfficialCloudApiWhatsAppProvider {
    pub fn new() -> Self {
        Self
    }
}

impl WhatsAppProvider for OfficialCloudApiWhatsAppProvider {
    fn send_message(&self, recipient_phone: &str, _message: &str) -> Result<String, AppError> {
        println!("[WhatsApp Provider] Scaffolding official WhatsApp API call for: {}", recipient_phone);
        Ok("msg_id_placeholder".to_string())
    }

    fn send_document(&self, recipient_phone: &str, file_path: &str, _caption: &str) -> Result<String, AppError> {
        println!("[WhatsApp Provider] Scaffolding document send for {} -> {}", file_path, recipient_phone);
        Ok("doc_msg_id_placeholder".to_string())
    }

    fn get_status(&self, _message_id: &str) -> Result<String, AppError> {
        Ok("DELIVERED".to_string())
    }
}
