"""Pytest test suite for MewSense ML Microservice."""

import struct
import numpy as np
import pytest
from dsp import decode_audio_bytes, preprocess_signal, compute_mel_spectrogram, compute_mfcc, estimate_pitch_f0
from features import FeatureExtractor
from model import CalibratedAcousticEnsemble
from explain import ExplainabilityEngine, DISTRESS_DISCLAIMER, GENERAL_DISCLAIMER


def generate_synthetic_wav(freq: float = 500.0, duration: float = 1.0, sr: int = 16000) -> bytes:
    """Generates an in-memory 16-bit PCM RIFF WAV audio file."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Fundamental tone + harmonic
    signal_data = 0.6 * np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)
    pcm_data = (signal_data * 32767).astype(np.int16).tobytes()

    # Build RIFF header
    header = bytearray()
    header.extend(b"RIFF")
    header.extend(struct.pack("<I", 36 + len(pcm_data)))
    header.extend(b"WAVE")
    header.extend(b"fmt ")
    header.extend(struct.pack("<I", 16))          # Subchunk1Size
    header.extend(struct.pack("<H", 1))           # AudioFormat (PCM = 1)
    header.extend(struct.pack("<H", 1))           # NumChannels (Mono = 1)
    header.extend(struct.pack("<I", sr))          # SampleRate
    header.extend(struct.pack("<I", sr * 2))      # ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    header.extend(struct.pack("<H", 2))           # BlockAlign (NumChannels * BitsPerSample/8)
    header.extend(struct.pack("<H", 16))          # BitsPerSample (16 bits)
    header.extend(b"data")
    header.extend(struct.pack("<I", len(pcm_data)))

    return bytes(header) + pcm_data


def test_dsp_decoding_and_resampling():
    wav_bytes = generate_synthetic_wav(freq=440.0, duration=1.0, sr=16000)
    audio, sr = decode_audio_bytes(wav_bytes)

    assert sr == 16000
    assert len(audio) == 16000
    assert np.max(np.abs(audio)) > 0.1

    cleaned, snr = preprocess_signal(audio, sr)
    assert snr > 5.0
    assert np.max(np.abs(cleaned)) <= 1.0


def test_feature_extraction():
    wav_bytes = generate_synthetic_wav(freq=550.0, duration=1.2, sr=16000)
    extractor = FeatureExtractor(sample_rate=16000)
    features = extractor.extract_from_bytes(wav_bytes)

    assert features.duration_seconds >= 1.0
    assert features.sample_rate == 16000
    assert features.pitch_f0_mean > 300.0  # Should detect around 550 Hz
    assert len(features.mfcc_means) == 20
    assert "low_band_energy" in features.mel_spectrogram_summary


def test_model_meow_prediction():
    # 550 Hz harmonic tone with feeding context
    wav_bytes = generate_synthetic_wav(freq=550.0, duration=1.0, sr=16000)
    extractor = FeatureExtractor()
    features = extractor.extract_from_bytes(wav_bytes)

    model = CalibratedAcousticEnsemble()
    context = {"activity": "feeding", "foodPresent": False}
    result = model.predict(features, context)

    assert result["primary_sound_type"] == "MEOW"
    assert result["probable_context"] == "HUNGRY_FOOD_SEEKING"
    assert 0.0 <= result["confidence"] <= 1.0
    assert result["confidence"] >= 0.45


def test_model_purr_prediction():
    # Low frequency rumble (80 Hz)
    wav_bytes = generate_synthetic_wav(freq=80.0, duration=1.5, sr=16000)
    extractor = FeatureExtractor()
    features = extractor.extract_from_bytes(wav_bytes)

    model = CalibratedAcousticEnsemble()
    context = {"activity": "resting"}
    result = model.predict(features, context)

    assert result["primary_sound_type"] == "PURR"
    assert result["probable_context"] == "GREETING_SOCIAL"


def test_distress_detection_and_disclaimer():
    # High frequency shrill vocalization (800 Hz, long duration)
    wav_bytes = generate_synthetic_wav(freq=800.0, duration=2.5, sr=16000)
    extractor = FeatureExtractor()
    features = extractor.extract_from_bytes(wav_bytes)

    model = CalibratedAcousticEnsemble()
    context = {"environment": "vet_clinic"}
    result = model.predict(features, context)

    assert result["is_distress_pattern"] is True

    explanation_res = ExplainabilityEngine.generate_explanation(
        primary_sound=result["primary_sound_type"],
        probable_context=result["probable_context"],
        confidence=result["confidence"],
        is_distress=result["is_distress_pattern"],
        features=features,
        context=context
    )

    assert "distress" in explanation_res["disclaimer"].lower() or "veterinarian" in explanation_res["disclaimer"].lower()


def test_corrupted_audio_handling():
    corrupted_bytes = b"NOT_A_VALID_AUDIO_FILE_DATA_HERE"
    extractor = FeatureExtractor()
    with pytest.raises(Exception):
        extractor.extract_from_bytes(corrupted_bytes)
