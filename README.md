# LOGG v0.7.0 — Intelligence & Polish

Built directly from the verified v0.5.2 Home Navigation core freeze.

## Core freeze preserved
- Home / Meeting / Result / Archive navigation
- Back and swipe behaviour
- Finish LOGG flow
- Google Chirp 3 recording/transcription pipeline
- Local save/archive and Word export

## Intelligence v3
- Smarter local classification of decisions, actions, open questions and discussion
- Swedish, English, Finnish and Spanish meeting cues; mixed English yacht terminology supported
- Action owner/deadline extraction with explicit uncertainty marker
- Extractive summary only: does not invent facts
- Raw transcript is always preserved as Meeting Notes
- No additional AI/API cost in this version

## Polish
- Refined premium stationery treatment, typography rhythm and section hierarchy
- Intelligence provenance strip on result page
- All cache/assets versioned 0.7.0

Important: Google speech behaviour was intentionally not changed because v0.5.2 is the frozen working baseline.


## v0.7 Intelligence v3
- Context-aware analysis across neighbouring sentences.
- Stronger implicit decision detection (e.g. “let’s go with option B”).
- Action confidence model with conservative “confirm” marking.
- Owner and deadline extraction can use adjacent context.
- Pronoun actions can retain nearby yacht/project context.
- Expanded superyacht/project lexicon for summary weighting and transcription hints.
- Better blocker/risk prioritisation in summaries.
- Core Freeze preserved: navigation, recording, finish flow, archive and speech transport are unchanged.
- Word export is intentionally not overhauled in this release.
