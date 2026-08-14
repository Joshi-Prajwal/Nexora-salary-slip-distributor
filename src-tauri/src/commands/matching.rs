use crate::matching::MatchCandidate;

#[tauri::command]
pub fn run_matching_engine() -> Vec<MatchCandidate> {
    vec![]
}
