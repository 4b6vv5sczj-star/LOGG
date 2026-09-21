# LOGG — Meetings on Course · v0.1 GitHub Pages

Mobile-first PWA prototype for iPhone and Android.

## Publish with GitHub Pages
1. Create a new GitHub repository, for example `LOGG`.
2. Upload **the contents of this folder** to the repository root (do not upload the outer folder itself).
3. Commit the files.
4. In GitHub open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch **main** and folder **/(root)**, then Save.
7. GitHub will show the public HTTPS address when deployment is ready.

## iPhone
Open the GitHub Pages address in Safari. Use Share → Add to Home Screen → Add. Open LOGG from the new Home Screen icon for standalone mode.

## Android
Open the address in Chrome. Choose Add to Home screen / Install app when offered.

## v0.1 notes
- Meeting name is entered manually; date/time/duration are automatic.
- UI: Swedish / English.
- Output: Swedish / English.
- Notes are autosaved locally in the browser; no audio file is saved by LOGG.
- Word (.docx) export is generated locally in the browser.
- Browser speech recognition support varies. This prototype does **not yet** provide the final automatic SV/FI/EN/ES switching, Jakobstad/Ostrobothnian dialect handling, or marine/superyacht vocabulary engine. Those require the next speech-engine layer.
- Microphone-related browser features require HTTPS; GitHub Pages provides HTTPS.
