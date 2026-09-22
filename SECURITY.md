# LOGG v0.10 Security Foundation

## Implemented in code
- Google credentials remain server-side; no service-account JSON key is used by the frontend.
- Speech remains on the configured EU Speech endpoint.
- CORS allowlist via `ALLOWED_ORIGINS` (comma-separated). Defaults include the LOGG GitHub Pages origin plus local development origins.
- Per-instance request rate guard on `/api/transcribe` (`RATE_MAX`, default 30/minute).
- 8 MiB audio upload limit (`MAX_AUDIO_BYTES` can override).
- Audio MIME validation.
- Security/no-cache response headers; Express fingerprint disabled.
- Backend no longer logs transcript, request body, audio, filename, language content or detailed Google error text.
- Generic client-facing errors.

## Important limitation
This is pilot hardening, not authentication. CORS is a browser control and is NOT proof of identity. A public Cloud Run URL can still be called outside a browser. Do not treat v0.10 alone as authorization for confidential management/HR/finance meetings.

## Google Cloud changes to do when convenient
1. Deploy the included backend to Cloud Run.
2. Set `ALLOWED_ORIGINS` to the exact production LOGG origin (for example `https://4b6vv5sczj-star.github.io`). Remove localhost origins in production.
3. Keep the dedicated `logg-speech` runtime service account and no downloaded JSON keys.
4. Review Cloud Run logs after deployment and confirm no transcript/audio content appears.
5. Configure a billing budget/alerts.

## Phase 2 before sensitive corporate use
- Add real user authentication/authorization in front of `/api/transcribe` (Cloud Run IAM/IAP or another suitable authenticated architecture).
- Decide company policy for local transcript storage: LOGG currently stores meetings/notes in browser localStorage on the device in plaintext.
- Consider device-level access requirements and optional encrypted local vault / auto-delete retention.
- Document consent, retention and incident handling for company use.
- Security review/test the deployed production configuration.
