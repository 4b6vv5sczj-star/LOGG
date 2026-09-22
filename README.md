# LOGG v0.8.0 — Modular Foundation + Speech Intelligence

Built directly from the verified v0.7.2 Home baseline.

## Frozen
- v0.5.2 core flow/navigation
- v0.7.2 Home composition and sailing lifestyle image

## New
- Module registry under `/core` and `/modules`.
- Meetings registered as the active module.
- Notes foundation registered but deliberately has no visible UI yet.
- Speech selector: Smart auto, Swedish, English, Finnish, Spanish.
- Smart auto only permits SV/FI/EN/ES to become persistent language locks; German/unrelated detections are ignored for locking.
- Swedish gains lock confidence faster to reduce accidental drift from Swedish speech.
- Once locked, the frontend sends a specific BCP-47 language hint to Cloud Run for subsequent chunks.
- Backend accepts only sv-SE, en-GB, fi-FI, es-ES hints; otherwise it retains Chirp 3 auto mode.

## Next
Build Notes as an independent module and move export into a shared Core export service.
