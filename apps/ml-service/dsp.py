"""Digital Signal Processing (DSP) module for feline acoustic analysis.
Pure NumPy and SciPy implementation for maximum portability and speed.
"""

import io
import math
import struct
import functools
import numpy as np
from scipy import signal
from typing import Tuple, Dict, Any, Optional

import subprocess

STANDARD_SAMPLE_RATE = 16000  # 16 kHz mono standard
N_MELS = 128
N_FFT = 1024
HOP_LENGTH = 512
N_MFCC = 20
F_MIN = 50.0
F_MAX = 8000.0


def decode_audio_with_ffmpeg(audio_bytes: bytes, target_sr: int = STANDARD_SAMPLE_RATE) -> Optional[np.ndarray]:
    """Uses ffmpeg process pipe to extract audio track from video (mp4, webm, mov, avi, mkv) or compressed audio formats."""
    try:
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "error",
            "-i", "pipe:0",
            "-vn",
            "-f", "s16le",
            "-ac", "1",
            "-ar", str(target_sr),
            "pipe:1"
        ]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out, err = proc.communicate(input=audio_bytes, timeout=15)
        if proc.returncode == 0 and len(out) > 0:
            audio = np.frombuffer(out, dtype=np.int16).astype(np.float32) / 32768.0
            return audio
    except Exception:
        pass
    return None


def decode_audio_bytes(audio_bytes: bytes) -> Tuple[np.ndarray, int]:
    """Decodes audio bytes (WAV, raw PCM, or video audio extraction) into a 1D float32 numpy array normalized to [-1.0, 1.0]."""
    if len(audio_bytes) < 44:
        raise ValueError("Audio payload is too small to contain valid audio data.")

    # 1. Try in-memory RIFF WAV header first for instant 0ms decoding
    if audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        num_channels = struct.unpack_from("<H", audio_bytes, 22)[0]
        sample_rate = struct.unpack_from("<I", audio_bytes, 24)[0]
        bits_per_sample = struct.unpack_from("<H", audio_bytes, 34)[0]

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

        if num_channels > 1:
            audio = audio.reshape(-1, num_channels).mean(axis=1)

        return audio, sample_rate

    # 2. Try ffmpeg decoding for video & compressed audio formats (MP4, WEBM, MOV, AVI, MP3, AAC, OGGS, etc.)
    ffmpeg_audio = decode_audio_with_ffmpeg(audio_bytes, STANDARD_SAMPLE_RATE)
    if ffmpeg_audio is not None and len(ffmpeg_audio) > 0:
        return ffmpeg_audio, STANDARD_SAMPLE_RATE

    # 3. Fallback for raw 16-bit PCM
    audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    return audio, STANDARD_SAMPLE_RATE


def resample_audio(audio: np.ndarray, orig_sr: int, target_sr: int = STANDARD_SAMPLE_RATE) -> np.ndarray:
    """Resample audio signal to standard target sample rate using polyphase FIR filtering."""
    if orig_sr == target_sr or len(audio) == 0:
        return audio
    gcd = math.gcd(orig_sr, target_sr)
    up = target_sr // gcd
    down = orig_sr // gcd
    try:
        return signal.resample_poly(audio, up, down).astype(np.float32)
    except Exception:
        num_output_samples = int(round(len(audio) * float(target_sr) / orig_sr))
        return signal.resample(audio, num_output_samples).astype(np.float32)


def preprocess_signal(audio: np.ndarray, sr: int) -> Tuple[np.ndarray, float]:
    """Removes DC offset, trims silence, peak normalizes, and computes SNR."""
    if len(audio) == 0:
        return audio, 0.0

    # 1. Remove DC bias
    audio = audio - np.mean(audio)

    # 2. Estimate Signal-to-Noise Ratio (SNR) - Vectorized
    frame_len = int(sr * 0.05)  # 50ms frames
    num_frames = len(audio) // frame_len
    if num_frames > 0:
        framed = audio[: num_frames * frame_len].reshape(num_frames, frame_len)
        frame_energies = np.mean(framed**2, axis=1)
        sorted_energies = np.sort(frame_energies)
        noise_floor = float(np.mean(sorted_energies[: max(1, len(sorted_energies) // 10)])) + 1e-8
        signal_peak = float(np.mean(sorted_energies[-max(1, len(sorted_energies) // 10) :])) + 1e-8
        dynamic_range_ratio = signal_peak / noise_floor

        rms = float(np.sqrt(np.mean(audio**2)))
        if dynamic_range_ratio < 1.8 and rms > 0.02:
            snr_db = float(10 * np.log10(rms**2 / 1e-4))
        else:
            snr_db = float(10 * np.log10(signal_peak / noise_floor))
    else:
        snr_db = 20.0

    # 3. Peak normalization
    max_val = np.max(np.abs(audio))
    if max_val > 1e-6:
        audio = audio / max_val * 0.95

    return audio, float(np.clip(snr_db, -10.0, 50.0))


def compute_stft(audio: np.ndarray, n_fft: int = N_FFT, hop_length: int = HOP_LENGTH) -> np.ndarray:
    """Computes Short-Time Fourier Transform magnitude spectrogram vectorised across frames."""
    if len(audio) == 0:
        return np.zeros((n_fft // 2 + 1, 1), dtype=np.float32)

    window = np.hanning(n_fft).astype(np.float32)
    num_frames = max(1, 1 + (len(audio) - n_fft) // hop_length)

    needed_samples = (num_frames - 1) * hop_length + n_fft
    if len(audio) < needed_samples:
        padded_audio = np.pad(audio, (0, needed_samples - len(audio)))
    else:
        padded_audio = audio

    shape = (num_frames, n_fft)
    strides = (padded_audio.strides[0] * hop_length, padded_audio.strides[0])
    frames = np.lib.stride_tricks.as_strided(padded_audio, shape=shape, strides=strides)

    stft_matrix = np.abs(np.fft.rfft(frames * window, axis=-1)).T
    return stft_matrix.astype(np.float32)


def hz_to_mel(hz: float) -> float:
    return 2595.0 * np.log10(1.0 + hz / 700.0)


def mel_to_hz(mel: float) -> float:
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)


@functools.lru_cache(maxsize=16)
def get_mel_filterbank(sr: int, n_fft: int, n_mels: int, f_min: float, f_max: float) -> np.ndarray:
    """Generates triangular Mel filterbank matrix (cached)."""
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
    basis = np.cos((np.pi * np.arange(n_mfcc)[:, None] / n_mels) * (np.arange(n_mels) + 0.5)).astype(np.float32)
    return basis @ log_mel


def estimate_pitch_f0(audio: np.ndarray, sr: int = STANDARD_SAMPLE_RATE) -> Tuple[float, float, float]:
    """Estimates fundamental frequency (F0) using FFT-accelerated normalized autocorrelation."""
    if len(audio) < sr * 0.1:
        return 0.0, 0.0, 0.0

    frame_len = int(sr * 0.05)  # 50ms window
    step = int(sr * 0.025)

    min_period = int(sr / 1200.0)  # Max 1200 Hz
    max_period = int(sr / 50.0)    # Min 50 Hz

    num_frames = (len(audio) - frame_len) // step
    if num_frames <= 0:
        return 0.0, 0.0, 0.0

    shape = (num_frames, frame_len)
    strides = (audio.strides[0] * step, audio.strides[0])
    frames = np.lib.stride_tricks.as_strided(audio, shape=shape, strides=strides)

    # Filter silence frames
    max_abs = np.max(np.abs(frames), axis=1)
    valid_mask = max_abs >= 0.02
    valid_frames = frames[valid_mask]

    if len(valid_frames) == 0:
        return 0.0, 0.0, 0.0

    # FFT autocorrelation across all frames
    n_fft = 2 ** int(np.ceil(np.log2(2 * frame_len)))
    fft_frames = np.fft.rfft(valid_frames, n=n_fft, axis=1)
    corr = np.fft.irfft(fft_frames * np.conj(fft_frames), n=n_fft, axis=1)[:, :frame_len]

    f0_values = []
    zero_lags = corr[:, 0] + 1e-9

    for i in range(len(valid_frames)):
        frame_corr = corr[i]
        if len(frame_corr) > max_period:
            search_window = frame_corr[min_period:max_period]
            if len(search_window) > 0 and np.max(search_window) > 0.3 * zero_lags[i]:
                peak_lag = min_period + np.argmax(search_window)
                f0 = float(sr / peak_lag)
                f0_values.append(f0)

    if not f0_values:
        return 0.0, 0.0, 0.0

    return float(np.mean(f0_values)), float(np.min(f0_values)), float(np.max(f0_values))


def compute_spectral_features(audio: np.ndarray, sr: int = STANDARD_SAMPLE_RATE) -> Dict[str, float]:
    """Computes spectral centroid, zero crossing rate, and RMS energy."""
    rms = float(np.sqrt(np.mean(audio**2)))
    zcr = float(np.mean(np.abs(np.diff(np.sign(audio)))) / 2.0)

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


def compute_human_vs_cat_acoustic_features(audio: np.ndarray, sr: int = STANDARD_SAMPLE_RATE) -> Dict[str, float]:
    """Computes acoustic features specifically differentiating human vocal imitations/speech
    from genuine feline vocalizations:
    - High Frequency Energy Ratio (E > 2500 Hz / Total E)
    - Spectral Rolloff (85%)
    - Syllabic speech envelope modulation index (4-7 Hz band energy in temporal envelope)
    """
    if len(audio) == 0:
        return {
            "high_freq_ratio": 0.0,
            "spectral_rolloff": 0.0,
            "speech_modulation_index": 0.0,
        }

    mag = np.abs(np.fft.rfft(audio[: min(len(audio), sr * 4)]))
    freqs = np.fft.rfftfreq(len(mag) * 2 - 1, 1.0 / sr)
    total_energy = float(np.sum(mag**2) + 1e-9)

    # High frequency energy ratio (> 2500 Hz)
    high_freq_mask = freqs >= 2500.0
    high_freq_energy = float(np.sum(mag[high_freq_mask]**2))
    high_freq_ratio = float(high_freq_energy / total_energy)

    # Spectral Rolloff 85%
    cum_energy = np.cumsum(mag**2)
    rolloff_idx = np.where(cum_energy >= 0.85 * total_energy)[0]
    rolloff_hz = float(freqs[rolloff_idx[0]]) if len(rolloff_idx) > 0 else 0.0

    # Syllabic speech envelope modulation
    env = np.abs(signal.hilbert(audio))
    if len(env) > 128:
        env_fft = np.abs(np.fft.rfft(env - np.mean(env)))
        env_freqs = np.fft.rfftfreq(len(env), 1.0 / sr)
        speech_band_mask = (env_freqs >= 3.0) & (env_freqs <= 8.0)
        total_env_energy = float(np.sum(env_fft) + 1e-9)
        speech_modulation_index = float(np.sum(env_fft[speech_band_mask]) / total_env_energy)
    else:
        speech_modulation_index = 0.0

    return {
        "high_freq_ratio": high_freq_ratio,
        "spectral_rolloff": rolloff_hz,
        "speech_modulation_index": speech_modulation_index,
    }


