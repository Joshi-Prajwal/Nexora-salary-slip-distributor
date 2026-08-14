use crate::models::SalarySlip;

pub struct SalarySlipService;

impl SalarySlipService {
    pub fn new() -> Self {
        Self
    }

    pub fn scan_folder(&self, _folder_path: &str) -> Vec<SalarySlip> {
        vec![]
    }
}
