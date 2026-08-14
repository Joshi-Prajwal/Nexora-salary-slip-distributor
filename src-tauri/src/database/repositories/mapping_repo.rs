use crate::models::Mapping;

pub struct MappingRepository;

impl MappingRepository {
    pub fn new() -> Self {
        Self
    }

    pub fn find_all(&self) -> Vec<Mapping> {
        vec![]
    }
}
