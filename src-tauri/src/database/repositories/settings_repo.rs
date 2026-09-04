use rusqlite::{params, Connection, Result};
use crate::security::CredentialStore;
use crate::models::{
    AppSettingsResponse, EmailConfig, EmailConfigResponse, MessageTemplateConfig, SaveAppSettingsPayload,
    SaveEmailPayload, SaveTemplatePayload, SaveWhatsAppPayload, WhatsAppConfig, WhatsAppConfigResponse,
};
use std::time::{SystemTime, UNIX_EPOCH};

fn current_timestamp() -> String {
    let start = SystemTime::now();
    let since = start.duration_since(UNIX_EPOCH).unwrap_or_default();
    format!("{}", since.as_secs())
}

pub struct SettingsRepository;

impl SettingsRepository {
    pub fn new() -> Self {
        Self
    }

    pub fn get_value(&self, conn: &Connection, key: &str) -> Result<Option<String>, String> {
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = ?1")
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![key], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;

        if let Some(row) = rows.next() {
            row.map(Some).map_err(|e| e.to_string())
        } else {
            Ok(None)
        }
    }

    pub fn set_value(&self, conn: &Connection, key: &str, value: &str) -> Result<(), String> {
        let now = current_timestamp();
        conn.execute(
            r#"
            INSERT INTO settings (key, value, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3
            "#,
            params![key, value, now],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_company_name(&self, conn: &Connection) -> Result<String, String> {
        Ok(self.get_value(conn, "company_name")?.unwrap_or_default())
    }

    pub fn save_company_name(&self, conn: &Connection, name: &str) -> Result<(), String> {
        self.set_value(conn, "company_name", name)
    }

    pub fn get_email_config(&self, conn: &Connection) -> Result<EmailConfig, String> {
        if let Some(json_str) = self.get_value(conn, "email_config")? {
            if let Ok(mut config) = serde_json::from_str::<EmailConfig>(&json_str) {
                if let Some(ref pwd) = config.password {
                    if let Ok(decrypted) = CredentialStore::unprotect_secret(pwd) {
                        config.password = Some(decrypted);
                    }
                }
                return Ok(config);
            }
        }
        Ok(EmailConfig::default())
    }

    pub fn save_email_config(
        &self,
        conn: &Connection,
        payload: &SaveEmailPayload,
    ) -> Result<EmailConfig, String> {
        let mut current = self.get_email_config(conn)?;

        if let Some(ref host) = payload.host {
            current.host = host.trim().to_string();
        }
        if let Some(port) = payload.port {
            if port > 0 {
                current.port = port;
            }
        }
        if let Some(ref username) = payload.username {
            current.username = username.trim().to_string();
        }

        if let Some(ref pwd) = payload.password {
            let p_trim = pwd.trim();
            if !p_trim.is_empty()
                && p_trim != "••••••••"
                && p_trim != "••••••••••"
                && p_trim != "[Saved]"
            {
                current.password = Some(p_trim.to_string());
            }
        }

        if let Some(ref from_addr) = payload.from_address {
            current.from_address = from_addr.trim().to_string();
        }
        if let Some(ref from_name) = payload.from_name {
            current.from_name = from_name.trim().to_string();
        }
        if let Some(ref sec_mode) = payload.security_mode {
            current.security_mode = sec_mode.trim().to_string();
        }
        if let Some(use_tls) = payload.use_tls {
            current.use_tls = use_tls;
        }
        if let Some(enabled) = payload.enabled {
            current.enabled = enabled;
        } else {
            current.enabled = !current.host.is_empty() && !current.username.is_empty();
        }

        // Encrypt password before persisting to SQLite
        let mut to_store = current.clone();
        if let Some(ref p) = to_store.password {
            if let Ok(enc) = CredentialStore::protect_secret(p) {
                to_store.password = Some(enc);
            }
        }

        let json_str = serde_json::to_string(&to_store).map_err(|e| e.to_string())?;
        self.set_value(conn, "email_config", &json_str)?;

        Ok(current)
    }

    pub fn get_whatsapp_config(&self, conn: &Connection) -> Result<WhatsAppConfig, String> {
        if let Some(json_str) = self.get_value(conn, "whatsapp_config")? {
            if let Ok(mut config) = serde_json::from_str::<WhatsAppConfig>(&json_str) {
                if let Some(ref tok) = config.api_token {
                    if let Ok(decrypted) = CredentialStore::unprotect_secret(tok) {
                        config.api_token = Some(decrypted);
                    }
                }
                return Ok(config);
            }
        }
        Ok(WhatsAppConfig::default())
    }

    pub fn save_whatsapp_config(
        &self,
        conn: &Connection,
        payload: &SaveWhatsAppPayload,
    ) -> Result<WhatsAppConfig, String> {
        let mut current = self.get_whatsapp_config(conn)?;

        if let Some(ref url) = payload.api_url {
            current.api_url = url.trim().to_string();
        }
        if let Some(ref token) = payload.api_token {
            let t_trim = token.trim();
            if !t_trim.is_empty()
                && t_trim != "••••••••"
                && t_trim != "••••••••••"
                && t_trim != "[Saved]"
            {
                current.api_token = Some(t_trim.to_string());
            }
        }
        if let Some(ref phone_id) = payload.phone_number_id {
            current.phone_number_id = phone_id.trim().to_string();
        }
        if let Some(ref provider) = payload.provider {
            current.provider = provider.trim().to_string();
        }
        if let Some(enabled) = payload.enabled {
            current.enabled = enabled;
        } else {
            current.enabled = !current.api_url.is_empty() && !current.phone_number_id.is_empty();
        }

        // Encrypt token before persisting to SQLite
        let mut to_store = current.clone();
        if let Some(ref tok) = to_store.api_token {
            if let Ok(enc) = CredentialStore::protect_secret(tok) {
                to_store.api_token = Some(enc);
            }
        }

        let json_str = serde_json::to_string(&to_store).map_err(|e| e.to_string())?;
        self.set_value(conn, "whatsapp_config", &json_str)?;

        Ok(current)
    }

    pub fn get_template_config(&self, conn: &Connection) -> Result<MessageTemplateConfig, String> {
        if let Some(json_str) = self.get_value(conn, "template_config")? {
            if let Ok(config) = serde_json::from_str::<MessageTemplateConfig>(&json_str) {
                return Ok(config);
            }
        }
        Ok(MessageTemplateConfig::default())
    }

    pub fn save_template_config(
        &self,
        conn: &Connection,
        payload: &SaveTemplatePayload,
    ) -> Result<MessageTemplateConfig, String> {
        let mut current = self.get_template_config(conn)?;

        if let Some(ref wa_tpl) = payload.whatsapp_template {
            current.whatsapp_template = wa_tpl.to_string();
        }
        if let Some(ref email_subj) = payload.email_subject {
            current.email_subject = email_subj.to_string();
        }
        if let Some(ref email_body) = payload.email_body_html {
            current.email_body_html = email_body.to_string();
        }

        let json_str = serde_json::to_string(&current).map_err(|e| e.to_string())?;
        self.set_value(conn, "template_config", &json_str)?;

        Ok(current)
    }

    pub fn get_app_settings_response(
        &self,
        conn: &Connection,
    ) -> Result<AppSettingsResponse, String> {
        let company_name = self.get_company_name(conn)?;
        let email_config = self.get_email_config(conn)?;
        let whatsapp_config = self.get_whatsapp_config(conn)?;
        let template_config = self.get_template_config(conn)?;

        let has_email_password = email_config
            .password
            .as_deref()
            .map(|p| !p.trim().is_empty())
            .unwrap_or(false);

        let email_configured = !email_config.host.trim().is_empty()
            && !email_config.username.trim().is_empty()
            && has_email_password;

        let email_resp = EmailConfigResponse {
            provider: email_config.provider,
            host: email_config.host,
            port: email_config.port,
            username: email_config.username,
            has_password: has_email_password,
            from_address: email_config.from_address,
            from_name: email_config.from_name,
            security_mode: email_config.security_mode,
            use_tls: email_config.use_tls,
            enabled: email_config.enabled,
            configured: email_configured,
        };

        let has_whatsapp_token = whatsapp_config
            .api_token
            .as_deref()
            .map(|t| !t.trim().is_empty())
            .unwrap_or(false);

        let whatsapp_configured = !whatsapp_config.api_url.trim().is_empty()
            && !whatsapp_config.phone_number_id.trim().is_empty()
            && has_whatsapp_token;

        let wa_resp = WhatsAppConfigResponse {
            provider: whatsapp_config.provider,
            api_url: whatsapp_config.api_url,
            has_access_token: has_whatsapp_token,
            phone_number_id: whatsapp_config.phone_number_id,
            template_name: whatsapp_config.template_name,
            enabled: whatsapp_config.enabled,
            configured: whatsapp_configured,
        };

        let now = current_timestamp();

        Ok(AppSettingsResponse {
            id: "settings-primary".to_string(),
            company_name,
            email_config: email_resp,
            whatsapp_config: wa_resp,
            template_config,
            auto_process_scan: true,
            min_auto_match_confidence: 0.85,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn save_all_settings(
        &self,
        conn: &Connection,
        payload: &SaveAppSettingsPayload,
    ) -> Result<AppSettingsResponse, String> {
        if let Some(ref name) = payload.company_name {
            self.save_company_name(conn, name)?;
        }
        if let Some(ref email_payload) = payload.email_config {
            self.save_email_config(conn, email_payload)?;
        }
        if let Some(ref wa_payload) = payload.whatsapp_config {
            self.save_whatsapp_config(conn, wa_payload)?;
        }
        if let Some(ref tpl_payload) = payload.template_config {
            self.save_template_config(conn, tpl_payload)?;
        }

        self.get_app_settings_response(conn)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            "#,
        )
        .unwrap();
        conn
    }

    #[test]
    fn test_email_config_save_and_preserve_password() {
        let conn = setup_test_db();
        let repo = SettingsRepository::new();

        // 1. Initial save with password
        let payload1 = SaveEmailPayload {
            host: Some("smtp.gmail.com".into()),
            port: Some(587),
            username: Some("user@gmail.com".into()),
            password: Some("secret_app_password".into()),
            from_address: Some("user@gmail.com".into()),
            from_name: Some("Nexora".into()),
            security_mode: Some("STARTTLS".into()),
            use_tls: Some(true),
            enabled: Some(true),
        };
        let saved1 = repo.save_email_config(&conn, &payload1).unwrap();
        assert_eq!(saved1.password.as_deref(), Some("secret_app_password"));

        // 2. Subsequent save with masked password string
        let payload2 = SaveEmailPayload {
            host: Some("smtp.gmail.com".into()),
            port: Some(587),
            username: Some("user@gmail.com".into()),
            password: Some("••••••••".into()), // Masked input from UI
            from_address: Some("user@gmail.com".into()),
            from_name: Some("Nexora".into()),
            security_mode: Some("STARTTLS".into()),
            use_tls: Some(true),
            enabled: Some(true),
        };
        let saved2 = repo.save_email_config(&conn, &payload2).unwrap();
        assert_eq!(saved2.password.as_deref(), Some("secret_app_password"));

        // 3. Verify sanitized AppSettingsResponse hides password but sets has_password = true
        let resp = repo.get_app_settings_response(&conn).unwrap();
        assert_eq!(resp.email_config.host, "smtp.gmail.com");
        assert_eq!(resp.email_config.username, "user@gmail.com");
        assert!(resp.email_config.has_password);
        assert!(resp.email_config.configured);

        // 4. Verify raw database storage is encrypted and does not contain plaintext password
        let raw_json = repo.get_value(&conn, "email_config").unwrap().unwrap();
        assert!(!raw_json.contains("secret_app_password"));
    }

    #[test]
    fn test_whatsapp_config_save_and_preserve_token() {
        let conn = setup_test_db();
        let repo = SettingsRepository::new();

        let payload1 = SaveWhatsAppPayload {
            api_url: Some("https://graph.facebook.com/v18.0".into()),
            api_token: Some("EAAB_secret_meta_token".into()),
            phone_number_id: Some("100020003000".into()),
            provider: Some("official_cloud_api".into()),
            enabled: Some(true),
        };
        let saved1 = repo.save_whatsapp_config(&conn, &payload1).unwrap();
        assert_eq!(saved1.api_token.as_deref(), Some("EAAB_secret_meta_token"));

        let payload2 = SaveWhatsAppPayload {
            api_url: Some("https://graph.facebook.com/v18.0".into()),
            api_token: Some("••••••••".into()),
            phone_number_id: Some("100020003000".into()),
            provider: Some("official_cloud_api".into()),
            enabled: Some(true),
        };
        let saved2 = repo.save_whatsapp_config(&conn, &payload2).unwrap();
        assert_eq!(saved2.api_token.as_deref(), Some("EAAB_secret_meta_token"));

        let resp = repo.get_app_settings_response(&conn).unwrap();
        assert!(resp.whatsapp_config.has_access_token);
        assert!(resp.whatsapp_config.configured);

        // Verify raw database storage is encrypted and does not contain plaintext token
        let raw_json = repo.get_value(&conn, "whatsapp_config").unwrap().unwrap();
        assert!(!raw_json.contains("EAAB_secret_meta_token"));
    }
}
