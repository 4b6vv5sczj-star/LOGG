# LOGG v0.4.0 — Smart Notes + Navigation Hardening

- Keeps the working Google/Chirp transcription path unchanged.
- Fixes stale PWA references: service-worker registration and cached core files are all v0.4.0.
- Purges legacy v0.3.x caches on load.
- Back arrow and left-edge swipe use capture-phase handlers and one direct internal `forceHome()` route.
- Smart Notes v1 locally classifies transcript into Summary, Decisions, Actions, Open Questions and full Meeting Notes.
- Actions can extract a likely owner/deadline and mark weaker action candidates as `confirm`.
- No extra AI/API cost is introduced by Smart Notes v1.
