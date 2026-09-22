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

## v0.9.3 Meeting Setup Cancel
- Adds an explicit Cancel/Avbryt action to the meeting setup sheet.
- Cancelling returns to the locked Home screen without creating a meeting.
- Clears unstarted meeting name and consent state.
- Notes, Speech, Meetings runtime and Home composition otherwise unchanged.


## v0.9.4 Notes usability
- Explicit SAVED NOTES archive entry inside Notes.
- Enter continues bullet and TODO lists automatically; Enter on an empty list item exits the list.


## v0.9.5 Meeting Reliability
- Requests the Screen Wake Lock API while an active meeting is listening.
- Releases wake lock on pause, finish, or leaving the meeting.
- Re-acquires wake lock when LOGG becomes visible again.
- Recording watchdog monitors microphone/MediaRecorder health and warns if capture appears interrupted.
- Attempts recorder recovery when returning to LOGG after an interruption.
- iOS/PWA limitation remains: background/locked-screen microphone capture cannot be guaranteed; LOGG therefore keeps the screen awake where supported.
