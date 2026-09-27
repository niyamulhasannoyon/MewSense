"""Digital Signal Processing (DSP) module for feline acoustic analysis.
Pure NumPy and SciPy implementation for maximum portability and speed.
"""

import io
import math
import struct
import numpy as np
from scipy import signal
from typing import Tuple, Dict, Any, Optional

STANDARD_SAMPLE_RATE = 16000  # 16 kHz mono standard
N_MELS = 128
N_FFT = 1024
HOP_LENGTH = 512
N_MFCC = 20
F_MIN = 50.0
F_MAX = 8000.0


def decode_audio_bytes(audio_bytes: bytes) -> Tuple[np.ndarray, int]:
    """Decodes audio bytes (WAV or raw PCM) into a 1D float32 numpy array normalized to [-1.0, 1.0]."""
    if len(audio_bytes) < 44:
        raise ValueError("Audio payload is too small to contain valid audio data.")

    # Check for RIFF WAV header
    if audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        # Parse WAV header manually for robust zero-dependency decoding
        num_channels = struct.unpack_from("<H", audio_bytes, 22)[0]
        sample_rate = struct.unpack_from("<I", audio_bytes, 24)[0]
        bits_per_sample = struct.unpack_from("<H", audio_bytes, 34)[0]

        # Locate 'data' chunk
        offset = 12
        while offset < len(audio_bytes) - 8:
            chunk_id = audio_bytes[offset : offset + 4]
            chunk_size = struct.unpack_from("<I", audio_bytes, offset + 4)[0]
            if chunk_id == b"data":
                data_start = offset + 8
                raw_data = audio_bytes[data_start : data_start + chunk_size]
                break
            offset += 8 + chunk_size
        else:
            raw_data = audio_bytes[44:]

        if bits_per_sample == 16:
            audio = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0
        elif bits_per_sample == 32:
            audio = np.frombuffer(raw_data, dtype=np.int32).astype(np.float32) / 2147483648.0
        elif bits_per_sample == 8:
            audio = (np.frombuffer(raw_data, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
        else:
            audio = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0

        # Downmix multi-channel to mono
        if num_channels > 1:
            audio = audio.reshape(-1, num_channels).mean(axis=1)

        return audio, sample_rate

    # If raw 16-bit PCM
    audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    return audio, STANDARD_SAMPLE_RATE


def resample_audio(audio: np.ndarray, orig_sr: int, target_sr: int = STANDARD_SAMPLE_RATE) -> np.ndarray:
    """Resample audio signal to standard target sample rate."""
    if orig_sr == target_sr or len(audio) == 0:
        return audio
    num_output_samples = int(round(len(audio) * float(target_sr) / orig_sr))
    return signal.resample(audio, num_output_samples).astype(np.float32)


def preprocess_signal(audio: np.ndarray, sr: int) -> Tuple[np.ndarray, float]:
    """Removes DC offset, trims silence, peak normalizes, and computes SNR."""
    if len(audio) == 0:
        return audio, 0.0

    # 1. Remove DC bias
    audio = audio - np.mean(audio)

    # 2. Estimate Signal-to-Noise Ratio (SNR)
    frame_len = int(sr * 0.05)  # 50ms frames
    if len(audio) > frame_len:
        frames = [audio[i : i + frame_len] for i in range(0, len(audio) - frame_len, frame_len)]
        frame_energies = [np.mean(f**2) for f in frames if len(f) > 0]
        if frame_energies:
            sorted_energies = sorted(frame_energies)
            noise_floor = np.mean(sorted_energies[: max(1, len(sorted_energies) // 10)]) + 1e-8
            signal_peak = np.mean(sorted_energies[-max(1, len(sorted_energies) // 10) :]) + 1e-8
            dynamic_range_ratio = signal_peak / noise_floor

            rms = float(np.sqrt(np.mean(audio**2)))
            if dynamic_range_ratio < 1.8 and rms > 0.02:
                # Continuous active signal across all frames; compare to baseline noise floor
                snr_db = float(10 * np.log10(rms**2 / 1e-4))
            else:
                snr_db = float(10 * np.log10(signal_peak / noise_floor))
        else:
            snr_db = 20.0
    else:
        snr_db = 20.0

    # 3. Peak normalization
    max_val = np.max(np.abs(audio))
    if max_val > 1e-6:
        audio = audio / max_val * 0.95

    return audio, float(np.clip(snr_db, -10.0, 50.0))


def compute_stft(audio: np.ndarray, n_fft: int = N_FFT, hop_length: int = HOP_LENGTH) -> np.ndarray:
    """Computes Short-Time Fourier Transform magnitude spectrogram."""
    window = np.hanning(n_fft)
    num_frames = max(1, 1 + (len(audio) - n_fft) // hop_length)
    stft_matrix = np.empty((n_fft // 2 + 1, num_frames), dtype=np.float32)

    for t in range(num_frames):
        start = t * hop_length
        frame = audio[start : start + n_fft]
        if len(frame) < n_fft:
            frame = np.pad(frame, (0, n_fft - len(frame)))
        stft_matrix[:, t] = np.abs(np.fft.rfft(frame * window))

    return stft_matrix


def hz_to_mel(hz: float) -> float:
    return 2595.0 * np.log10(1.0 + hz / 700.0)


def mel_to_hz(mel: float) -> float:
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)


def get_mel_filterbank(sr: int, n_fft: int, n_mels: int, f_min: float, f_max: float) -> np.ndarray:
    """Generates triangular Mel filterbank matrix."""
    mel_min = hz_to_mel(f_min)
    mel_max = hz_to_mel(f_max)
    mel_points = np.linspace(mel_min, mel_max, n_mels + 2)
    hz_points = mel_to_hz(mel_points)
    bin_points = np.floor((n_fft + 1) * hz_points / sr).astype(int)

    filterbank = np.zeros((n_mels, n_fft // 2 + 1), dtype=np.float32)
    for m in range(1, n_mels + 1):
        f_m_minus = bin_points[m - 1]
        f_m = bin_points[m]
        f_m_plus = bin_points[m + 1]

        for k in range(f_m_minus, f_m):
            if f_m > f_m_minus:
                filterbank[m - 1, k] = (k - f_m_minus) / (f_m - f_m_minus)
        for k in range(f_m, f_m_plus):
            if f_m_plus > f_m:
                filterbank[m - 1, k] = (f_m_plus - k) / (f_m_plus - f_m)

    return filterbank


def compute_mel_spectrogram(
    audio: np.ndarray,
    sr: int = STANDARD_SAMPLE_RATE,
    n_fft: int = N_FFT,
    hop_length: int = HOP_LENGTH,
    n_mels: int = N_MELS,
    f_min: float = F_MIN,
    f_max: float = F_MAX,
) -> np.ndarray:
    """Computes log-Mel spectrogram."""
    mag_spec = compute_stft(audio, n_fft, hop_length)
    fb = get_mel_filterbank(sr, n_fft, n_mels, f_min, f_max)
    mel_spec = np.dot(fb, mag_spec**2)
    # Log compression with stabilization
    log_mel = np.log10(np.maximum(mel_spec, 1e-6))
    return log_mel


def compute_mfcc(log_mel: np.ndarray, n_mfcc: int = N_MFCC) -> np.ndarray:
    """Computes Mel-Frequency Cepstral Coefficients via Discrete Cosine Transform (DCT-II)."""
    n_mels, n_frames = log_mel.shape
    mfcc = np.zeros((n_mfcc, n_frames), dtype=np.float32)
    for i in range(n_mfcc):
        factor = np.pi * i / n_mels
        basis = np.cos(factor * (np.arange(n_mels) + 0.5))
        mfcc[i, :] = np.dot(basis, log_mel)
    return mfcc


def estimate_pitch_f0(audio: np.ndarray, sr: int = STANDARD_SAMPLE_RATE) -> Tuple[float, float, float]:
    """Estimates fundamental frequency (F0) using normalized autocorrelation.
    Feline vocal fundamental frequency typically ranges from 150 Hz to 1200 Hz.
    """
    if len(audio) < sr * 0.1:
        return 0.0, 0.0, 0.0

    frame_len = int(sr * 0.05)  # 50ms window
    step = int(sr * 0.025)
    f0_values = []

    min_period = int(sr / 1200.0)  # Max 1200 Hz
    max_period = int(sr / 50.0)    # Min 50 Hz (supports purrs and deep growls)

    for start in range(0, len(audio) - frame_len, step):
        frame = audio[start : start + frame_len]
        if np.max(np.abs(frame)) < 0.02:
            continue  # Silence

        # Autocorrelation
        corr = np.correlate(frame, frame, mode="full")
        corr = corr[len(corr) // 2 :]

        if len(corr) > max_period:
            search_window = corr[min_period:max_period]
            if len(search_window) > 0 and np.max(search_window) > 0.3 * corr[0]:
                peak_lag = min_period + np.argmax(search_window)
                f0 = float(sr / peak_lag)
                f0_values.append(f0)

    if not f0_values:
        return 0.0, 0.0, 0.0

    return float(np.mean(f0_values)), float(np.min(f0_values)), float(np.max(f0_values))


def compute_spectral_features(audio: np.ndarray, sr: int = STANDARD_SAMPLE_RATE) -> Dict[str, float]:
    """Computes spectral centroid, zero crossing rate, and RMS energy."""
    # RMS Energy
    rms = float(np.sqrt(np.mean(audio**2)))

    # Zero Crossing Rate
    zcr = float(np.mean(np.abs(np.diff(np.sign(audio)))) / 2.0)

    # Spectral Centroid
    mag = np.abs(np.fft.rfft(audio[: min(len(audio), sr * 2)]))
    freqs = np.fft.rfftfreq(len(mag) * 2 - 1, 1.0 / sr)
    sum_mag = np.sum(mag)
    if sum_mag > 1e-6:
        centroid = float(np.sum(freqs * mag) / sum_mag)
    else:
        centroid = 0.0

    return {
        "rms_energy": rms,
        "zero_crossing_rate": zcr,
        "spectral_centroid": centroid,
    }
