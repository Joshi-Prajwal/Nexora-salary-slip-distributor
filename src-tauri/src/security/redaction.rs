use regex::Regex;

/// Redacts any instance of a known secret from a text string.
pub fn redact_secret(text: &str, secret: &str) -> String {
    let secret_trim = secret.trim();
    if secret_trim.is_empty() || secret_trim.len() < 3 {
        return text.to_string();
    }
    text.replace(secret_trim, "[REDACTED]")
}

/// Sanitizes general error messages and strings to prevent leaking passwords,
/// authentication tokens, bearer headers, or credentials in URIs.
pub fn sanitize_error_message(text: &str) -> String {
    let mut result = text.to_string();

    // 1. Redact Bearer tokens: Bearer <token>
    if let Ok(bearer_re) = Regex::new(r"(?i)\bBearer\s+[A-Za-z0-9_\-\.\+/=]+") {
        result = bearer_re.replace_all(&result, "Bearer [REDACTED]").to_string();
    }

    // 2. Redact passwords in connection URLs: scheme://user:pass@host
    if let Ok(url_cred_re) = Regex::new(r"://([^:\s]+):([^@\s]+)@") {
        result = url_cred_re.replace_all(&result, "://$1:[REDACTED]@").to_string();
    }

    // 3. Redact explicit password= or password: keys
    if let Ok(pwd_re) = Regex::new(r#"(?i)(password|passwd|pwd|app_password|secret|api_token|access_token)\s*([=:]|\s+is\s+)\s*["']?([^\s"',;]+)["']?"#) {
        result = pwd_re.replace_all(&result, "$1$2[REDACTED]").to_string();
    }

    // 4. Redact SMTP AUTH PLAIN traces
    if let Ok(smtp_auth_re) = Regex::new(r"(?i)\bAUTH\s+(PLAIN|LOGIN)\s+[A-Za-z0-9+/=]+") {
        result = smtp_auth_re.replace_all(&result, "AUTH $1 [REDACTED]").to_string();
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redact_known_secret() {
        let error = "SMTP authentication failed for user alice with password mySecretAppPassword123 at port 587";
        let cleaned = redact_secret(error, "mySecretAppPassword123");
        assert!(!cleaned.contains("mySecretAppPassword123"));
        assert!(cleaned.contains("[REDACTED]"));
    }

    #[test]
    fn test_redact_short_or_empty_secret() {
        let msg = "Hello world";
        assert_eq!(redact_secret(msg, ""), "Hello world");
        assert_eq!(redact_secret(msg, "ab"), "Hello world");
    }

    #[test]
    fn test_sanitize_bearer_token() {
        let msg = "HTTP 401 Unauthorized with header Bearer ya29.a0AfH6SMDI394fakeTokenValue";
        let sanitized = sanitize_error_message(msg);
        assert!(!sanitized.contains("ya29.a0AfH6SMDI394fakeTokenValue"));
        assert!(sanitized.contains("Bearer [REDACTED]"));
    }

    #[test]
    fn test_sanitize_url_credentials() {
        let msg = "Connection error to smtp://admin:superSecretPass456@smtp.gmail.com:587";
        let sanitized = sanitize_error_message(msg);
        assert!(!sanitized.contains("superSecretPass456"));
        assert!(sanitized.contains("smtp://admin:[REDACTED]@smtp.gmail.com:587"));
    }

    #[test]
    fn test_sanitize_key_value_secrets() {
        let msg1 = "Invalid parameter: password=Confidential99; server=mail.org";
        let san1 = sanitize_error_message(msg1);
        assert!(!san1.contains("Confidential99"));
        assert!(san1.contains("password=[REDACTED]"));

        let msg2 = "Handshake error: api_token: EAAJxyz987654";
        let san2 = sanitize_error_message(msg2);
        assert!(!san2.contains("EAAJxyz987654"));
        assert!(san2.contains("api_token:[REDACTED]"));
    }
}
