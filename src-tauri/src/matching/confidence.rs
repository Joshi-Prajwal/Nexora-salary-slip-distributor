pub struct ConfidenceScorer;

impl ConfidenceScorer {
    pub fn calculate_confidence(signals_matched: usize, total_signals: usize) -> f64 {
        if total_signals == 0 {
            return 0.0;
        }
        signals_matched as f64 / total_signals as f64
    }
}
