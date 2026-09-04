use crate::errors::AppError;
use crate::security::{redact_secret, sanitize_error_message};
use lettre::message::{header::ContentType, Attachment, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

fn simple_msg_id(prefix: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{}_{:x}", prefix, nanos)
}

pub fn replace_placeholders(
    template: &str,
    employee_name: &str,
    employee_id: &str,
    company_name: &str,
    month: &str,
    year: &str,
) -> String {
    template
        .replace("{{employee_name}}", employee_name)
        .replace("{{name}}", employee_name)
        .replace("{{employee_id}}", employee_id)
        .replace("{{company_name}}", company_name)
        .replace("{{month}}", month)
        .replace("{{year}}", year)
}

pub trait EmailProvider {
    fn send_salary_slip(
        &self,
        host: &str,
        port: u16,
        username: &str,
        password: &str,
        from_address: &str,
        from_name: &str,
        to_address: &str,
        subject: &str,
        body: &str,
        attachment_path: &str,
    ) -> Result<String, AppError>;

    fn send_test_email(
        &self,
        host: &str,
        port: u16,
        username: &str,
        password: &str,
        from_address: &str,
        from_name: &str,
        to_address: &str,
    ) -> Result<String, AppError>;

    fn validate_configuration(
        &self,
        host: &str,
        port: u16,
        username: &str,
        password: &str,
        from_address: &str,
    ) -> Result<bool, AppError>;
}

pub struct SmtpEmailProvider;

impl SmtpEmailProvider {
    pub fn new() -> Self {
        Self
    }

    fn build_transport(
        &self,
        host: &str,
        port: u16,
        username: &str,
        password: &str,
    ) -> Result<SmtpTransport, AppError> {
        let host_trim = host.trim();
        let user_trim = username.trim();
        let pwd_trim = password.trim();

        if host_trim.is_empty() || user_trim.is_empty() || pwd_trim.is_empty() {
            return Err(AppError::ConfigurationError(
                "SMTP_NOT_CONFIGURED: Missing host, username, or password".to_string(),
            ));
        }

        let creds = Credentials::new(user_trim.to_string(), pwd_trim.to_string());

        if port == 465 {
            SmtpTransport::relay(host_trim)
                .map_err(|e| AppError::ProviderError(format!("SMTP_CONNECT_FAILED: {}", e)))
                .map(|b| b.port(port).credentials(creds).build())
        } else {
            SmtpTransport::starttls_relay(host_trim)
                .map_err(|e| AppError::ProviderError(format!("SMTP_CONNECT_FAILED: {}", e)))
                .map(|b| b.port(port).credentials(creds).build())
        }
    }
}

impl EmailProvider for SmtpEmailProvider {
    fn send_salary_slip(
        &self,
        host: &str,
        port: u16,
        username: &str,
        password: &str,
        from_address: &str,
        from_name: &str,
        to_address: &str,
        subject: &str,
        body: &str,
        attachment_path: &str,
    ) -> Result<String, AppError> {
        let host_trim = host.trim();
        let user_trim = username.trim();
        let from_trim = from_address.trim();
        let to_trim = to_address.trim();

        if host_trim.is_empty() || user_trim.is_empty() || password.trim().is_empty() {
            return Err(AppError::ConfigurationError(
                "SMTP_NOT_CONFIGURED: Missing SMTP host, username, or password".to_string(),
            ));
        }

        if to_trim.is_empty() || !to_trim.contains('@') {
            return Err(AppError::ValidationError(
                "INVALID_RECIPIENT: Email address is invalid".to_string(),
            ));
        }

        let path = Path::new(attachment_path);
        if !path.exists() {
            return Err(AppError::IoError(format!(
                "ATTACHMENT_ERROR: PDF file not found at {}",
                attachment_path
            )));
        }

        let pdf_bytes = match fs::read(path) {
            Ok(bytes) => bytes,
            Err(e) => {
                return Err(AppError::IoError(format!(
                    "ATTACHMENT_ERROR: Could not read PDF file: {}",
                    e
                )));
            }
        };

        if pdf_bytes.is_empty() {
            return Err(AppError::ValidationError(
                "ATTACHMENT_ERROR: Salary slip PDF is empty (0 bytes)".to_string(),
            ));
        }

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("salary_slip.pdf");

        let from_header = if !from_name.trim().is_empty() {
            format!("{} <{}>", from_name.trim(), from_trim)
        } else {
            from_trim.to_string()
        };

        let email_builder = Message::builder()
            .from(match from_header.parse() {
                Ok(f) => f,
                Err(_) => match from_trim.parse() {
                    Ok(f) => f,
                    Err(e) => {
                        return Err(AppError::ValidationError(format!(
                            "SMTP_MAIL_FROM_FAILED: Invalid From email address: {}",
                            e
                        )));
                    }
                },
            })
            .to(match to_trim.parse() {
                Ok(t) => t,
                Err(e) => {
                    return Err(AppError::ValidationError(format!(
                        "SMTP_RCPT_TO_FAILED: Invalid recipient email address: {}",
                        e
                    )));
                }
            })
            .subject(if subject.trim().is_empty() { "Salary Slip" } else { subject });

        let body_part = SinglePart::plain(body.to_string());
        let content_type = ContentType::parse("application/pdf").unwrap_or(ContentType::TEXT_PLAIN);
        let attachment_part = Attachment::new(file_name.to_string()).body(pdf_bytes, content_type);

        let email_msg = match email_builder.multipart(MultiPart::mixed().singlepart(body_part).singlepart(attachment_part)) {
            Ok(msg) => msg,
            Err(e) => {
                return Err(AppError::ExtractionError(format!(
                    "SMTP_DATA_FAILED: Failed to construct MIME email: {}",
                    e
                )));
            }
        };

        let transport = self.build_transport(host_trim, port, user_trim, password)?;

        match transport.send(&email_msg) {
            Ok(response) => {
                let msg_id = simple_msg_id("smtp");
                let resp_str = response.message().collect::<Vec<_>>().join(" ");
                if resp_str.is_empty() {
                    Ok(msg_id)
                } else {
                    Ok(format!("{}: {}", msg_id, resp_str))
                }
            }
            Err(e) => {
                let err_str = e.to_string();
                if err_str.contains("authentication") || err_str.contains("535") || err_str.contains("Auth") {
                    Err(AppError::ProviderError(
                        "SMTP_AUTH_FAILED: Authentication failed. Check your Gmail App Password.".to_string(),
                    ))
                } else if err_str.contains("connect") || err_str.contains("Connection") {
                    Err(AppError::ProviderError(format!(
                        "SMTP_CONNECT_FAILED: Could not connect to mail server {}:{}.",
                        host_trim, port
                    )))
                } else {
                    let clean_err = sanitize_error_message(&redact_secret(&err_str, password));
                    Err(AppError::ProviderError(format!("SMTP_SEND_FAILED: {}", clean_err)))
                }
            }
        }
    }

    fn send_test_email(
        &self,
        host: &str,
        port: u16,
        username: &str,
        password: &str,
        from_address: &str,
        from_name: &str,
        to_address: &str,
    ) -> Result<String, AppError> {
        let host_trim = host.trim();
        let user_trim = username.trim();
        let from_trim = if from_address.trim().is_empty() { user_trim } else { from_address.trim() };
        let to_trim = if to_address.trim().is_empty() { from_trim } else { to_address.trim() };

        if host_trim.is_empty() || user_trim.is_empty() || password.trim().is_empty() {
            return Err(AppError::ConfigurationError(
                "SMTP_NOT_CONFIGURED: Missing SMTP host, username, or password".to_string(),
            ));
        }

        let from_header = if !from_name.trim().is_empty() {
            format!("{} <{}>", from_name.trim(), from_trim)
        } else {
            from_trim.to_string()
        };

        let email_builder = Message::builder()
            .from(match from_header.parse() {
                Ok(f) => f,
                Err(_) => match from_trim.parse() {
                    Ok(f) => f,
                    Err(e) => {
                        return Err(AppError::ValidationError(format!(
                            "SMTP_MAIL_FROM_FAILED: Invalid From email address: {}",
                            e
                        )));
                    }
                },
            })
            .to(match to_trim.parse() {
                Ok(t) => t,
                Err(e) => {
                    return Err(AppError::ValidationError(format!(
                        "SMTP_RCPT_TO_FAILED: Invalid recipient email address: {}",
                        e
                    )));
                }
            })
            .subject("Nexora Email Delivery Test");

        let body_part = SinglePart::plain("Nexora email delivery test successful.\n\nThis is a real test email sent from your Nexora Salary Slip Distributor desktop application.".to_string());

        let email_msg = match email_builder.singlepart(body_part) {
            Ok(msg) => msg,
            Err(e) => {
                return Err(AppError::ExtractionError(format!(
                    "SMTP_DATA_FAILED: Failed to construct test email: {}",
                    e
                )));
            }
        };

        let transport = self.build_transport(host_trim, port, user_trim, password)?;

        match transport.send(&email_msg) {
            Ok(response) => {
                let msg_id = simple_msg_id("test_smtp");
                let resp_str = response.message().collect::<Vec<_>>().join(" ");
                if resp_str.is_empty() {
                    Ok(msg_id)
                } else {
                    Ok(format!("{}: {}", msg_id, resp_str))
                }
            }
            Err(e) => {
                let err_str = e.to_string();
                if err_str.contains("authentication") || err_str.contains("535") || err_str.contains("Auth") {
                    Err(AppError::ProviderError(
                        "SMTP_AUTH_FAILED: Authentication failed. Check your Gmail App Password.".to_string(),
                    ))
                } else if err_str.contains("connect") || err_str.contains("Connection") {
                    Err(AppError::ProviderError(format!(
                        "SMTP_CONNECT_FAILED: Could not connect to mail server {}:{}.",
                        host_trim, port
                    )))
                } else {
                    let clean_err = sanitize_error_message(&redact_secret(&err_str, password));
                    Err(AppError::ProviderError(format!("SMTP_SEND_FAILED: {}", clean_err)))
                }
            }
        }
    }

    fn validate_configuration(
        &self,
        host: &str,
        port: u16,
        username: &str,
        password: &str,
        _from_address: &str,
    ) -> Result<bool, AppError> {
        let transport = self.build_transport(host, port, username, password)?;

        match transport.test_connection() {
            Ok(is_ok) => {
                if is_ok {
                    Ok(true)
                } else {
                    Err(AppError::ProviderError(
                        "SMTP_CONNECT_FAILED: Connection test returned false".to_string(),
                    ))
                }
            }
            Err(e) => {
                let err_str = e.to_string();
                if err_str.contains("authentication") || err_str.contains("535") || err_str.contains("Auth") {
                    Err(AppError::ProviderError(
                        "SMTP_AUTH_FAILED: Authentication failed. Verify App Password.".to_string(),
                    ))
                } else {
                    let clean_err = sanitize_error_message(&redact_secret(&err_str, password));
                    Err(AppError::ProviderError(format!(
                        "SMTP_CONNECT_FAILED: Failed to connect to SMTP server: {}",
                        clean_err
                    )))
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_provider_validation() {
        let provider = SmtpEmailProvider::new();
        let invalid = provider.validate_configuration("", 587, "", "", "");
        assert!(invalid.is_err());
    }
}
