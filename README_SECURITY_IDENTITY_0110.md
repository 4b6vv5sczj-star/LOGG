# LOGG v0.11.0 — Identity Security

Google Identity Platform sign-in is added. Speech requests carry an Identity Platform ID token, and Cloud Run verifies it with Firebase Admin before accepting audio. No service-account key is stored in the frontend.

Optional Cloud Run environment variable: `AUTH_ALLOWED_EMAILS` (comma-separated). If set, only those verified Google accounts may transcribe. If unset, any verified Identity Platform Google user can transcribe.

Keep Cloud Run `Allow public access` for this phase: application-level token verification protects `/api/transcribe`. Do not switch Cloud Run IAM authentication on yet.
