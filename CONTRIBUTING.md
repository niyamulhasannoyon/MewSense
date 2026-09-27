# Contributing to MewSense

Thank you for contributing to MewSense! This project adheres to strict standards of scientific integrity, code quality, and feline welfare.

---

## 1. Development Guidelines

1. **Strict TypeScript:** Strict mode enabled across all packages. Avoid `any` without documented reason.
2. **Domain-Driven Design:** Keep business logic decoupled from controllers in the Application & Domain layers.
3. **Scientific Honesty:** Never describe the application as a "cat language translator". Predictions must remain probabilistic with clear confidence levels and veterinary notices.
4. **Data Privacy:** User audio recordings must never be committed to git or used in training without explicit consent.

---

## 2. Pull Request Workflow

1. Fork the repo and create a feature branch (`git checkout -b feature/acoustic-improvements`).
2. Run automated test suites:
   ```bash
   pnpm test
   PYTHONPATH=apps/ml-service pytest apps/ml-service/test_ml.py
   ```
3. Verify typecheck and production build:
   ```bash
   pnpm typecheck
   pnpm build
   ```
4. Submit your pull request with a descriptive summary of your changes.
