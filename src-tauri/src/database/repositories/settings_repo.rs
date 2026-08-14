use crate::models::AppSettings;

pub struct SettingsRepository;

impl SettingsRepository {
    pub fn new() -> Self {
        Self
    }

    pub fn get_settings(&self) -> Option<AppSettings> {
        None
    }
}
