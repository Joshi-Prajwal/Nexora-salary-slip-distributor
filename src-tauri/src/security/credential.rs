const DPAPI_PREFIX: &str = "enc:dpapi:";

pub struct CredentialStore;

impl CredentialStore {
    /// Encrypts a secret using Windows Data Protection API (DPAPI) when on Windows.
    /// Returns a string prefixed with `enc:dpapi:hex_bytes`.
    /// On non-Windows platforms (e.g. cross-platform tests), returns prefixed plaintext.
    pub fn protect_secret(secret: &str) -> Result<String, String> {
        let trimmed = secret.trim();
        if trimmed.is_empty() {
            return Ok(String::new());
        }

        #[cfg(target_os = "windows")]
        {
            let cipher_bytes = win_dpapi::protect(trimmed.as_bytes())?;
            let hex_str: String = cipher_bytes.iter().map(|b| format!("{:02x}", b)).collect();
            Ok(format!("{}{}", DPAPI_PREFIX, hex_str))
        }

        #[cfg(not(target_os = "windows"))]
        {
            // Non-windows test fallback
            Ok(format!("{}{}", DPAPI_PREFIX, trimmed))
        }
    }

    /// Decrypts a secret that was previously encrypted with `protect_secret`.
    /// If the stored string does not have the DPAPI prefix, it treats it as legacy
    /// Phase 10 plaintext for seamless backward compatibility.
    pub fn unprotect_secret(stored: &str) -> Result<String, String> {
        let trimmed = stored.trim();
        if trimmed.is_empty() {
            return Ok(String::new());
        }

        if let Some(payload) = trimmed.strip_prefix(DPAPI_PREFIX) {
            #[cfg(target_os = "windows")]
            {
                let cipher_bytes = hex_decode(payload)?;
                let plain_bytes = win_dpapi::unprotect(&cipher_bytes)?;
                String::from_utf8(plain_bytes)
                    .map_err(|e| format!("Failed to parse decrypted UTF-8 secret: {}", e))
            }

            #[cfg(not(target_os = "windows"))]
            {
                // Non-windows test fallback
                Ok(payload.to_string())
            }
        } else {
            // Backward-compatibility: legacy Phase 10 plaintext credential
            Ok(trimmed.to_string())
        }
    }

    /// Helper to test if a stored string is DPAPI-encrypted.
    pub fn is_encrypted(stored: &str) -> bool {
        stored.trim().starts_with(DPAPI_PREFIX)
    }
}

#[cfg(target_os = "windows")]
fn hex_decode(hex: &str) -> Result<Vec<u8>, String> {
    if hex.len() % 2 != 0 {
        return Err("Invalid hex length for encrypted payload".to_string());
    }
    (0..hex.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&hex[i..i + 2], 16)
                .map_err(|e| format!("Invalid hex byte in payload: {}", e))
        })
        .collect()
}

#[cfg(target_os = "windows")]
mod win_dpapi {
    use std::ptr::null_mut;

    #[repr(C)]
    #[allow(non_snake_case)]
    struct DATA_BLOB {
        cbData: u32,
        pbData: *mut u8,
    }

    #[link(name = "crypt32")]
    extern "system" {
        fn CryptProtectData(
            pDataIn: *const DATA_BLOB,
            szDataDescr: *const u16,
            pOptionalEntropy: *const DATA_BLOB,
            pvReserved: *mut std::ffi::c_void,
            pPromptStruct: *mut std::ffi::c_void,
            dwFlags: u32,
            pDataOut: *mut DATA_BLOB,
        ) -> i32;

        fn CryptUnprotectData(
            pDataIn: *const DATA_BLOB,
            ppszDataDescr: *mut *mut u16,
            pOptionalEntropy: *const DATA_BLOB,
            pvReserved: *mut std::ffi::c_void,
            pPromptStruct: *mut std::ffi::c_void,
            dwFlags: u32,
            pDataOut: *mut DATA_BLOB,
        ) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn LocalFree(hMem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
    }

    pub fn protect(plaintext: &[u8]) -> Result<Vec<u8>, String> {
        let in_blob = DATA_BLOB {
            cbData: plaintext.len() as u32,
            pbData: plaintext.as_ptr() as *mut u8,
        };
        let mut out_blob = DATA_BLOB {
            cbData: 0,
            pbData: null_mut(),
        };

        // CRYPTPROTECT_UI_FORBIDDEN = 0x1
        let flags: u32 = 0x1;

        let res = unsafe {
            CryptProtectData(
                &in_blob,
                null_mut(),
                null_mut(),
                null_mut(),
                null_mut(),
                flags,
                &mut out_blob,
            )
        };

        if res == 0 {
            return Err("Windows CryptProtectData API call failed".to_string());
        }

        let slice = unsafe {
            std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize)
        };
        let result = slice.to_vec();

        unsafe {
            LocalFree(out_blob.pbData as *mut std::ffi::c_void);
        }

        Ok(result)
    }

    pub fn unprotect(ciphertext: &[u8]) -> Result<Vec<u8>, String> {
        let in_blob = DATA_BLOB {
            cbData: ciphertext.len() as u32,
            pbData: ciphertext.as_ptr() as *mut u8,
        };
        let mut out_blob = DATA_BLOB {
            cbData: 0,
            pbData: null_mut(),
        };

        // CRYPTPROTECT_UI_FORBIDDEN = 0x1
        let flags: u32 = 0x1;

        let res = unsafe {
            CryptUnprotectData(
                &in_blob,
                null_mut(),
                null_mut(),
                null_mut(),
                null_mut(),
                flags,
                &mut out_blob,
            )
        };

        if res == 0 {
            return Err("Windows CryptUnprotectData API call failed".to_string());
        }

        let slice = unsafe {
            std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize)
        };
        let result = slice.to_vec();

        unsafe {
            LocalFree(out_blob.pbData as *mut std::ffi::c_void);
        }

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dpapi_protect_unprotect_roundtrip() {
        let original_secret = "mypassword_app_xyz_123456";
        let encrypted = CredentialStore::protect_secret(original_secret).unwrap();
        
        assert!(CredentialStore::is_encrypted(&encrypted));
        assert_ne!(encrypted, original_secret);
        assert!(!encrypted.contains(original_secret));

        let decrypted = CredentialStore::unprotect_secret(&encrypted).unwrap();
        assert_eq!(decrypted, original_secret);
    }

    #[test]
    fn test_legacy_plaintext_backward_compatibility() {
        let legacy_plaintext = "plain_existing_secret_from_phase10";
        // Not starting with enc:dpapi:
        assert!(!CredentialStore::is_encrypted(legacy_plaintext));

        let retrieved = CredentialStore::unprotect_secret(legacy_plaintext).unwrap();
        assert_eq!(retrieved, legacy_plaintext);
    }

    #[test]
    fn test_empty_secret_handling() {
        assert_eq!(CredentialStore::protect_secret("").unwrap(), "");
        assert_eq!(CredentialStore::unprotect_secret("").unwrap(), "");
    }
}
