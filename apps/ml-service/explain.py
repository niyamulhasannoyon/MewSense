"""Scientific Explainability & Natural Language Generation Engine."""

from typing import Dict, Any
from features import AudioFeatures

GENERAL_DISCLAIMER = (
    "This is an AI-generated probabilistic interpretation of cat vocalizations, "
    "not a literal translation or medical diagnosis. Feline vocal communication is "
    "context-dependent, multimodal, and varies between individual cats."
)

DISTRESS_DISCLAIMER = (
    "This audio contains patterns sometimes associated with distress or discomfort. "
    "This is not a medical diagnosis. If your cat appears unwell, vocalizes persistently, "
    "or displays behavioral changes, consult a qualified veterinarian."
)


class ExplainabilityEngine:
    """Generates transparent, scientifically honest rationale for predictions."""

    @staticmethod
    def generate_explanation(
        primary_sound: str,
        probable_context: str,
        confidence: float,
        is_distress: bool,
        features: AudioFeatures,
        context: Dict[str, Any]
    ) -> Dict[str, str]:
        reasons = []

        # Acoustic characteristics explanation
        pitch_desc = (
            f"fundamental frequency F0 averaging {features.pitch_f0_mean} Hz "
            f"(range {features.pitch_f0_min} Hz - {features.pitch_f0_max} Hz)"
            if features.pitch_f0_mean > 0
            else "unvoiced spectral noise"
        )
        duration_desc = f"duration of {features.duration_seconds}s"
        centroid_desc = f"spectral centroid at {features.spectral_centroid_hz} Hz"

        reasons.append(f"Acoustic analysis measured a {duration_desc} with {pitch_desc} and {centroid_desc}.")

        # Vocalization specific rationale
        if primary_sound == "MEOW":
            reasons.append("Tonal harmonic contours in this frequency band are characteristic of feline solicitation and communicative meows.")
        elif primary_sound == "PURR":
            reasons.append("Low-frequency continuous acoustic energy with low zero-crossing rate aligns with feline purring vibrations.")
        elif primary_sound == "HISS":
            reasons.append("High-frequency unvoiced turbulence across the upper spectrum corresponds to defensive expiration (hissing).")
        elif primary_sound == "GROWL":
            reasons.append("Low-register resonant vocalization with steady acoustic energy indicates warning or aggressive vocalization.")
        elif primary_sound == "CHIRP_TRILL":
            reasons.append("Short duration, ascending frequency modulation is characteristic of feline trill and greeting calls.")
        elif primary_sound in ["YOWL", "CATERWAUL"]:
            reasons.append("Extended duration and elevated fundamental frequency harmonics indicate intense acoustic signaling.")
        else:
            reasons.append("The acoustic pattern exhibits ambiguous harmonic structure or insufficient signal-to-noise separation.")

        # Context integration rationale
        activity = context.get("activity")
        food_present = context.get("foodPresent")
        other_animals = context.get("otherAnimalsPresent")

        context_notes = []
        if activity and activity != "unknown":
            context_notes.append(f"reported activity '{activity}'")
        if food_present is False:
            context_notes.append("absence of food near routine feeding time")
        elif food_present is True:
            context_notes.append("presence of food")
        if other_animals:
            context_notes.append("proximity of other animals or unfamiliar presence")

        if context_notes:
            reasons.append(f"Combined with the {', '.join(context_notes)}, the model estimates an elevated probability of {probable_context.lower().replace('_', ' ')}.")
        else:
            reasons.append(
                f"Based on acoustic evidence alone, the model estimates {probable_context.lower().replace('_', ' ')}. "
                "Providing additional environmental context (e.g. feeding status, activity) may improve future calibration."
            )

        explanation_text = " ".join(reasons)
        scientific_disclaimer = DISTRESS_DISCLAIMER if is_distress else GENERAL_DISCLAIMER

        return {
            "explanation": explanation_text,
            "disclaimer": scientific_disclaimer
        }
