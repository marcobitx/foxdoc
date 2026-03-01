# backend/tests/test_aggregation.py
# Tests for the cross-document aggregation service with mocked LLM.
# Covers: 3-doc aggregation, single-doc aggregation, source_documents population.

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.schemas import (
    AggregatedReport,
    DocumentType,
    EvaluationCriterion,
    EstimatedValue,
    ProcuringOrganization,
    QualificationRequirements,
    SourceDocument,
    ExtractionResult,
    Deadlines,
)
from app.services.aggregation import aggregate_results
from app.services.parser import ParsedDocument


# ── Fixtures ────────────────────────────────────────────────────────────────────


def _make_parsed_doc(
    filename: str = "doc.pdf",
    content: str = "Test content",
    page_count: int = 10,
    doc_type: DocumentType = DocumentType.OTHER,
) -> ParsedDocument:
    """Create a ParsedDocument for testing."""
    return ParsedDocument(
        filename=filename,
        content=content,
        page_count=page_count,
        file_size_bytes=len(content.encode()),
        doc_type=doc_type,
        token_estimate=len(content) // 4,
    )


def _make_extraction(
    summary: str | None = "Test summary",
    org_name: str | None = None,
    requirements: list[str] | None = None,
) -> ExtractionResult:
    """Create an ExtractionResult for testing."""
    return ExtractionResult(
        project_summary=summary,
        procuring_organization=(
            ProcuringOrganization(name=org_name) if org_name else None
        ),
        key_requirements=requirements or [],
    )


def _make_mock_llm(report: AggregatedReport, usage: dict | None = None) -> MagicMock:
    """Create a mock LLM client that returns the given report."""
    mock_llm = MagicMock()
    rv = (report, usage or {"input_tokens": 5000, "output_tokens": 1000})
    mock_llm.complete_structured = AsyncMock(return_value=rv)
    mock_llm.complete_structured_streaming = AsyncMock(return_value=rv)
    return mock_llm


# ── Tests ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_aggregate_three_documents():
    """Aggregation of 3 extraction results returns a single AggregatedReport."""
    # Setup: 3 parsed docs with extractions
    doc1 = _make_parsed_doc("tech_spec.pdf", "Technical spec content", 20, DocumentType.TECHNICAL_SPEC)
    doc2 = _make_parsed_doc("contract.pdf", "Contract content", 15, DocumentType.CONTRACT)
    doc3 = _make_parsed_doc("invitation.pdf", "Invitation content", 5, DocumentType.INVITATION)

    ext1 = _make_extraction("IT system procurement", "Vilniaus miesto savivaldybė", ["Req A", "Req B"])
    ext2 = _make_extraction("Contract for IT system", None, ["Req C"])
    ext3 = _make_extraction("Invitation to tender", "Vilniaus miesto savivaldybė", [])

    usage1 = {"input_tokens": 1000, "output_tokens": 200}
    usage2 = {"input_tokens": 800, "output_tokens": 150}
    usage3 = {"input_tokens": 500, "output_tokens": 100}

    extractions = [
        (doc1, ext1, usage1),
        (doc2, ext2, usage2),
        (doc3, ext3, usage3),
    ]

    # Mock LLM returns a merged report
    expected_report = AggregatedReport(
        project_summary="Vilniaus miesto IT sistemos pirkimas",
        procuring_organization=ProcuringOrganization(name="Vilniaus miesto savivaldybė", code="123456789"),
        key_requirements=["Req A", "Req B", "Req C"],
        source_documents=[
            SourceDocument(filename="tech_spec.pdf", type=DocumentType.TECHNICAL_SPEC, pages=20),
            SourceDocument(filename="contract.pdf", type=DocumentType.CONTRACT, pages=15),
            SourceDocument(filename="invitation.pdf", type=DocumentType.INVITATION, pages=5),
        ],
    )
    mock_llm = _make_mock_llm(expected_report)

    # Act
    report, usage = await aggregate_results(extractions, mock_llm, "anthropic/claude-sonnet-4")

    # Assert
    assert isinstance(report, AggregatedReport)
    assert report.project_summary == "Vilniaus miesto IT sistemos pirkimas"
    assert report.procuring_organization is not None
    assert report.procuring_organization.name == "Vilniaus miesto savivaldybė"
    assert len(report.key_requirements) == 3
    assert len(report.source_documents) == 3
    assert usage["input_tokens"] == 5000
    assert usage["output_tokens"] == 1000

    # Verify LLM was called correctly
    mock_llm.complete_structured_streaming.assert_called_once()
    call_kwargs = mock_llm.complete_structured_streaming.call_args
    assert call_kwargs.kwargs["response_schema"] is AggregatedReport
    assert call_kwargs.kwargs["model"] == "anthropic/claude-sonnet-4"


@pytest.mark.asyncio
async def test_aggregate_single_document():
    """Aggregation with a single document still produces a valid report."""
    doc = _make_parsed_doc("single.pdf", "Single doc content", 8, DocumentType.TECHNICAL_SPEC)
    ext = _make_extraction(
        "Single doc summary",
        "Test Organization",
        ["Requirement 1", "Requirement 2"],
    )
    usage_ext = {"input_tokens": 500, "output_tokens": 100}

    expected_report = AggregatedReport(
        project_summary="Single doc summary",
        procuring_organization=ProcuringOrganization(name="Test Organization"),
        key_requirements=["Requirement 1", "Requirement 2"],
        source_documents=[
            SourceDocument(filename="single.pdf", type=DocumentType.TECHNICAL_SPEC, pages=8),
        ],
    )
    mock_llm = _make_mock_llm(expected_report)

    report, usage = await aggregate_results([(doc, ext, usage_ext)], mock_llm, "test-model")

    assert isinstance(report, AggregatedReport)
    assert report.project_summary == "Single doc summary"
    assert len(report.source_documents) == 1
    assert report.source_documents[0].filename == "single.pdf"

    # Verify user prompt contains doc count = 1
    call_args = mock_llm.complete_structured_streaming.call_args
    user_prompt = call_args.kwargs["user"]
    assert "1 dokumentai" in user_prompt or "Dokumentas 1:" in user_prompt


@pytest.mark.asyncio
async def test_aggregate_populates_source_documents_if_empty():
    """If LLM returns empty source_documents, we fill them from parsed docs."""
    doc1 = _make_parsed_doc("a.pdf", "Content A", 5, DocumentType.TECHNICAL_SPEC)
    doc2 = _make_parsed_doc("b.pdf", "Content B", 3, DocumentType.CONTRACT)

    ext1 = _make_extraction("Summary A")
    ext2 = _make_extraction("Summary B")

    # LLM returns report with NO source_documents
    empty_report = AggregatedReport(
        project_summary="Merged",
        source_documents=[],  # empty!
    )
    mock_llm = _make_mock_llm(empty_report)

    report, _ = await aggregate_results(
        [(doc1, ext1, {}), (doc2, ext2, {})],
        mock_llm,
        "test-model",
    )

    # source_documents should be filled from parsed docs
    assert len(report.source_documents) == 2
    assert report.source_documents[0].filename == "a.pdf"
    assert report.source_documents[0].type == DocumentType.TECHNICAL_SPEC
    assert report.source_documents[0].pages == 5
    assert report.source_documents[1].filename == "b.pdf"
    assert report.source_documents[1].type == DocumentType.CONTRACT
    assert report.source_documents[1].pages == 3


@pytest.mark.asyncio
async def test_aggregate_prompt_contains_all_extractions():
    """User prompt sent to LLM contains all extraction results as numbered blocks."""
    docs_and_exts = []
    for i in range(3):
        doc = _make_parsed_doc(f"doc_{i}.pdf", f"Content {i}", i + 1, DocumentType.OTHER)
        ext = _make_extraction(f"Summary {i}", requirements=[f"Req {i}"])
        docs_and_exts.append((doc, ext, {}))

    mock_report = AggregatedReport(project_summary="Merged")
    mock_llm = _make_mock_llm(mock_report)

    await aggregate_results(docs_and_exts, mock_llm, "model-x")

    call_args = mock_llm.complete_structured_streaming.call_args
    user_prompt = call_args.kwargs["user"]

    # Verify all documents appear numbered
    assert "Dokumentas 1: doc_0.pdf" in user_prompt
    assert "Dokumentas 2: doc_1.pdf" in user_prompt
    assert "Dokumentas 3: doc_2.pdf" in user_prompt
    assert "3 dokumentai" in user_prompt

    # Verify extraction JSON blocks are present
    assert "Summary 0" in user_prompt
    assert "Summary 1" in user_prompt
    assert "Summary 2" in user_prompt
    assert "Req 0" in user_prompt
    assert "Req 2" in user_prompt


@pytest.mark.asyncio
async def test_aggregate_preserves_llm_source_documents():
    """If LLM returns non-empty source_documents, we keep them as-is."""
    doc = _make_parsed_doc("x.pdf", "Content", 10, DocumentType.ANNEX)
    ext = _make_extraction("Summary")

    llm_docs = [
        SourceDocument(filename="x.pdf", type=DocumentType.ANNEX, pages=10),
        SourceDocument(filename="extra.pdf", type=DocumentType.OTHER, pages=2),
    ]
    report_with_docs = AggregatedReport(
        project_summary="Has docs",
        source_documents=llm_docs,
    )
    mock_llm = _make_mock_llm(report_with_docs)

    report, _ = await aggregate_results([(doc, ext, {})], mock_llm, "model")

    # LLM's source_documents are kept (it had non-empty list)
    assert len(report.source_documents) == 2
    assert report.source_documents[1].filename == "extra.pdf"
