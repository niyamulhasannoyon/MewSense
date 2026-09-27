# Product Requirements Document (PRD)
## Project Name: MewSense (AI-Powered Cat Vocalization Analysis Application)
**Tagline:** *Understand the Sound, Not Just the Meow.*  
**Document Version:** 1.0.0  
**Status:** Approved / In Development  
**Lead Architect & Engineers:** Senior Staff Architecture & ML Engineering Team  

---

## 1. Executive Summary & Scientific Positioning

MewSense is an enterprise-grade, privacy-centric, AI-assisted cat sound analysis platform designed to help cat guardians, animal shelters, veterinary assistants, and feline behaviorists gain probabilistic insights into cat vocalizations and associated contextual behaviors.

### 1.1 Critical Scientific & Ethical Boundary
* **No Literal Translation Claim:** MewSense **never** claims that "AI can translate cat language" or understand feline thoughts. Feline acoustic communication is multimodal, contextual, and evolutionary.
* **Terminology:** The system explicitly uses the terms **"AI-powered cat vocalization analysis"** and **"Probabilistic interpretation of cat vocalizations"**.
* **Medical Disclaimer:** MewSense is **never a diagnostic tool** and does **not** replace professional veterinary examination. Whenever vocalizations match acoustic profiles correlated with feline acute/chronic distress or discomfort, the system prominently displays:
  > *"This audio contains patterns sometimes associated with distress or discomfort. This is not a medical diagnosis. If your cat appears unwell or exhibits changes in behavior, consult a qualified veterinarian immediately."*
* **Scientific Uncertainty:** When confidence falls below established calibration thresholds, the system explicitly reports **"Unknown / Insufficient confidence"** rather than forcing a low-confidence classification.

---

## 2. Target Users & Personas

1. **Everyday Cat Guardians:**
   * Needs: Wants to understand why their cat is meowing at specific hours (e.g., night yowling, door scratching, food begging), track behavioral trends over time, and build profiles for their individual cats.
   * Pain Points: Confusion over differences between attention-seeking, hunger, and stress vocalizations; anxiety over health indicators.
2. **Multi-Cat Households:**
   * Needs: Profile separation per cat; tracking vocal dynamics, territorial behavior, or inter-cat friction.
3. **Animal Welfare & Shelter Staff:**
   * Needs: Rapid triage and behavioral log of newly admitted, scared, or vocal felines to assess stress levels in shelter environments.
4. **Behavioral Researchers & Annotators:**
   * Needs: High-fidelity audio metadata, spectrogram reviews, annotator agreement workflows (Cohen's / Fleiss' Kappa), verified ground-truth curation without data leakage.

---

## 3. User Stories

* **US-1 (Audio Capture & Upload):** As a user, I can record a cat sound directly in the web/mobile app with real-time waveform feedback or upload an existing audio file (`.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`), capped at 15MB and 60 seconds.
* **US-2 (Contextual Augmentation):** As a user, I can augment the recording with crucial feline context: selected cat profile, age, sex, breed, current environment (indoors/outdoors/vet clinic), activity (resting, playing, roaming), presence of food, and presence of other animals or strangers.
* **US-3 (Asynchronous Inference & Real-Time Feedback):** As a user, I can observe real-time progress steps (`Uploading` -> `Processing Audio` -> `Extracting Features` -> `Running AI Model` -> `Generating Interpretation` -> `Completed`) via SSE / WebSocket with polling fallback.
* **US-4 (Probabilistic Interpretation Results):** As a user, I receive:
  * Primary sound classification (e.g., *Meow*, *Purr*, *Hiss*, *Growl*, *Chirp/Trill*, *Caterwaul*, *Yowl*, *Unknown*).
  * Probable behavioral context (e.g., *Attention-seeking*, *Food-seeking*, *Greeting/Social*, *Playful/Excited*, *Fear/Anxiety*, *Defensive/Threatened*, *Discomfort/Possible pain*, *Territorial*, *Unknown*).
  * Calibrated confidence score (percentage).
  * Audio characteristics summary (duration, pitch/fundamental frequency $F_0$, spectral energy, tempo/repetition).
  * Scientifically honest explainability statement.
  * Veterinary disclaimer if distress markers are detected.
* **US-5 (Cat Profiles & History):** As a user, I can create and manage cat profiles (avatar, breed, age, spayed/neutered status, medical history notes) and review historical sound analyses with filtering.
* **US-6 (Feedback & Continuous Learning Loop):** As a user, I can mark predictions as helpful/accurate or flag discrepancies.
* **US-7 (Privacy & Data Governance):** As a user, my recordings are strictly private. I have a granular opt-in setting: *"Allow my anonymized recordings to be used to improve the research model"*. I can request full export or permanent deletion of my data (GDPR/CCPA compliant).
* **US-8 (Multilingual Access):** As a user, I can switch between English and Bangla (বাংলা).
* **US-9 (Admin & Research Portal):** As an annotator/admin, I can view aggregate system metrics, queue throughput, model versions, review consented samples, calculate inter-annotator agreement, and trigger model promotions or rollbacks.

---

## 4. Functional Requirements

### 4.1 Audio Ingestion & Validation
* Support formats: `audio/wav`, `audio/mpeg`, `audio/mp4`, `audio/x-m4a`, `audio/ogg`, `audio/webm`.
* Maximum duration: 60 seconds; minimum duration: 0.5 seconds.
* Validation checks: magic byte inspection, mime-type verification, FFprobe audio integrity validation, channel normalization (mono conversion), and standard sample rate conversion (16 kHz / 22.05 kHz).
* Secure upload: Pre-signed upload URLs to Object Storage (S3 / Cloudflare R2 / MinIO / Local storage abstraction); zero direct file streaming through database.

### 4.2 Machine Learning Inference & Pipeline
* **Vocalization Taxonomy (Acoustic Level):**
  * `MEOW`
  * `PURR`
  * `HISS`
  * `GROWL`
  * `CHIRP_TRILL`
  * `CATERWAUL`
  * `YOWL`
  * `OTHER_UNKNOWN`
* **Behavioral / Contextual Interpretation Taxonomy:**
  * `HUNGRY_FOOD_SEEKING`
  * `ATTENTION_SEEKING`
  * `GREETING_SOCIAL`
  * `PLAYFUL_EXCITED`
  * `FEAR_ANXIETY`
  * `DEFENSIVE_THREATENED`
  * `DISCOMFORT_POSSIBLE_PAIN`
  * `MATING_CALL`
  * `TERRITORIAL_BEHAVIOR`
  * `UNKNOWN_INSUFFICIENT_CONFIDENCE`
* **Confidence Calibration & Thresholding:**
  * Softmax temperature scaling and Platt calibration.
  * Fallback to `UNKNOWN_INSUFFICIENT_CONFIDENCE` if maximum calibrated probability $< 0.45$ or if background SNR is too low ($< 6 \text{ dB}$).
* **Feature Extraction Suite:**
  * 128-band Mel Spectrogram ($f_{\min}=50\text{ Hz}, f_{\max}=8000\text{ Hz}$).
  * 20 Mel-Frequency Cepstral Coefficients (MFCCs) + $\Delta$ + $\Delta\Delta$.
  * Pitch / Fundamental frequency ($F_0$) tracking via PYIN.
  * Spectral Centroid, Bandwidth, Rolloff, Zero-Crossing Rate (ZCR), RMS energy.
* **Explainability Engine:**
  * Deterministic rule-assisted NLG template generator combining acoustic metrics (e.g. rising pitch slope, high energy in 1.5–3 kHz range, duration) and user context to synthesize transparent rationale.

### 4.3 Background Queue & Job Processing
* Queue: Redis + BullMQ with dead-letter queue (DLQ), automatic retries with exponential backoff, job idempotency based on recording hash.
* Real-time events: Server-Sent Events (SSE) `/api/v1/analysis/:id/stream` + WebSocket gateway with polling fallback (`GET /api/v1/analysis/:id`).

### 4.4 Data Model & Storage
* PostgreSQL with Prisma ORM.
* UUIDv4 primary keys, timestamps (`createdAt`, `updatedAt`), soft deletion (`deletedAt`), strictly indexed foreign keys and query paths.
* Dedicated tables: `User`, `Cat`, `AudioRecording`, `AudioMetadata`, `Analysis`, `Prediction`, `ModelVersion`, `Feedback`, `DatasetSample`, `DatasetAnnotation`, `AuditLog`.

---

## 5. Non-Functional Requirements

### 5.1 Performance & Latency
* P95 Audio ingestion to queue: $< 350\text{ ms}$.
* P95 Inference turnaround (Audio file $\le 10\text{s}$): $< 1.8\text{ s}$ on CPU, $< 600\text{ ms}$ on GPU.
* Web client Initial Contentful Paint (FCP): $< 1.2\text{ s}$; Lighthouse Accessibility & Best Practices score $\ge 95$.

### 5.2 Security & Compliance
* Passwords hashed using **Argon2id** (or high-cost bcrypt fallback).
* Short-lived JWT access tokens (15m) + secure HTTP-only refresh tokens (7d) with token rotation and revocation list.
* Strict Content Security Policy (CSP), CORS, Rate Limiting (Redis token-bucket: 60 req/min general, 10 uploads/min per user).
* Role-Based Access Control (RBAC): `USER`, `ANNOTATOR`, `RESEARCHER`, `ADMIN`, `SUPER_ADMIN`.
* Zero storage of private bucket keys or credentials in client bundles.

### 5.3 Reliability & Fault Tolerance
* Graceful degradation: If ML microservice is unreachable, jobs are kept in BullMQ with exponential backoff and user alerted with honest status.
* Database connections pooled via Prisma with transaction safety.

---

## 6. MVP Scope vs. Future Roadmap

| Feature Category | MVP Scope (Phase 1–15) | Post-MVP / Enterprise Scope |
| :--- | :--- | :--- |
| **Acoustic Inference** | Preprocessing, 128-band Mel Spectrogram, MFCCs + Audio feature extraction, Ensemble ML classifier + PyTorch CNN model, Confidence calibration | AST (Audio Spectrogram Transformer) fine-tuning on 100k+ field recordings |
| **Context Integration** | Bayesian / rule-weighted fusion of acoustic probabilities with user environment & cat profile context | Multi-modal sequence transformer modeling multi-turn cat-human vocal dialogue |
| **Platforms** | Responsive Web Application (Desktop/Tablet/Mobile Next.js PWA) + React Native Expo Mobile App Client | Wearable smart-collar audio streamer |
| **Language Support** | English (en) and Bengali (bn) | Spanish, French, Japanese, German |
| **Annotation Tools** | Admin multi-annotator review portal with agreement metrics (Cohen's Kappa) | Active learning automated sample selection loop |

---

## 7. Quality Gates & Acceptance Criteria
* Full suite of unit tests, integration tests, ML pipeline verification tests, and mock end-to-end user flows.
* Zero unhandled promise rejections or TypeScript type suppression errors (`noImplicitAny: true`).
* Comprehensive developer and deployment documentation.
