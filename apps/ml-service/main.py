"""FastAPI ML Microservice Entrypoint for MewSense."""

import os
import json
from typing import Optional
from fastapi import FastAPI, File, Form, UploadFile, Header, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from features import FeatureExtractor
from model import CalibratedAcousticEnsemble
from explain import ExplainabilityEngine

app = FastAPI(
    title="MewSense ML Microservice",
    description="Bioacoustic feature extraction and probabilistic behavioral context estimation for feline vocalizations",
    version="1.0.0"
)

# Composition Root
feature_extractor = FeatureExtractor()
model_ensemble = CalibratedAcousticEnsemble(temperature=1.2)
explain_engine = ExplainabilityEngine()

EXPECTED_SECRET = os.getenv("ML_SERVICE_SECRET", "mewsense-internal-ml-secret-key")


def verify_secret(x_ml_service_secret: Optional[str] = Header(None)):
    if EXPECTED_SECRET and x_ml_service_secret != EXPECTED_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-ML-Service-Secret header"
        )


@app.get("/v1/health")
def health():
    return {
        "status": "healthy",
        "service": "mewsense-ml-service",
        "model_version": "mewsense-acoustic-v1.0",
        "device": "cpu",
        "version": "1.0.0"
    }


@app.post("/v1/features")
async def extract_features(
    audio: UploadFile = File(...),
    x_ml_service_secret: Optional[str] = Header(None)
):
    verify_secret(x_ml_service_secret)
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file provided.")

    try:
        features = feature_extractor.extract_from_bytes(audio_bytes)
        return {
            "success": True,
            "data": {
                "durationSeconds": features.duration_seconds,
                "sampleRate": features.sample_rate,
                "rmsEnergy": features.rms_energy,
                "pitchF0Mean": features.pitch_f0_mean,
                "pitchF0Min": features.pitch_f0_min,
                "pitchF0Max": features.pitch_f0_max,
                "spectralCentroidHz": features.spectral_centroid_hz,
                "zeroCrossingRate": features.zero_crossing_rate,
                "snrDb": features.snr_db,
                "melSpectrogramSummary": features.mel_spectrogram_summary
            }
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Feature extraction failed: {str(e)}")


@app.post("/v1/infer")
async def infer_vocalization(
    audio: UploadFile = File(...),
    context: Optional[str] = Form(None),
    x_ml_service_secret: Optional[str] = Header(None)
):
    verify_secret(x_ml_service_secret)
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file provided.")

    parsed_context = {}
    if context:
        try:
            parsed_context = json.loads(context)
        except Exception:
            parsed_context = {}

    try:
        # 1. Digital Signal Processing & Feature Extraction
        features = feature_extractor.extract_from_bytes(audio_bytes)

        # 2. Acoustic Ensemble & Contextual Inference
        prediction_result = model_ensemble.predict(features, parsed_context)

        # 3. Transparent Explainability Generation
        explanation_context = {
            **parsed_context,
            "detection_status": prediction_result.get("detection_status", "CAT_VOCALIZATION")
        }
        explanation_result = explain_engine.generate_explanation(
            primary_sound=prediction_result["primary_sound_type"],
            probable_context=prediction_result["probable_context"],
            confidence=prediction_result["confidence"],
            is_distress=prediction_result["is_distress_pattern"],
            features=features,
            context=explanation_context
        )

        return {
            "success": True,
            "data": {
                "audioCharacteristics": {
                    "durationSeconds": features.duration_seconds,
                    "sampleRate": features.sample_rate,
                    "rmsEnergy": features.rms_energy,
                    "pitchF0Mean": features.pitch_f0_mean,
                    "pitchF0Min": features.pitch_f0_min,
                    "pitchF0Max": features.pitch_f0_max,
                    "spectralCentroidHz": features.spectral_centroid_hz,
                    "zeroCrossingRate": features.zero_crossing_rate,
                    "snrDb": features.snr_db
                },
                "prediction": {
                    "detectionStatus": prediction_result.get("detection_status", "CAT_VOCALIZATION"),
                    "predictionStatus": prediction_result.get("prediction_status", "VALID"),
                    "openSetStatus": prediction_result.get("open_set_status", "KNOWN_CAT_SOUND"),
                    "catProbability": prediction_result.get("cat_probability", 1.0),
                    "primarySoundType": prediction_result["primary_sound_type"],
                    "probableContext": prediction_result["probable_context"],
                    "confidence": prediction_result["confidence"],
                    "isDistressPattern": prediction_result["is_distress_pattern"],
                    "probabilities": prediction_result["probabilities"],
                    "explanationText": explanation_result["explanation"],
                    "scientificDisclaimer": explanation_result["disclaimer"],
                    "modelVersion": "mewsense-acoustic-v1.0"
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Inference failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
