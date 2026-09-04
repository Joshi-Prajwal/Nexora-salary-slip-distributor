use crate::queue::job::SendJobRequest;

pub struct QueueWorker;

impl QueueWorker {
    pub fn new() -> Self {
        Self
    }

    pub fn process_job(&self, _job: &SendJobRequest) -> bool {
        true
    }
}
