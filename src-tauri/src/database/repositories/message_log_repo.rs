use crate::models::MessageLog;

pub struct MessageLogRepository;

impl MessageLogRepository {
    pub fn new() -> Self {
        Self
    }

    pub fn find_all(&self) -> Vec<MessageLog> {
        vec![]
    }
}
