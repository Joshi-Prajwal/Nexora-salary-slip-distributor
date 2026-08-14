use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Employee {
    pub id: String,
    pub employee_id: String,
    pub name: String,
    pub phone: Option<String>,
    pub whatsapp_number: Option<String>,
    pub email: Option<String>,
    pub department: Option<String>,
    pub designation: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
