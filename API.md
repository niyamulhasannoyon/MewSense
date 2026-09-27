# REST API Specification Document
## Project Name: MewSense (AI-Powered Cat Vocalization Analysis Application)
**API Version:** `v1`  
**Base URL:** `/api/v1`  
**Format:** JSON (UTF-8)  

---

## 1. Global Standards & Conventions

### 1.1 Standard Response Envelope
All API endpoints return a standardized envelope schema:

```typescript
// Success Envelope
{
  "success": true,
  "data": T,
  "error": null,
  "meta": {
    "requestId": "req_8f17a93c-234b-4c28",
    "timestamp": "2026-09-27T11:00:00.000Z"
  }
}

// Error Envelope
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid file format. Supported formats: .wav, .mp3, .m4a, .ogg, .webm",
    "details": [
      {
        "field": "mimeType",
        "message": "audio/midi is not an allowed feline audio mime type"
      }
    ]
  },
  "meta": {
    "requestId": "req_8f17a93c-234b-4c28",
    "timestamp": "2026-09-27T11:00:00.000Z"
  }
}
```

### 1.2 Common HTTP Status Codes
* `200 OK`: Request succeeded.
* `201 Created`: Resource successfully created.
* `202 Accepted`: Job queued for asynchronous processing.
* `400 Bad Request`: Payload validation failed.
* `401 Unauthorized`: Missing or invalid JWT access token.
* `403 Forbidden`: Insufficient role or access rights.
* `404 Not Found`: Target resource does not exist.
* `413 Payload Too Large`: Audio file exceeds maximum limit (15 MB).
* `422 Unprocessable Entity`: Audio corrupted or unparseable.
* `429 Too Many Requests`: Rate limit exceeded.
* `500 Internal Server Error`: Unhandled server exception.

---

## 2. Authentication & User Profile Endpoints

### 2.1 Register New Account
* **Endpoint:** `POST /api/v1/auth/register`
* **Access:** Public
* **Request Body:**
```json
{
  "email": "guardian@example.com",
  "password": "StrongPassword!2026",
  "fullName": "Jane Doe",
  "allowTrainingConsent": true,
  "languagePreference": "en"
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "7488f7b5-24c6-47a2-944a-b51f0ba2b442",
      "email": "guardian@example.com",
      "fullName": "Jane Doe",
      "role": "USER",
      "allowTrainingConsent": true,
      "languagePreference": "en"
    },
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 900
  }
}
```

### 2.2 Authenticate / Login
* **Endpoint:** `POST /api/v1/auth/login`
* **Access:** Public
* **Request Body:**
```json
{
  "email": "guardian@example.com",
  "password": "StrongPassword!2026"
}
```
* **Response (200 OK):** Returns `accessToken`, sets HTTP-only `refreshToken` cookie.

### 2.3 Refresh Token
* **Endpoint:** `POST /api/v1/auth/refresh`
* **Access:** Public (requires HTTP-only refresh cookie)

### 2.4 Get Current User Profile
* **Endpoint:** `GET /api/v1/auth/me`
* **Access:** Authenticated

---

## 3. Cat Profile Endpoints

### 3.1 List User's Cats
* **Endpoint:** `GET /api/v1/cats`
* **Access:** Authenticated
* **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Mochi",
      "breed": "Scottish Fold",
      "birthDate": "2023-04-12",
      "sex": "FEMALE",
      "isNeutered": true,
      "avatarUrl": "https://cdn.mewsense.app/cats/mochi.jpg",
      "recordingCount": 14,
      "createdAt": "2026-01-10T08:00:00.000Z"
    }
  ]
}
```

### 3.2 Create Cat Profile
* **Endpoint:** `POST /api/v1/cats`
* **Access:** Authenticated
* **Request Body:**
```json
{
  "name": "Luna",
  "breed": "Domestic Shorthair",
  "birthDate": "2024-06-01",
  "sex": "FEMALE",
  "isNeutered": true,
  "medicalNotes": "Sensitive stomach"
}
```

### 3.3 Get, Update & Delete Cat
* `GET /api/v1/cats/:id`
* `PATCH /api/v1/cats/:id`
* `DELETE /api/v1/cats/:id` (Soft deletes profile)

---

## 4. Audio Ingestion Endpoints

### 4.1 Request Pre-Signed Upload URL
* **Endpoint:** `POST /api/v1/audio/presign-upload`
* **Access:** Authenticated
* **Request Body:**
```json
{
  "catId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "filename": "meow_morning.wav",
  "mimeType": "audio/wav",
  "fileSizeBytes": 204800,
  "source": "MICROPHONE_WEB",
  "context": {
    "environment": "indoor",
    "activity": "feeding",
    "foodPresent": false,
    "otherAnimalsPresent": false,
    "userNotes": "Standing near empty food bowl"
  }
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "recordingId": "88776655-4433-2211-00aa-bbccddeeff00",
    "uploadUrl": "https://storage.mewsense.app/upload/signed?token=...",
    "fileKey": "recordings/2026/09/88776655-4433.wav",
    "requiredHeaders": {
      "Content-Type": "audio/wav"
    },
    "expiresInSeconds": 300
  }
}
```

### 4.2 Direct Audio Upload (Dev / Local Fallback)
* **Endpoint:** `POST /api/v1/audio/upload`
* **Access:** Authenticated
* **Payload:** `multipart/form-data` with `audio` file and optional `catId` and contextual parameters.

---

## 5. Vocalization Analysis Endpoints

### 5.1 Enqueue Analysis
* **Endpoint:** `POST /api/v1/analysis`
* **Access:** Authenticated
* **Request Body:**
```json
{
  "recordingId": "88776655-4433-2211-00aa-bbccddeeff00",
  "priority": "normal"
}
```
* **Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "analysisId": "ccbbaa99-8877-6655-4433-221100aabbcc",
    "status": "QUEUED",
    "streamUrl": "/api/v1/analysis/ccbbaa99-8877-6655-4433-221100aabbcc/stream",
    "estimatedWaitMs": 1500
  }
}
```

### 5.2 Real-Time SSE Progress Stream
* **Endpoint:** `GET /api/v1/analysis/:id/stream`
* **Access:** Authenticated (or ticket-authenticated for EventSource)
* **Protocol:** Server-Sent Events (`text/event-stream`)
* **Event sequence:**
```text
event: progress
data: {"stage":"audio_prep","percent":20,"message":"Validating audio sample rate"}

event: progress
data: {"stage":"feature_ext","percent":50,"message":"Extracting Mel Spectrogram and pitch F0"}

event: progress
data: {"stage":"ai_model","percent":80,"message":"Running acoustic ensemble classifier"}

event: completed
data: { ... full prediction payload ... }
```

### 5.3 Fetch Analysis Result (Polling Fallback)
* **Endpoint:** `GET /api/v1/analysis/:id`
* **Access:** Authenticated
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "ccbbaa99-8877-6655-4433-221100aabbcc",
    "status": "COMPLETED",
    "createdAt": "2026-09-27T11:02:00.000Z",
    "latencyMs": 1120,
    "recording": {
      "id": "88776655-4433-2211-00aa-bbccddeeff00",
      "catName": "Mochi",
      "audioUrl": "https://storage.mewsense.app/signed/audio.wav"
    },
    "audioCharacteristics": {
      "durationSeconds": 1.42,
      "pitchMeanHz": 580.4,
      "pitchMinHz": 440.0,
      "pitchMaxHz": 720.0,
      "spectralCentroidHz": 1840.5,
      "rmsEnergy": 0.082,
      "snrDb": 18.2
    },
    "prediction": {
      "soundType": "MEOW",
      "probableContext": "HUNGRY_FOOD_SEEKING",
      "confidence": 0.84,
      "isDistressPattern": false,
      "probabilities": {
        "sound": {
          "MEOW": 0.89,
          "PURR": 0.02,
          "CHIRP_TRILL": 0.05,
          "OTHER_UNKNOWN": 0.04
        },
        "context": {
          "HUNGRY_FOOD_SEEKING": 0.84,
          "ATTENTION_SEEKING": 0.11,
          "GREETING_SOCIAL": 0.03,
          "UNKNOWN_INSUFFICIENT_CONFIDENCE": 0.02
        }
      },
      "explanation": "Based on a rising fundamental frequency contour (440 Hz to 720 Hz), duration (1.42s), and user context indicating an upcoming mealtime, the model identifies acoustic characteristics consistent with solicitation and food-seeking behavior.",
      "scientificDisclaimer": "This is an AI-generated probabilistic interpretation of cat vocalizations, not a literal translation or medical diagnosis. Individual cat communication styles vary.",
      "modelVersion": "mewsense-acoustic-v1.0"
    }
  }
}
```

### 5.4 Historical Analyses List
* **Endpoint:** `GET /api/v1/analysis/history?page=1&limit=20&catId=...&soundType=MEOW`
* **Access:** Authenticated

---

## 6. Feedback & Model Improvement Endpoints

### 6.1 Submit User Feedback
* **Endpoint:** `POST /api/v1/feedback`
* **Access:** Authenticated
* **Request Body:**
```json
{
  "analysisId": "ccbbaa99-8877-6655-4433-221100aabbcc",
  "isAccurate": true,
  "userPerceivedSound": "MEOW",
  "userPerceivedContext": "HUNGRY_FOOD_SEEKING",
  "notes": "She ran to her bowl right after!"
}
```

---

## 7. Machine Learning Internal API (`apps/ml-service`)

* **Base URL:** `http://localhost:8000/v1`
* **Header Auth:** `X-ML-Service-Secret: <SECRET>`
* **Endpoints:**
  * `POST /v1/infer`: Accepts binary audio stream or storage key + contextual JSON, returns extracted features, calibrated vocalization probabilities, contextual probabilities, and explainability text.
  * `POST /v1/features`: Dedicated DSP endpoint returning Mel spectrogram matrix, MFCCs, $F_0$ pitch tracking, and energy metrics.
  * `GET /v1/health`: Health probe reporting loaded model version, GPU availability, and inference memory usage.
