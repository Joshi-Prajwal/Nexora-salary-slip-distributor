use crate::models::SalarySlip;

pub struct SalarySlipRepository;

impl SalarySlipRepository {
    pub fn new() -> Self {
        Self
    }

    pub fn find_all(&self) -> Vec<SalarySlip> {
        vec![]
    }
}
