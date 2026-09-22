# LOGG v0.11.2 — Firebase Identity

- Frontend target: Firebase Hosting in project `nimble-skein-lfs6l`.
- Google sign-in uses Firebase redirect flow again, now from Firebase Hosting rather than GitHub Pages.
- Redirect result is consumed during auth initialization before normal auth-state UI handling.
- Browser-local Firebase Auth persistence remains enabled.
- Existing ID-token -> Cloud Run verification chain is unchanged.
- Meetings, Notes, Speech, exports and visual design are otherwise unchanged.
- Service-worker/cache and local asset versions bumped to v0.11.2.
