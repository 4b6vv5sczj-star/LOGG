# LOGG v0.10.2 — Word Export Repair

Repairs the dependency-free DOCX ZIP/OOXML package writer used by both Meetings and Notes.

The previous writer emitted malformed ZIP local/central directory headers. PDF export was unaffected.

Changes:
- standards-compliant ZIP local file headers
- standards-compliant central directory records
- valid end-of-central-directory record
- applied to Meeting and Notes DOCX export
- service-worker cache bumped to v0.10.2
- no changes to Meeting, Notes, Speech, Intelligence, Home or Security behavior
