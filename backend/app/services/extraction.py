# backend/app/services/extraction.py
# Per-document data extraction orchestrator
# Sends parsed document text to LLM and returns structured ExtractionResult
# Related: llm.py, parser.py, prompts/extraction.py, aggregation.py
