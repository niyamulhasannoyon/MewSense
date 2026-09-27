"""Feature Extraction Engine for MewSense ML Microservice."""

import numpy as np
from dataclasses import dataclass
from typing import Dict, Any, Tuple
from dsp import (
    decode_audio_bytes,
    resample_audio,
    preprocess_signal,
    compute_mel_spectrogram,
    compute_mfcc,
    estimate_pitch_f0,
    compute_spectral_features,
    compute_human_vs_cat_acoustic_features,
    STANDARD_SAMPLE_RATE
)


@dataclass
class AudioFeatures:
    duration_seconds: float
    sample_rate: int
    rms_energy: float
    pitch_f0_mean: float
    pitch_f0_min: float
    pitch_f0_max: float
    spectral_centroid_hz: float
    zero_crossing_rate: float
    snr_db: float
    mel_spectrogram_summary: Dict[str, float]
    mfcc_means: list
    high_freq_ratio: float = 0.0
    spectral_rolloff: float = 0.0
    speech_modulation_index: float = 0.0


class FeatureExtractor:
    def __init__(self, sample_rate: int = STANDARD_SAMPLE_RATE):
        self.sample_rate = sample_rate

    def extract_from_bytes(self, audio_bytes: bytes) -> AudioFeatures:
        """Extracts complete feline acoustic feature vector from raw audio bytes."""
        # 1. Decode & normalize
        raw_audio, orig_sr = decode_audio_bytes(audio_bytes)
        
        # 2. Resample to standard 16 kHz
        audio = resample_audio(raw_audio, orig_sr, self.sample_rate)
        
        # 3. Preprocess (DC offset, SNR estimation, peak normalization)
        cleaned_audio, snr_db = preprocess_signal(audio, self.sample_rate)

        duration = float(len(cleaned_audio) / self.sample_rate)

        # 4. Spectral analysis
        spectral = compute_spectral_features(cleaned_audio, self.sample_rate)
        f0_mean, f0_min, f0_max = estimate_pitch_f0(cleaned_audio, self.sample_rate)
        human_vs_cat = compute_human_vs_cat_acoustic_features(cleaned_audio, self.sample_rate)

        # 5. Mel Spectrogram & MFCCs
        log_mel = compute_mel_spectrogram(cleaned_audio, self.sample_rate)
        mfcc = compute_mfcc(log_mel)

        mfcc_means = [float(np.mean(mfcc[i, :])) for i in range(mfcc.shape[0])]

        mel_summary = {
            "low_band_energy": float(np.mean(log_mel[:32, :])),
            "mid_band_energy": float(np.mean(log_mel[32:96, :])),
            "high_band_energy": float(np.mean(log_mel[96:, :])),
        }

        return AudioFeatures(
            duration_seconds=round(duration, 3),
            sample_rate=self.sample_rate,
            rms_energy=round(spectral["rms_energy"], 4),
            pitch_f0_mean=round(f0_mean, 1),
            pitch_f0_min=round(f0_min, 1),
            pitch_f0_max=round(f0_max, 1),
            spectral_centroid_hz=round(spectral["spectral_centroid"], 1),
            zero_crossing_rate=round(spectral["zero_crossing_rate"], 4),
            snr_db=round(snr_db, 1),
            mel_spectrogram_summary=mel_summary,
            mfcc_means=mfcc_means,
            high_freq_ratio=round(human_vs_cat["high_freq_ratio"], 4),
            spectral_rolloff=round(human_vs_cat["spectral_rolloff"], 1),
            speech_modulation_index=round(human_vs_cat["speech_modulation_index"], 4),
        )
