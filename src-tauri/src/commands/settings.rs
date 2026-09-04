use crate::database::connection::DbState;
use crate::database::repositories::SettingsRepository;
use crate::security::{redact_secret, sanitize_error_message};
use crate::messaging::email::{EmailProvider, SmtpEmailProvider};
use crate::messaging::whatsapp::{OfficialCloudApiWhatsAppProvider, WhatsAppProvider};
use crate::models::{
    AppSettingsResponse, ConnectionTestResult, EmailConfigResponse, SaveAppSettingsPayload,
    SaveEmailPayload, SaveWhatsAppPayload, WhatsAppConfigResponse,
};
use tauri::State;

#[tauri::command]
pub fn get_app_settings(
    state: State<'_, DbState>,
) -> Result<AppSettingsResponse, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let repo = SettingsRepository::new();
    repo.get_app_settings_response(&conn)
}

#[tauri::command]
pub fn save_app_settings(
    state: State<'_, DbState>,
    payload: SaveAppSettingsPayload,
) -> Result<AppSettingsResponse, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let repo = SettingsRepository::new();
    repo.save_all_settings(&conn, &payload)
}

#[tauri::command]
pub fn save_email_settings(
    state: State<'_, DbState>,
    payload: SaveEmailPayload,
) -> Result<EmailConfigResponse, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let repo = SettingsRepository::new();
    repo.save_email_config(&conn, &payload)?;

    let app_resp = repo.get_app_settings_response(&conn)?;
    Ok(app_resp.email_config)
}

#[tauri::command]
pub fn save_whatsapp_settings(
    state: State<'_, DbState>,
    payload: SaveWhatsAppPayload,
) -> Result<WhatsAppConfigResponse, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let repo = SettingsRepository::new();
    repo.save_whatsapp_config(&conn, &payload)?;

    let app_resp = repo.get_app_settings_response(&conn)?;
    Ok(app_resp.whatsapp_config)
}

#[tauri::command]
pub fn test_email_connection(
    state: State<'_, DbState>,
    _test_recipient: Option<String>,
) -> Result<ConnectionTestResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let repo = SettingsRepository::new();
    let config = repo.get_email_config(&conn)?;

    if config.host.trim().is_empty() || config.username.trim().is_empty() {
        return Ok(ConnectionTestResult {
            success: false,
            code: "EMAIL_NOT_CONFIGURED".to_string(),
            message: "SMTP Mail Server or Username is not configured. Please enter your email settings.".to_string(),
        });
    }

    let password = match config.password {
        Some(ref p) if !p.trim().is_empty() => p.trim(),
        _ => {
            return Ok(ConnectionTestResult {
                success: false,
                code: "EMAIL_NOT_CONFIGURED".to_string(),
                message: "SMTP password is not saved. Please enter your App Password and click Save Changes.".to_string(),
            });
        }
    };

    let from_addr = if !config.from_address.trim().is_empty() {
        config.from_address.trim()
    } else {
        config.username.trim()
    };

    let provider = SmtpEmailProvider::new();
    match provider.validate_configuration(
        &config.host,
        config.port,
        &config.username,
        password,
        from_addr,
    ) {
        Ok(_) => Ok(ConnectionTestResult {
            success: true,
            code: "EMAIL_TEST_SUCCESS".to_string(),
            message: format!("SMTP connection test successful for host {}!", config.host),
        }),
        Err(err) => Ok(ConnectionTestResult {
            success: false,
            code: "EMAIL_CONNECTION_FAILED".to_string(),
            message: format!("SMTP Connection test failed: {}", sanitize_error_message(&redact_secret(&err.to_string(), password))),
        }),
    }
}

#[tauri::command]
pub fn send_test_email(
    state: State<'_, DbState>,
    test_recipient: Option<String>,
) -> Result<ConnectionTestResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let repo = SettingsRepository::new();
    let config = repo.get_email_config(&conn)?;

    if config.host.trim().is_empty() || config.username.trim().is_empty() {
        return Ok(ConnectionTestResult {
            success: false,
            code: "EMAIL_NOT_CONFIGURED".to_string(),
            message: "SMTP Mail Server or Username is not configured. Please enter your email settings.".to_string(),
        });
    }

    let password = match config.password {
        Some(ref p) if !p.trim().is_empty() => p.trim(),
        _ => {
            return Ok(ConnectionTestResult {
                success: false,
                code: "EMAIL_NOT_CONFIGURED".to_string(),
                message: "SMTP password is not saved. Please enter your App Password and click Save Changes.".to_string(),
            });
        }
    };

    let from_addr = if !config.from_address.trim().is_empty() {
        config.from_address.trim()
    } else {
        config.username.trim()
    };

    let target_recipient = match test_recipient {
        Some(ref r) if !r.trim().is_empty() => r.trim(),
        _ => from_addr,
    };

    let provider = SmtpEmailProvider::new();
    match provider.send_test_email(
        &config.host,
        config.port,
        &config.username,
        password,
        from_addr,
        &config.from_name,
        target_recipient,
    ) {
        Ok(msg_id) => Ok(ConnectionTestResult {
            success: true,
            code: "EMAIL_TEST_SENT".to_string(),
            message: format!("Test email sent successfully to {}! ({})", target_recipient, msg_id),
        }),
        Err(err) => Ok(ConnectionTestResult {
            success: false,
            code: "EMAIL_SEND_FAILED".to_string(),
            message: format!("Failed to send test email: {}", sanitize_error_message(&redact_secret(&err.to_string(), password))),
        }),
    }
}

#[tauri::command]
pub fn test_whatsapp_connection(
    state: State<'_, DbState>,
) -> Result<ConnectionTestResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let repo = SettingsRepository::new();
    let config = repo.get_whatsapp_config(&conn)?;

    if config.api_url.trim().is_empty() || config.phone_number_id.trim().is_empty() {
        return Ok(ConnectionTestResult {
            success: false,
            code: "WHATSAPP_NOT_CONFIGURED".to_string(),
            message: "WhatsApp API Endpoint or Phone Number ID is not configured.".to_string(),
        });
    }

    let token = match config.api_token {
        Some(ref t) if !t.trim().is_empty() => t.trim(),
        _ => {
            return Ok(ConnectionTestResult {
                success: false,
                code: "WHATSAPP_NOT_CONFIGURED".to_string(),
                message: "WhatsApp Access Token is missing. Please enter your access token and click Save Changes.".to_string(),
            });
        }
    };

    let provider = OfficialCloudApiWhatsAppProvider::new();
    match provider.validate_configuration(&config.api_url, token, &config.phone_number_id) {
        Ok(_) => Ok(ConnectionTestResult {
            success: true,
            code: "WHATSAPP_TEST_SUCCESS".to_string(),
            message: "WhatsApp Business Cloud API configuration test successful!".to_string(),
        }),
        Err(err) => Ok(ConnectionTestResult {
            success: false,
            code: "WHATSAPP_CONNECTION_FAILED".to_string(),
            message: format!("WhatsApp connection test failed: {}", sanitize_error_message(&redact_secret(&err.to_string(), token))),
        }),
    }
}
