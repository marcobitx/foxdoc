# backend/app/prompts/extraction_ocr.py
# OCR-specific extraction prompt — used when document is sent as file/image (no text content)
# System prompt is shared with standard extraction; only user prompt differs
# Related: prompts/extraction.py, services/extraction.py

from app.prompts.extraction import EXTRACTION_SYSTEM  # noqa: F401 — re-exported for convenience

EXTRACTION_OCR_USER = """\
Perskaityk pateiktą dokumentą iš pridėto failo arba nuotraukos. \
Dokumentas gali būti skenuotas PDF, fotografija arba paveikslėlis — \
vizualiai perskaity visą turinį ir ištrauk struktūrizuotą informaciją.

Metaduomenys:
- Failo pavadinimas: {filename}
- Dokumento tipas: {document_type}
- Puslapių skaičius: {page_count}

Ištrauk VISĄ informaciją pagal nurodytą JSON schemą. \
Būk MAKSIMALIAI detalus — kiekvienas reikalavimas, kiekviena sąlyga, kiekviena suma turi būti užfiksuota. \
Jei tekstas sunkiai įskaitomas, pažymėk tai confidence_notes lauke."""
