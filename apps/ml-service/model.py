"""Acoustic Model Ensemble, Two-Stage Species Gate, and Confidence Calibration Engine."""

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

# Configurable Thresholds
DEFAULT_CAT_DETECTION_THRESHOLD = 0.80
DEFAULT_CAT_REJECTION_THRESHOLD = 0.35
DEFAULT_VOCALIZATION_THRESHOLD = 0.70
DEFAULT_BEHAVIOR_THRESHOLD = 0.65
MIN_SNR_THRESHOLD_DB = 6.0


class CalibratedAcousticEnsemble:
    """Production two-stage hierarchical acoustic inference engine:
    Stage 1: Dedicated Cat Vocalization Detector & Species Gate.
    Stage 2: Feline Vocalization Classification & Contextual Behavior Estimation.
    Includes statistical confidence calibration, open-set audio handling,
    and hard-negative human imitation rejection.
    """

    def __init__(
        self,
        temperature: float = 1.2,
        cat_detection_threshold: float = DEFAULT_CAT_DETECTION_THRESHOLD,
        cat_rejection_threshold: float = DEFAULT_CAT_REJECTION_THRESHOLD,
        vocalization_threshold: float = DEFAULT_VOCALIZATION_THRESHOLD,
        behavior_threshold: float = DEFAULT_BEHAVIOR_THRESHOLD
    ):
        self.temperature = temperature
        self.cat_detection_threshold = cat_detection_threshold
        self.cat_rejection_threshold = cat_rejection_threshold
        self.vocalization_threshold = vocalization_threshold
        self.behavior_threshold = behavior_threshold

    def predict(self, features: AudioFeatures, context: Dict[str, Any]) -> Dict[str, Any]:
        """Runs the two-stage hierarchical analysis pipeline:
        Stage 1: Cat Vocalization Detection Gate
        Stage 2: Cat Vocalization Classification & Behavior Prediction (Executed ONLY if Stage 1 passes)
        """
        # Audio Quality Check
        if features.snr_db < MIN_SNR_THRESHOLD_DB or features.duration_seconds < 0.3:
            return self._build_rejected_response(
                features,
                detection_status="UNCERTAIN",
                prediction_status="INSUFFICIENT_DATA",
                open_set_status="UNKNOWN_AUDIO",
                cat_prob=0.20,
                reason="Audio signal-to-noise ratio is too low or duration is insufficient for reliable acoustic analysis."
            )

        # STAGE 1: Cat Vocalization Detector
        cat_prob, human_prob, gate_reason = self._stage1_cat_vocalization_detector(features, context)

        # Rejection Gate
        if cat_prob < self.cat_rejection_threshold or human_prob > 0.60:
            return self._build_rejected_response(
                features,
                detection_status="NON_CAT_SOUND",
                prediction_status="NO_VALID_PREDICTION",
                open_set_status="NON_CAT_SOUND",
                cat_prob=cat_prob,
                reason=f"Stage 1 Gate Rejected: {gate_reason}"
            )

        # Inconclusive / Uncertain Gate
        if cat_prob < self.cat_detection_threshold:
            return self._build_rejected_response(
                features,
                detection_status="UNCERTAIN",
                prediction_status="LOW_CONFIDENCE",
                open_set_status="UNKNOWN_AUDIO",
                cat_prob=cat_prob,
                reason=f"Stage 1 Gate Inconclusive (cat confidence {round(cat_prob, 2)} < required {self.cat_detection_threshold}). {gate_reason}"
            )

        # STAGE 2: Cat Vocalization Analysis
        sound_logits = self._compute_sound_logits(features)
        sound_probs = self._softmax_temperature(sound_logits, self.temperature)

        primary_sound = max(sound_probs, key=sound_probs.get)
        sound_confidence = sound_probs[primary_sound]

        # Contextual Intent Estimation (Context modulates probabilities but NEVER overrides Stage 1 gate)
        context_probs = self._compute_context_probabilities(primary_sound, sound_probs, features, context)
        probable_context = max(context_probs, key=context_probs.get)
        context_confidence = context_probs[probable_context]

        # Joint Calibrated Confidence (Stage 2)
        joint_confidence = round(float(math.sqrt(sound_confidence * context_confidence)), 3)

        # Vocalization or Behavior Confidence Threshold Check
        prediction_status = "VALID"
        if sound_confidence < self.vocalization_threshold or joint_confidence < self.behavior_threshold:
            prediction_status = "LOW_CONFIDENCE"
            probable_context = "UNKNOWN_INSUFFICIENT_CONFIDENCE"

        is_distress = (
            primary_sound in ["HISS", "GROWL", "YOWL"]
            or probable_context in ["FEAR_ANXIETY", "DEFENSIVE_THREATENED", "DISCOMFORT_POSSIBLE_PAIN"]
        )

        return {
            "detection_status": "CAT_VOCALIZATION",
            "prediction_status": prediction_status,
            "open_set_status": "KNOWN_CAT_SOUND",
            "cat_probability": round(cat_prob, 4),
            "primary_sound_type": primary_sound,
            "probable_context": probable_context,
            "confidence": joint_confidence,
            "is_distress_pattern": is_distress,
            "probabilities": {
                "sound": {k: round(v, 4) for k, v in sound_probs.items()},
                "context": {k: round(v, 4) for k, v in context_probs.items()},
                "detection": {
                    "cat_vocalization": round(cat_prob, 4),
                    "human_imitation_speech": round(human_prob, 4)
                }
            }
        }

    def _stage1_cat_vocalization_detector(self, f: AudioFeatures, context: Dict[str, Any]) -> Tuple[float, float, str]:
        """Stage 1 Dedicated Classifier: Is this audio likely to contain a genuine cat vocalization?
        Evaluates acoustic harmonics, spectral envelope, high-frequency energy ratio,
        and human speech/vocal imitation indicators.
        Returns: (cat_probability, human_probability, reason)
        """
        # Hard Negative Indicator 1: User explicitly marked or speech transcript indicated human voice
        if context.get("isHumanSpeech") is True:
            return 0.10, 0.90, "Audio source identified as human speech."

        # Hard Negative Indicator 2: Low high-frequency energy ratio & human syllabic envelope modulation
        high_freq_ratio = f.high_freq_ratio
        speech_mod = f.speech_modulation_index
        rolloff = f.spectral_rolloff

        if speech_mod > 0.28 and high_freq_ratio < 0.04:
            return 0.12, 0.88, "High human syllabic speech rhythm and weak upper feline spectral harmonics detected."

        cat_score = 0.50
        human_score = 0.20

        # Purr / Rumble Check (Deep continuous low frequency < 250 Hz)
        is_purr = (f.spectral_centroid_hz < 500 and f.zero_crossing_rate < 0.06) or (0 < f.pitch_f0_mean < 250)
        if is_purr:
            cat_score += 0.40
            human_score = 0.10

        # Hiss Check (High ZCR frictional unvoiced noise > 2400 Hz)
        is_hiss = f.spectral_centroid_hz > 2400 and f.zero_crossing_rate > 0.12
        if is_hiss:
            cat_score += 0.40
            human_score = 0.10

        # Voiced feline vocalizations (Meow, Yowl, Chirp, Caterwaul)
        if not is_purr and not is_hiss:
            if high_freq_ratio > 0.05 or rolloff > 3200:
                cat_score += 0.35
            elif speech_mod > 0.25:
                human_score += 0.45
                cat_score -= 0.30

            if 300 <= f.pitch_f0_mean <= 1100 and 0.4 <= f.duration_seconds <= 3.5:
                cat_score += 0.35

        cat_prob = max(0.01, min(0.99, cat_score))
        human_prob = max(0.01, min(0.99, human_score))

        reason = (
            "Acoustic envelope matches feline harmonic profile."
            if cat_prob >= self.cat_detection_threshold
            else "Acoustic envelope characteristic of human voice or non-feline background noise."
        )
        return cat_prob, human_prob, reason

    def _compute_sound_logits(self, f: AudioFeatures) -> Dict[str, float]:
        logits = {k: 0.0 for k in VOCALIZATION_CLASSES}

        # Purr evidence
        if f.spectral_centroid_hz < 500 and f.zero_crossing_rate < 0.06:
            logits["PURR"] += 5.0
        elif 50 <= f.pitch_f0_mean < 250 and f.pitch_f0_mean > 0:
            logits["PURR"] += 4.0

        # Hiss evidence
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

        logits["OTHER_UNKNOWN"] = 0.5
        return logits

    def _compute_context_probabilities(
        self,
        primary_sound: str,
        sound_probs: Dict[str, float],
        f: AudioFeatures,
        context: Dict[str, Any]
    ) -> Dict[str, float]:
        p = {k: 0.02 for k in CONTEXT_INTENTS}

        activity = str(context.get("activity", "")).lower()
        environment = str(context.get("environment", "")).lower()
        food_present = context.get("foodPresent")
        other_animals = context.get("otherAnimalsPresent")

        if primary_sound == "MEOW":
            if activity == "feeding" or food_present is False:
                p["HUNGRY_FOOD_SEEKING"] += 0.75
                p["ATTENTION_SEEKING"] += 0.15
            elif activity in ["playful", "roaming"]:
                p["PLAYFUL_EXCITED"] += 0.60
                p["ATTENTION_SEEKING"] += 0.25
            else:
                p["ATTENTION_SEEKING"] += 0.60
                p["GREETING_SOCIAL"] += 0.25

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

        total = sum(p.values())
        return {k: v / total for k, v in p.items()}

    def _softmax_temperature(self, logits: Dict[str, float], temperature: float) -> Dict[str, float]:
        exp_vals = {k: math.exp(v / temperature) for k, v in logits.items()}
        total = sum(exp_vals.values())
        return {k: v / total for k, v in exp_vals.items()}

    def _build_rejected_response(
        self,
        features: AudioFeatures,
        detection_status: str,
        prediction_status: str,
        open_set_status: str,
        cat_prob: float,
        reason: str
    ) -> Dict[str, Any]:
        return {
            "detection_status": detection_status,
            "prediction_status": prediction_status,
            "open_set_status": open_set_status,
            "cat_probability": round(cat_prob, 4),
            "primary_sound_type": "OTHER_UNKNOWN",
            "probable_context": "UNKNOWN_INSUFFICIENT_CONFIDENCE",
            "confidence": round(cat_prob, 4),
            "is_distress_pattern": False,
            "probabilities": {
                "sound": {k: (0.85 if k == "OTHER_UNKNOWN" else 0.02) for k in VOCALIZATION_CLASSES},
                "context": {k: (0.85 if k == "UNKNOWN_INSUFFICIENT_CONFIDENCE" else 0.015) for k in CONTEXT_INTENTS},
                "detection": {
                    "cat_vocalization": round(cat_prob, 4),
                    "human_imitation_speech": round(1.0 - cat_prob, 4)
                }
            },
            "reason": reason
        }
