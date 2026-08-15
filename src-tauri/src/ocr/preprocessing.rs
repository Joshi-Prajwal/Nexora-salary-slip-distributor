use image::{DynamicImage, GrayImage};

pub struct ImagePreprocessor;

impl ImagePreprocessor {
    pub fn new() -> Self {
        Self
    }

    /// Preprocesses image for optical character recognition (grayscale + contrast enhancement)
    pub fn preprocess(&self, img: &DynamicImage) -> GrayImage {
        let grayscale = img.to_luma8();
        let mut processed = grayscale.clone();

        for pixel in processed.pixels_mut() {
            let val = pixel[0];
            // Contrast enhancement for clear text readability
            pixel[0] = if val < 135 {
                (val as f32 * 0.65) as u8
            } else {
                255
            };
        }

        processed
    }
}
