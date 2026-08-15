use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DeliveryChannel {
    Email,
    WhatsApp,
    Both,
}

impl DeliveryChannel {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeliveryChannel::Email => "EMAIL",
            DeliveryChannel::WhatsApp => "WHATSAPP",
            DeliveryChannel::Both => "BOTH",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "EMAIL" => DeliveryChannel::Email,
            "WHATSAPP" => DeliveryChannel::WhatsApp,
            _ => DeliveryChannel::Both,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DeliveryStatus {
    Pending,
    Processing,
    Sent,
    Failed,
    Skipped,
}

impl DeliveryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeliveryStatus::Pending => "PENDING",
            DeliveryStatus::Processing => "PROCESSING",
            DeliveryStatus::Sent => "SENT",
            DeliveryStatus::Failed => "FAILED",
            DeliveryStatus::Skipped => "SKIPPED",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "PENDING" => DeliveryStatus::Pending,
            "PROCESSING" => DeliveryStatus::Processing,
            "SENT" => DeliveryStatus::Sent,
            "FAILED" => DeliveryStatus::Failed,
            _ => DeliveryStatus::Skipped,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryRecord {
    pub id: String,
    pub salary_slip_id: String,
    pub employee_id: String,
    pub channel: String,
    pub status: String,
    pub recipient: String,
    pub provider: String,
    pub message: Option<String>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub provider_message_id: Option<String>,
    pub attempt_number: i32,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub employee_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryPreview {
    pub total_requested: usize,
    pub eligible_count: usize,
    pub missing_email_count: usize,
    pub missing_whatsapp_count: usize,
    pub not_configured_count: usize,
    pub already_sent_count: usize,
    pub ineligible_count: usize,
    pub estimated_deliveries: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryBatchSummary {
    pub total: usize,
    pub sent: usize,
    pub failed: usize,
    pub skipped: usize,
    pub already_sent: usize,
    pub email_sent: usize,
    pub whatsapp_sent: usize,
    pub email_failed: usize,
    pub whatsapp_failed: usize,
    pub records: Vec<DeliveryRecord>,
}
