# LOGG v0.10.4 — Word Export Definitive Repair

Replaces the DOCX ZIP writer with an explicit byte-accurate ZIP implementation and forces a new service-worker/cache generation. The uploaded failing DOCX was diagnosed as having malformed central-directory records (40-byte fixed header instead of the ZIP-required 46 bytes). PDF export is unchanged.
