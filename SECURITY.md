# Security Architecture & Policies
## Project: MewSense

---

## 1. Threat Modeling & Defenses

| Threat Vector | Severity | Mitigation in MewSense |
| :--- | :--- | :--- |
| **Malicious Audio Uploads** | High | MIME verification, magic byte validation, FFprobe header checks, strictly enforced 15MB file size limit. Audio files stored in non-executable object storage. |
| **Path Traversal Attacks** | High | All storage paths (`storageKey`) are cryptographically generated UUIDs. User inputs never influence file paths or filenames. `LocalStorageProvider` verifies resolved paths remain strictly inside base directory. |
| **Credential / Secret Leakage** | Critical | Database passwords, JWT keys, and bucket secrets are isolated in server environment variables. Zero credentials are baked into client bundles. Startup Zod schema validates all required secrets. |
| **Brute Force & DoS** | Medium | Redis token-bucket rate limiter: 300 requests/minute global, 10 uploads/minute per user. Fast-failing authentication checks. |
| **SQL / NoSQL Injection** | Critical | All database transactions utilize Prisma ORM with parameterized queries. |
| **Session Hijacking** | High | Argon2id password hashing, 15-minute short-lived JWT access tokens, HTTP-only secure refresh tokens with rotation. |

---

## 2. Privacy & GDPR Compliance

1. **Private by Default:** All user audio recordings are strictly private. Recordings can only be accessed by the authenticated owner via signed download URLs.
2. **Explicit Research Opt-In:** User recordings are **never** used for model training without affirmative, separate opt-in consent (`allowTrainingConsent: true`).
3. **Right to Erasure (RTBF):** Deleting a cat profile or user account cascades soft/hard deletion to database records and permanently unlinks audio blobs from storage.
4. **Audit Logging:** Administrative actions, role escalations, and sensitive data access are written to the immutable `audit_logs` table.

---

## 3. Reporting Vulnerabilities

If you identify a security issue in MewSense, please email `security@mewsense.app` with reproduction steps. Do not open public issues for sensitive vulnerabilities.
