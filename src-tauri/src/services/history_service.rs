use crate::models::MessageLog;

pub struct HistoryService;

impl HistoryService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_logs(&self) -> Vec<MessageLog> {
        vec![]
    }
}
