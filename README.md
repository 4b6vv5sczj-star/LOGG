# LOGG v0.5.0 — Clean Core

Architecture cleanup release.

- Fixes the actual iPhone Back issue: the fixed global topbar was sitting above the meeting Back button and intercepting touches.
- One internal navigation function (`goTo`) and one meeting exit path (`leaveMeeting`).
- One click handler for Back and one isolated left-edge swipe zone; no browser history, pointerup duplicates, capture-phase handlers, or dialogs.
- Topbar cannot intercept meeting/result controls.
- Simplified network-first service worker and clean v0.5 cache.
- Google Chirp 3 transcription path preserved.
- Smart Notes v1 preserved (Summary, Decisions, Actions, Open Questions, Meeting Notes).

Deploy the complete folder to the GitHub repo. Cloud Run will rebuild the backend, but the Speech implementation itself is unchanged.
