# Procurement Analyzer

Lithuanian public procurement document analyzer powered by LLM.

## What it does

Upload procurement documents (PDF, DOCX, XLSX, or ZIP archives) and get a structured analysis report with:

- **Project summary** — what's being procured
- **Organization details** — procuring entity info
- **Financial data** — estimated value, currency, VAT
- **Deadlines** — submission, questions, contract duration
- **Requirements** — technical, functional, qualification
- **Evaluation criteria** — scoring weights and descriptions
- **QA score** — automated completeness check
- **Q&A chat** — ask follow-up questions about the documents

All analysis is performed in Lithuanian (lietuvių kalba).

## Tech Stack

- **Backend:** FastAPI (Python 3.12+) with uv
- **Frontend:** Astro + React islands with Bun
- **Styling:** Tailwind CSS
- **Database:** Convex
- **Document Parsing:** Docling
- **LLM:** OpenRouter (default: Claude Sonnet 4)
- **Export:** PDF (ReportLab) and DOCX (python-docx)

## Quick Start

```bash
# Backend
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
bun install
bun run dev

# Convex (project root)
npx convex dev
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
OPENROUTER_API_KEY=your-key-here
CONVEX_URL=your-convex-url
```

## License

Private — all rights reserved.
