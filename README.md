# LOGG v0.2 — Meetings on Course

Mobile-first PWA prototype with the new superyacht-lifestyle / premium-stationery UX and a secure Google Cloud Speech-to-Text V2 backend scaffold.

## What changed
- Lifestyle landing page and premium stationery meeting/result views.
- UI in English / Swedish.
- Google Speech-to-Text V2 `chirp_3` backend; Google credentials never go into GitHub Pages.
- Automatic/language-agnostic transcription configuration and inline Marine Lexicon adaptation.
- Browser sends short live microphone chunks to the backend. LOGG does not intentionally persist those audio chunks.
- Local text autosave, editable meeting log, Copy and Word export retained.

## Frontend (GitHub Pages)
Upload the frontend files/folders in this package to your GitHub Pages repository. In `config.js`, set:

`window.LOGG_CONFIG = { API_BASE: "https://YOUR-BACKEND-URL" };`

Do not put a Google API key, service-account JSON, or any other secret in `config.js`.

## Google Cloud backend
1. Create/select a Google Cloud project and enable **Cloud Speech-to-Text API**.
2. Keep billing/free-tier controls in your Google Cloud account.
3. Deploy the `backend/` folder to a server such as Cloud Run using a service identity that can call Speech-to-Text.
4. Set `GOOGLE_CLOUD_PROJECT` to the project ID and `GOOGLE_SPEECH_REGION=eu`.
5. Put the resulting HTTPS backend URL into frontend `config.js`.

The backend uses Application Default Credentials / the hosting service identity, not credentials committed to source control.

## Important v0.2 limitations
- This is a prototype, not a production privacy/compliance implementation. Verify Google Cloud data handling, retention, IAM, logging, region, consent wording and company policy before workplace use.
- The browser uses ~12-second audio chunks for a simple mobile prototype. A later version should use a persistent streaming bridge for lower latency and cleaner context across chunk boundaries.
- Dialect recognition (including Jakobstad/Ostrobothnian Swedish) must be measured with real test speech. Marine adaptation can improve specialist terms but does not guarantee dialect accuracy.
- The hero currently uses a CSS-created luxury dusk atmosphere so the repo contains no unlicensed yacht photograph. Replace it with a properly licensed/owned hero photograph before brand release.


## v0.2.1 – iPhone/Safari cache fix
The service worker now uses network-first loading, activates new builds immediately, clears old caches, bypasses HTTP cache when checking app files, and reloads once when a new service worker takes control. Static assets are versioned with query strings. This is intended to make GitHub Pages updates appear promptly on iPhone/PWA installs while retaining offline fallback.


## v0.2.2
- Active meeting now has a Back button with draft preservation.
- Microphone permission is tested independently from Google backend configuration.
- Clear status distinguishes microphone permission from Google Speech connectivity.
- Cache/service worker bumped to v0.2.2.

Google transcription still requires `window.LOGG_CONFIG.API_BASE` to point to the deployed secure backend. Credentials must never be placed in the GitHub Pages frontend.


## v0.3.0 deployment
Frontend config points to the Cloud Run service already created for LOGG. Upload all frontend files to the GitHub Pages repository. The backend folder is deployed by Cloud Run from `/backend/Dockerfile`. Set Cloud Run runtime service account to `LOGG Speech`. No JSON credentials belong in this repository.

On iPhone, LOGG chooses the first MediaRecorder format Safari supports (MP4/AAC on Safari where available; WebM/Opus elsewhere). Google Speech-to-Text V2 auto-decoding supports both MP4/AAC and WebM/Opus.


## v0.3.3 diagnostic
Adds visible iPhone recording pipeline diagnostics, prefers MP4 on Apple devices, records with 1-second MediaRecorder timeslices, explicitly requests final data before stopping, and adds a touch-safe Back control. The diagnostics show CLOUD, MIC, FORMAT, RECORDING, AUDIO KB, STOP, UPLOADING, HTTP and TEXT stages.


## v0.3.3
- Normal meeting view cleaned up; diagnostics are hidden by default. Add `?debug=1` to the app URL to show them.
- Back arrow now immediately saves the draft locally, stops microphone capture, and returns to the LOGG home screen.
- Speech status simplified to Listening / Transcribing.
- Keeps the working EU Chirp 3 backend configuration from v0.3.2.
