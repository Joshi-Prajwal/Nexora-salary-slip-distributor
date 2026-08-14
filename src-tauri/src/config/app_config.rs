use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub database_path: String,
    pub min_confidence_threshold: f64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            database_path: "salary_slips.db".to_string(),
            min_confidence_threshold: 0.85,
        }
    }
}
