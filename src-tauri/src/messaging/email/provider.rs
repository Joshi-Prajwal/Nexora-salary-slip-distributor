use crate::errors::AppError;

pub trait EmailProvider {
    fn send_email(&self, recipient_email: &str, subject: &str, body: &str) -> Result<String, AppError>;
    fn send_attachment(&self, recipient_email: &str, subject: &str, body: &str, file_path: &str) -> Result<String, AppError>;
    fn validate_configuration(&self) -> Result<bool, AppError>;
}

pub struct SmtpEmailProvider;

impl SmtpEmailProvider {
    pub fn new() -> Self {
        Self
    }
}

impl EmailProvider for SmtpEmailProvider {
    fn send_email(&self, recipient_email: &str, _subject: &str, _body: &str) -> Result<String, AppError> {
        println!("[Email Provider] Scaffolding SMTP email call for: {}", recipient_email);
        Ok("email_msg_id_placeholder".to_string())
    }

    fn send_attachment(&self, recipient_email: &str, _subject: &str, _body: &str, file_path: &str) -> Result<String, AppError> {
        println!("[Email Provider] Scaffolding attachment send for {} -> {}", file_path, recipient_email);
        Ok("email_attach_msg_id_placeholder".to_string())
    }

    fn validate_configuration(&self) -> Result<bool, AppError> {
        Ok(true)
    }
}
