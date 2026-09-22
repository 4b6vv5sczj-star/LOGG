# LOGG v0.9.0 — Notes 1.0

Built on the frozen v0.8 modular/speech baseline.

## Frozen and preserved
- Meetings module / navigation / Chirp pipeline from v0.8
- v0.7.2 Home visual composition, with only a discreet Quick Notes module entry added

## Notes 1.0
- Independent Notes module and local Notes library
- Typed notes, bullet insertion and checklist insertion
- Voice capture through the same Cloud Run / Google Chirp 3 endpoint
- Smart language stability limited to SV/FI/EN/ES; Swedish locks quickly and unrelated languages never lock
- Voice transcription is appended as clean bullet points
- Local autosave; audio is never stored by LOGG
- Export: Word (.docx), PDF via the device print/save-PDF sheet, and JSON
- Premium LOGG document header in Word/PDF exports

No Google credentials are present in the frontend.


## v0.9.1 Notes Export Navigation Fix
- PDF export no longer opens a separate blank browser tab; printing runs from a temporary hidden document so returning from the iOS print/share sheet keeps the user inside the Note.
- Export sheet can be dismissed with Cancel, backdrop tap, or Escape.
- Notes module 1.0.1. Core/Home/Meetings unchanged.
