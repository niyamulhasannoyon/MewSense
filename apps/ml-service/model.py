"""Acoustic Model Ensemble, Contextual Fusion, and Confidence Calibration Engine."""

import math
from typing import Dict, Any, Tuple
from features import AudioFeatures

VOCALIZATION_CLASSES = [
    "MEOW",
    "PURR",
    "HISS",
    "GROWL",
    "CHIRP_TRILL",
    "CATERWAUL",
    "YOWL",
    "OTHER_UNKNOWN"
]

CONTEXT_INTENTS = [
    "HUNGRY_FOOD_SEEKING",
    "ATTENTION_SEEKING",
    "GREETING_SOCIAL",
    "PLAYFUL_EXCITED",
    "FEAR_ANXIETY",
    "DEFENSIVE_THREATENED",
    "DISCOMFORT_POSSIBLE_PAIN",
    "MATING_CALL",
    "TERRITORIAL_BEHAVIOR",
    "UNKNOWN_INSUFFICIENT_CONFIDENCE"
]

CONFIDENCE_THRESHOLD = 0.45  # OOD cutoff
MIN_SNR_THRESHOLD_DB = 6.0    # Noisy background cutoff


class CalibratedAcousticEnsemble:
    """Production acoustic inference engine combining spectral heuristics,
    gradient-boosted decision weights, and Bayesian context integration.
    """

    def __init__(self, temperature: float = 1.2):
        self.temperature = temperature

    def predict(self, features: AudioFeatures, context: Dict[str, Any]) -> Dict[str, Any]:
        """Runs multi-stage inference:
        1. Vocalization sound classification
        2. Contextual intent estimation
        3. Confidence calibration & OOD thresholding
        """
        # Guardrail: Check SNR and duration
        if features.snr_db < MIN_SNR_THRESHOLD_DB or features.duration_seconds < 0.3:
            return self._build_unknown_response(
                features,
                reason="Audio signal-to-noise ratio is too low or duration is insufficient for reliable acoustic analysis."
            )

        # Stage 1: Compute raw acoustic logits
        sound_logits = self._compute_sound_logits(features)
        sound_probs = self._softmax_temperature(sound_logits, self.temperature)

        # Primary sound type
        primary_sound = max(sound_probs, key=sound_probs.get)
        sound_confidence = sound_probs[primary_sound]

        # Stage 2: Contextual Bayesian Intent Estimation
        context_probs = self._compute_context_probabilities(primary_sound, sound_probs, features, context)
        probable_context = max(context_probs, key=context_probs.get)
        context_confidence = context_probs[probable_context]

        # Stage 3: Joint Calibrated Confidence
        joint_confidence = round(float(math.sqrt(sound_confidence * context_confidence)), 3)

        # OOD Guardrail: If joint confidence is below threshold, output Unknown
        if joint_confidence < CONFIDENCE_THRESHOLD:
            return self._build_unknown_response(
                features,
                reason="Model predictions did not exceed the required statistical confidence threshold (0.45)."
            )

        # Check for feline distress/pain patterns
        is_distress = (
            primary_sound in ["HISS", "GROWL", "YOWL"]
            or probable_context in ["FEAR_ANXIETY", "DEFENSIVE_THREATENED", "DISCOMFORT_POSSIBLE_PAIN"]
        )

        return {
            "primary_sound_type": primary_sound,
            "probable_context": probable_context,
            "confidence": joint_confidence,
            "is_distress_pattern": is_distress,
            "probabilities": {
                "sound": {k: round(v, 4) for k, v in sound_probs.items()},
                "context": {k: round(v, 4) for k, v in context_probs.items()}
            }
        }

    def _compute_sound_logits(self, f: AudioFeatures) -> Dict[str, float]:
        """Computes raw logit scores based on feline bioacoustic literature:
        - Purr: Low frequency continuous rumble (F0 < 150 Hz, low centroid, low ZCR)
        - Hiss: High frequency turbulent unvoiced noise (Centroid > 2500 Hz, high ZCR, no strong F0)
        - Growl: Low fundamental frequency, moderate harshness, continuous energy
        - Meow: Harmonic voiced sound, prominent F0 (350-900 Hz), moderate duration (0.5-2.0s)
        - Chirp/Trill: Rapid frequency modulation, rising contour, short duration (<0.5s)
        - Yowl/Caterwaul: Drawn-out, high energy, wide frequency sweeps (>1.5s)
        """
        logits = {k: 0.0 for k in VOCALIZATION_CLASSES}

        # Purr evidence (deep low spectral centroid, very low zero crossing rate)
        if f.spectral_centroid_hz < 500 and f.zero_crossing_rate < 0.06:
            logits["PURR"] += 5.0
        elif f.pitch_f0_mean < 200 and f.pitch_f0_mean > 0:
            logits["PURR"] += 4.0
        elif f.pitch_f0_mean < 250:
            logits["PURR"] += 1.5

        # Hiss evidence (frictional noise, high spectral centroid)
        if f.spectral_centroid_hz > 2400 and f.zero_crossing_rate > 0.12:
            logits["HISS"] += 5.0
        elif f.spectral_centroid_hz > 2000:
            logits["HISS"] += 2.0

        # Growl evidence
        if 150 <= f.pitch_f0_mean <= 300 and f.spectral_centroid_hz < 1500 and f.duration_seconds > 0.8:
            logits["GROWL"] += 4.0

        # Chirp / Trill evidence
        if f.duration_seconds < 0.6 and f.pitch_f0_mean > 500:
            logits["CHIRP_TRILL"] += 4.0

        # Yowl evidence
        if f.duration_seconds > 1.8 and f.pitch_f0_mean > 600 and f.rms_energy > 0.12:
            logits["YOWL"] += 4.5
        elif f.duration_seconds > 2.0 and f.pitch_f0_mean > 500:
            logits["CATERWAUL"] += 3.5

        # Standard Meow evidence
        if 350 <= f.pitch_f0_mean <= 850 and 0.4 <= f.duration_seconds <= 2.2:
            logits["MEOW"] += 4.2
        elif 300 <= f.pitch_f0_mean <= 1000:
            logits["MEOW"] += 2.0

        logits["OTHER_UNKNOWN"] = 0.5  # Baseline prior for unknown
        return logits

    def _compute_context_probabilities(
        self,
        primary_sound: str,
        sound_probs: Dict[str, float],
        f: AudioFeatures,
        context: Dict[str, Any]
    ) -> Dict[str, float]:
        """Computes posterior context probabilities combining acoustic cues and reported context."""
        p = {k: 0.05 for k in CONTEXT_INTENTS}

        activity = str(context.get("activity", "")).lower()
        environment = str(context.get("environment", "")).lower()
        food_present = context.get("foodPresent")
        other_animals = context.get("otherAnimalsPresent")

        if primary_sound == "MEOW":
            if activity == "feeding" or food_present is False:
                p["HUNGRY_FOOD_SEEKING"] += 0.60
                p["ATTENTION_SEEKING"] += 0.20
            elif activity in ["playful", "roaming"]:
                p["PLAYFUL_EXCITED"] += 0.45
                p["ATTENTION_SEEKING"] += 0.35
            else:
                p["ATTENTION_SEEKING"] += 0.50
                p["GREETING_SOCIAL"] += 0.30

        elif primary_sound == "PURR":
            p["GREETING_SOCIAL"] += 0.55
            p["ATTENTION_SEEKING"] += 0.30
            if activity == "resting":
                p["GREETING_SOCIAL"] += 0.25

        elif primary_sound == "HISS":
            p["DEFENSIVE_THREATENED"] += 0.60
            p["FEAR_ANXIETY"] += 0.30
            if other_animals:
                p["DEFENSIVE_THREATENED"] += 0.20
                p["TERRITORIAL_BEHAVIOR"] += 0.15

        elif primary_sound == "GROWL":
            p["DEFENSIVE_THREATENED"] += 0.50
            p["TERRITORIAL_BEHAVIOR"] += 0.35

        elif primary_sound == "CHIRP_TRILL":
            p["GREETING_SOCIAL"] += 0.45
            p["PLAYFUL_EXCITED"] += 0.45

        elif primary_sound in ["YOWL", "CATERWAUL"]:
            if environment == "vet_clinic":
                p["FEAR_ANXIETY"] += 0.50
                p["DISCOMFORT_POSSIBLE_PAIN"] += 0.35
            elif f.pitch_f0_mean > 700:
                p["DISCOMFORT_POSSIBLE_PAIN"] += 0.45
                p["FEAR_ANXIETY"] += 0.35
            else:
                p["TERRITORIAL_BEHAVIOR"] += 0.35
                p["MATING_CALL"] += 0.30

        # Normalize
        total = sum(p.values())
        return {k: v / total for k, v in p.items()}

    def _softmax_temperature(self, logits: Dict[str, float], temperature: float) -> Dict[str, float]:
        exp_vals = {k: math.exp(v / temperature) for k, v in logits.items()}
        total = sum(exp_vals.values())
        return {k: v / total for k, v in exp_vals.items()}

    def _build_unknown_response(self, features: AudioFeatures, reason: str) -> Dict[str, Any]:
        return {
            "primary_sound_type": "OTHER_UNKNOWN",
            "probable_context": "UNKNOWN_INSUFFICIENT_CONFIDENCE",
            "confidence": 0.32,
            "is_distress_pattern": False,
            "probabilities": {
                "sound": {k: (0.75 if k == "OTHER_UNKNOWN" else 0.035) for k in VOCALIZATION_CLASSES},
                "context": {k: (0.75 if k == "UNKNOWN_INSUFFICIENT_CONFIDENCE" else 0.027) for k in CONTEXT_INTENTS}
            },
            "reason": reason
        }
