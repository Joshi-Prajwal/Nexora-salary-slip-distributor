pub fn normalize_string(input: &str) -> String {
    let mut s = input.trim().to_lowercase();
    // Normalize repeated horizontal spaces
    s = s.split_whitespace().collect::<Vec<&str>>().join(" ");
    s
}

pub fn normalize_employee_id(id: &str) -> String {
    let clean: String = id
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>()
        .to_uppercase();
    clean
}

pub fn normalize_email(email: &str) -> String {
    email.trim().to_lowercase()
}

pub fn normalize_phone(phone: &str) -> String {
    // Extract numeric digits only for normalized phone comparison
    let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() > 10 {
        // Retain last 10 digits if country code is included (e.g., +91)
        digits[digits.len() - 10..].to_string()
    } else {
        digits
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_employee_id() {
        assert_eq!(normalize_employee_id(" emp1024 "), "EMP1024");
        assert_eq!(normalize_employee_id("#EMP-1024:"), "EMP1024");
    }

    #[test]
    fn test_normalize_email() {
        assert_eq!(normalize_email(" Rahul@Example.COM "), "rahul@example.com");
    }

    #[test]
    fn test_normalize_phone() {
        assert_eq!(normalize_phone("+91 9876543210"), "9876543210");
        assert_eq!(normalize_phone("98765-43210"), "9876543210");
    }

    #[test]
    fn test_normalize_string() {
        assert_eq!(normalize_string("  Rahul   Kumar.  "), "rahul kumar.");
    }
}
