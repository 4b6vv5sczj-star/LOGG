# LOGG v0.11.1 — Identity iOS Fix

- Uses Google sign-in popup initiated directly by the user gesture; no redirect sign-in path.
- Sets Firebase browser-local auth persistence before sign-in.
- Restores UI from `onAuthStateChanged`.
- Adds visible, non-secret authentication diagnostics to the Identity sheet.
- Keeps the existing authenticated Bearer-token speech request and backend token verification unchanged.
- Bumps service-worker/cache assets to v0.11.1.

If sign-in still fails, copy the exact `auth/...` status shown in the Identity sheet. Do not change Cloud Run IAM while diagnosing client sign-in.
