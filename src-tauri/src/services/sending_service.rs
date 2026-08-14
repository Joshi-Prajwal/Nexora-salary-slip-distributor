pub struct SendingService;

impl SendingService {
    pub fn new() -> Self {
        Self
    }

    pub fn send_batch(&self, _slip_ids: &[String]) -> bool {
        true
    }
}
