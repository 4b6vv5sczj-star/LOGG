# LOGG v0.11.1 — Identity Session Fix

Isolated authentication repair for iPhone/Safari/PWA.

- Explicit Firebase LOCAL persistence before sign-in.
- Processes getRedirectResult() on startup before auth UI settles.
- Uses onAuthStateChanged() as source of truth for restored sessions.
- Keeps popup as primary sign-in path and provides redirect fallback for explicit popup/storage failures.
- Adds a small authentication diagnostic line in the LOGG Identity sheet.
- No changes to Meetings, Notes, Speech processing, Wake Lock, exports or backend authorization.
