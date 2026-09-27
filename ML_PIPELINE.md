# Machine Learning & Bioacoustic Pipeline Documentation
## Project: MewSense (AI-Powered Cat Vocalization Analysis)

---

## 1. Scientific Principles & Ethical Stance

Feline acoustic signals do not constitute a human-like syntactic language with discrete words. Feline vocalizations evolved primarily for mother-offspring contact, territorial boundary maintenance, and human-cat domestication reinforcement.

Therefore, **MewSense strictly avoids claiming that AI can translate cat thoughts**. The platform is an **AI-assisted feline bioacoustic analysis and contextual estimation system**.

```mermaid
flowchart TD
    Audio[Raw Audio Stream\n16 kHz PCM] --> Preprocess[DSP Preprocessing\nDC offset removal, Normalization, SNR]
    Preprocess --> FeatureExt[Feature Extraction\n128 Mel Bands, 20 MFCCs, F0 Pitch, Spectral Centroid, ZCR]
    
    FeatureExt --> SoundClassifier[Stage 1: Acoustic Vocalization Classifier\nMeow, Purr, Hiss, Growl, Chirp, Yowl, Other]
    Context[User & Environmental Context\nCat Age, Activity, Feeding, Proximity] --> BayesianFusion[Stage 2: Bayesian Context Fusion\nP(Behavior | Sound, Context)]
    
    SoundClassifier --> BayesianFusion
    BayesianFusion --> Calibrate[Stage 3: Softmax Temperature Calibration\n& OOD Thresholding (tau = 0.45, SNR >= 6 dB)]
    
    Calibrate --> Decision{Confidence >= 0.45?}
    Decision -- Yes --> ExplainEngine[Explainability Engine\nTransparent Rationale & Veterinary Safety Notice]
    Decision -- No --> Unknown[Unknown / Insufficient Confidence]
```

---

## 2. Acoustic Taxonomies

### 2.1 Acoustic Vocalization Classes
1. **MEOW:** Harmonic tonal vocalization with fundamental frequency ($F_0$) typically between 350 Hz and 900 Hz. Duration 0.4s – 2.0s.
2. **PURR:** Low-frequency continuous acoustic rumble produced by rhythmic laryngeal twitching (typically 25 Hz – 150 Hz), low spectral centroid ($< 500$ Hz), very low zero-crossing rate ($< 0.05$).
3. **HISS:** Unvoiced turbulent frictional noise produced through open mouth with retracted lips. Characterized by elevated high-frequency spectral centroid ($> 2400$ Hz) and high ZCR ($> 0.12$).
4. **GROWL:** Harsh, low-register resonant warning vocalization ($F_0 \approx 150\text{–}300$ Hz) with sustained acoustic energy.
5. **CHIRP / TRILL:** Rapid ascending frequency modulation, short duration ($< 0.6$s), greeting and invitation signal.
6. **CATERWAUL / YOWL:** Prolonged, loud, modulated vocalization ($> 1.8$s) often associated with reproductive signaling, intense distress, or territorial friction.
7. **OTHER / UNKNOWN:** Non-matching acoustic profiles, ambient speech, or background noise.

### 2.2 Contextual Intent States
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

---

## 3. Dataset Governance & Leakage Prevention

### 3.1 Strict Group-Based Splitting by Cat
Individual felines possess distinct acoustic signatures (formant structures and vocal tract resonances).
**Rule:** Randomly partitioning recordings into train and test sets leads to massive data leakage, producing artificially inflated test scores.
MewSense implements **group-based splitting by individual cat (`group_cat_id`)** in `ml/datasets/pipeline.py`:
$$\text{Cats}(\text{Train}) \cap \text{Cats}(\text{Test}) = \emptyset$$

### 3.2 Multi-Annotator Agreement (Fleiss' & Cohen's Kappa)
All training samples require consensus across independent annotators:
$$\kappa = \frac{P_o - P_e}{1 - P_e}$$
Samples with $\kappa < 0.65$ are routed for secondary veterinary behaviorist review or excluded.

---

## 4. Evaluation Suite & Metrics

MewSense does **not** rely solely on accuracy. Models are benchmarked on:
* **Macro F1:** Balances rare vocalization classes (e.g. growls, yowls) with common meows.
* **Distress Subgroup Sensitivity:** Evaluates true positive detection for potential pain, fear, or defensive states.
* **Expected Calibration Error (ECE):** Assesses whether a predicted 80% confidence corresponds to 80% empirical accuracy.
* **OOD Rejection Rate:** Measures the system's ability to output "Unknown / Insufficient confidence" on noisy or unclassifiable inputs.
