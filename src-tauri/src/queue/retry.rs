pub struct RetryPolicy {
    pub max_retries: u32,
    pub backoff_seconds: u64,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_retries: 3,
            backoff_seconds: 60,
        }
    }
}
