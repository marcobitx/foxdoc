# backend/tests/test_pipeline.py
# Tests for the pipeline orchestrator
# Mocks ALL dependencies: LLM, DB, parser, zip_extractor, extraction, aggregation, evaluator
# Related: app/services/pipeline.py

import asyncio
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from app.convex_client import ConvexDB
from app.models.schemas import (
    AggregatedReport,
    AnalysisStatus,
    DocumentType,
    QAEvaluation,
    ExtractionResult,
    SourceDocument,
)
from app.services.llm import LLMClient
from app.services.parser import ParsedDocument
from app.services.pipeline import AnalysisPipeline, PipelineMetrics


# ── Fixtures ───────────────────────────────────────────────────────────────────


def _make_parsed_doc(
    filename: str = "test.pdf",
    content: str = "Test content",
    page_count: int = 5,
    file_size_bytes: int = 10240,
    doc_type: DocumentType = DocumentType.TECHNICAL_SPEC,
    token_estimate: int = 250,
) -> ParsedDocument:
    return ParsedDocument(
        filename=filename,
        content=content,
        page_count=page_count,
        file_size_bytes=file_size_bytes,
        doc_type=doc_type,
        token_estimate=token_estimate,
    )


def _make_extraction_result(**kwargs) -> ExtractionResult:
    defaults = {
        "project_summary": "Test project summary",
        "procurement_type": "atviras",
        "key_requirements": ["Req 1", "Req 2"],
        "confidence_notes": [],
    }
    defaults.update(kwargs)
    return ExtractionResult(**defaults)


def _make_aggregated_report(**kwargs) -> AggregatedReport:
    defaults = {
        "project_summary": "Aggregated summary",
        "procurement_type": "atviras",
        "key_requirements": ["Req 1", "Req 2", "Req 3"],
        "source_documents": [
            SourceDocument(filename="doc1.pdf", type=DocumentType.TECHNICAL_SPEC, pages=5),
            SourceDocument(filename="doc2.pdf", type=DocumentType.CONTRACT, pages=3),
        ],
    }
    defaults.update(kwargs)
    return AggregatedReport(**defaults)


def _make_qa_evaluation(**kwargs) -> QAEvaluation:
    defaults = {
        "completeness_score": 0.85,
        "missing_fields": ["lot_structure"],
        "conflicts": [],
        "suggestions": ["Add more detail to qualification requirements"],
    }
    defaults.update(kwargs)
    return QAEvaluation(**defaults)


@pytest.fixture
def mock_db():
    """In-memory ConvexDB instance (no Convex URL = in-memory)."""
    db = ConvexDB(url="")
    return db


@pytest.fixture
def mock_llm():
    """Mocked LLM client."""
    llm = MagicMock(spec=LLMClient)
    return llm


@pytest.fixture
def sample_parsed_docs():
    """Two sample parsed documents."""
    return [
        _make_parsed_doc(
            filename="tech_spec.pdf",
            content="Technical specification content",
            page_count=10,
            file_size_bytes=20480,
            doc_type=DocumentType.TECHNICAL_SPEC,
            token_estimate=500,
        ),
        _make_parsed_doc(
            filename="contract.pdf",
            content="Contract content",
            page_count=5,
            file_size_bytes=8192,
            doc_type=DocumentType.CONTRACT,
            token_estimate=250,
        ),
    ]


@pytest.fixture
def sample_extraction_results(sample_parsed_docs):
    """Extraction results matching sample_parsed_docs."""
    return [
        (
            sample_parsed_docs[0],
            _make_extraction_result(project_summary="Tech spec extraction"),
            {"input_tokens": 1000, "output_tokens": 200},
        ),
        (
            sample_parsed_docs[1],
            _make_extraction_result(project_summary="Contract extraction"),
            {"input_tokens": 800, "output_tokens": 150},
        ),
    ]


# ── Tests ──────────────────────────────────────────────────────────────────────


class TestPipelineMetrics:
    """Tests for the PipelineMetrics dataclass."""

    def test_defaults(self):
        m = PipelineMetrics()
        assert m.total_files == 0
        assert m.total_pages == 0
        assert m.estimated_cost_usd == 0.0
        assert m.model_used == ""

    def test_to_dict(self):
        m = PipelineMetrics(
            total_files=5,
            total_pages=50,
            model_used="anthropic/claude-sonnet-4",
        )
        d = m.to_dict()
        assert d["total_files"] == 5
        assert d["total_pages"] == 50
        assert d["model_used"] == "anthropic/claude-sonnet-4"
        assert isinstance(d, dict)

    def test_to_dict_contains_all_fields(self):
        m = PipelineMetrics()
        d = m.to_dict()
        expected_keys = {
            "total_files",
            "total_pages",
            "start_time",
            "elapsed_seconds",
            "tokens_extraction_input",
            "tokens_extraction_output",
            "tokens_aggregation_input",
            "tokens_aggregation_output",
            "tokens_evaluation_input",
            "tokens_evaluation_output",
            "estimated_cost_usd",
            "model_used",
        }
        assert set(d.keys()) == expected_keys


class TestPipelineInit:
    """Tests for AnalysisPipeline initialization."""

    def test_init(self, mock_db, mock_llm):
        pipeline = AnalysisPipeline(
            analysis_id="test-123",
            db=mock_db,
            llm=mock_llm,
            model="anthropic/claude-sonnet-4",
        )
        assert pipeline.analysis_id == "test-123"
        assert pipeline.model == "anthropic/claude-sonnet-4"
        assert pipeline.metrics.model_used == "anthropic/claude-sonnet-4"
        assert pipeline._event_index == 0


class TestPipelineFullRun:
    """Tests for the full pipeline execution (happy path)."""

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_successful_full_run(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
        sample_parsed_docs,
        sample_extraction_results,
    ):
        """Full pipeline runs from UNPACKING through COMPLETED."""
        # Setup mocks
        file_list = [
            (Path("/tmp/tech_spec.pdf"), "tech_spec.pdf"),
            (Path("/tmp/contract.pdf"), "contract.pdf"),
        ]
        mock_extract_files.return_value = file_list
        mock_parse_all.return_value = sample_parsed_docs
        mock_extract_all.return_value = sample_extraction_results

        report = _make_aggregated_report()
        agg_usage = {"input_tokens": 3000, "output_tokens": 600}
        mock_aggregate.return_value = (report, agg_usage)

        qa = _make_qa_evaluation()
        eval_usage = {"input_tokens": 2000, "output_tokens": 400}
        mock_evaluate.return_value = (qa, eval_usage)

        # Create analysis in DB first
        analysis_id = await mock_db.create_analysis(model="anthropic/claude-sonnet-4")

        pipeline = AnalysisPipeline(
            analysis_id=analysis_id,
            db=mock_db,
            llm=mock_llm,
            model="anthropic/claude-sonnet-4",
        )

        # Run pipeline
        await pipeline.run([Path("/tmp/tech_spec.pdf"), Path("/tmp/contract.pdf")])

        # Allow background tasks (create_task callbacks) to complete
        await asyncio.sleep(0.05)

        # Verify final status
        analysis = await mock_db.get_analysis(analysis_id)
        assert analysis["status"] == AnalysisStatus.COMPLETED.value

        # Verify report and QA were saved
        assert analysis["report_json"] is not None
        assert analysis["qa_json"] is not None
        assert analysis["metrics_json"] is not None

        # Verify metrics
        metrics = analysis["metrics_json"]
        assert metrics["total_files"] == 2
        assert metrics["total_pages"] == 15  # 10 + 5
        assert metrics["tokens_extraction_input"] == 1800  # 1000 + 800
        assert metrics["tokens_extraction_output"] == 350  # 200 + 150
        assert metrics["tokens_aggregation_input"] == 3000
        assert metrics["tokens_aggregation_output"] == 600
        assert metrics["tokens_evaluation_input"] == 2000
        assert metrics["tokens_evaluation_output"] == 400
        assert metrics["model_used"] == "anthropic/claude-sonnet-4"
        assert metrics["elapsed_seconds"] > 0

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_status_transitions(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_llm,
    ):
        """Verify status transitions: UNPACKING → PARSING → EXTRACTING → AGGREGATING → EVALUATING → COMPLETED."""
        db = ConvexDB(url="")
        status_log: list[str] = []

        # Capture status transitions via a wrapper
        original_update = db.update_analysis

        async def logging_update(analysis_id, **kwargs):
            if "status" in kwargs:
                status_log.append(kwargs["status"])
            await original_update(analysis_id, **kwargs)

        db.update_analysis = logging_update

        # Setup mocks
        mock_extract_files.return_value = [(Path("/tmp/a.pdf"), "a.pdf")]
        doc = _make_parsed_doc(filename="a.pdf")
        mock_parse_all.return_value = [doc]
        extraction = _make_extraction_result()
        mock_extract_all.return_value = [
            (doc, extraction, {"input_tokens": 100, "output_tokens": 50})
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 200, "output_tokens": 100},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 150, "output_tokens": 75},
        )

        analysis_id = await db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        expected = [
            AnalysisStatus.UNPACKING.value,
            AnalysisStatus.PARSING.value,
            AnalysisStatus.EXTRACTING.value,
            AnalysisStatus.AGGREGATING.value,
            AnalysisStatus.EVALUATING.value,
            AnalysisStatus.COMPLETED.value,
        ]
        assert status_log == expected

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_documents_saved_to_db(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
        sample_parsed_docs,
    ):
        """Parsed documents are saved to DB after parsing step."""
        mock_extract_files.return_value = [
            (Path("/tmp/a.pdf"), "tech_spec.pdf"),
            (Path("/tmp/b.pdf"), "contract.pdf"),
        ]
        mock_parse_all.return_value = sample_parsed_docs
        mock_extract_all.return_value = [
            (sample_parsed_docs[0], _make_extraction_result(), {"input_tokens": 0, "output_tokens": 0}),
            (sample_parsed_docs[1], _make_extraction_result(), {"input_tokens": 0, "output_tokens": 0}),
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 0, "output_tokens": 0},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 0, "output_tokens": 0},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        docs = await mock_db.get_documents(analysis_id)
        assert len(docs) == 2
        filenames = {d["filename"] for d in docs}
        assert "tech_spec.pdf" in filenames
        assert "contract.pdf" in filenames


class TestPipelineNoFiles:
    """Test pipeline behavior when no supported files are found."""

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    async def test_no_files_sets_failed(self, mock_extract_files, mock_db, mock_llm):
        """Pipeline fails with FAILED status when extract_files returns empty."""
        mock_extract_files.return_value = []

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/empty.zip")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        assert analysis["status"] == AnalysisStatus.FAILED.value
        assert "No supported files" in analysis["error"]

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    async def test_no_files_emits_error_event(
        self, mock_extract_files, mock_db, mock_llm
    ):
        """Error event is emitted when no files found."""
        mock_extract_files.return_value = []

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/empty.zip")])
        await asyncio.sleep(0.05)

        events = await mock_db.get_events(analysis_id)
        error_events = [e for e in events if e["event_type"] == "error"]
        assert len(error_events) == 1
        assert "No supported files" in error_events[0]["data"]["message"]

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    async def test_no_files_saves_partial_metrics(
        self, mock_extract_files, mock_db, mock_llm
    ):
        """Metrics are saved even on failure (elapsed_seconds > 0)."""
        mock_extract_files.return_value = []

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/empty.zip")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        assert analysis["metrics_json"] is not None
        assert analysis["metrics_json"]["elapsed_seconds"] > 0
        assert analysis["metrics_json"]["total_files"] == 0


class TestPipelineExtractionFailure:
    """Test pipeline behavior when extraction raises an exception."""

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    async def test_extraction_error_fails_pipeline(
        self,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """Pipeline transitions to FAILED if extract_all raises."""
        mock_extract_files.return_value = [(Path("/tmp/a.pdf"), "a.pdf")]
        mock_parse_all.return_value = [_make_parsed_doc()]
        mock_extract_all.side_effect = RuntimeError("LLM API down")

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        assert analysis["status"] == AnalysisStatus.FAILED.value
        assert "LLM API down" in analysis["error"]

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    async def test_extraction_error_preserves_parsing_metrics(
        self,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """Even when extraction fails, parsing metrics (files, pages) are preserved."""
        mock_extract_files.return_value = [
            (Path("/tmp/a.pdf"), "a.pdf"),
            (Path("/tmp/b.pdf"), "b.pdf"),
        ]
        mock_parse_all.return_value = [
            _make_parsed_doc(filename="a.pdf", page_count=10),
            _make_parsed_doc(filename="b.pdf", page_count=7),
        ]
        mock_extract_all.side_effect = RuntimeError("API Error")

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf"), Path("/tmp/b.pdf")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        metrics = analysis["metrics_json"]
        assert metrics["total_files"] == 2
        assert metrics["total_pages"] == 17


class TestPipelineAggregationFailure:
    """Test pipeline when aggregation step fails."""

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    async def test_aggregation_error_fails_pipeline(
        self,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """Pipeline fails if aggregate_results raises."""
        mock_extract_files.return_value = [(Path("/tmp/a.pdf"), "a.pdf")]
        doc = _make_parsed_doc()
        mock_parse_all.return_value = [doc]
        mock_extract_all.return_value = [
            (doc, _make_extraction_result(), {"input_tokens": 500, "output_tokens": 100})
        ]
        mock_aggregate.side_effect = RuntimeError("Aggregation LLM failed")

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        assert analysis["status"] == AnalysisStatus.FAILED.value
        assert "Aggregation LLM failed" in analysis["error"]
        # Extraction metrics should still be populated
        metrics = analysis["metrics_json"]
        assert metrics["tokens_extraction_input"] == 500
        assert metrics["tokens_extraction_output"] == 100


class TestPipelineMetricsAccumulation:
    """Test that metrics are accumulated correctly across pipeline steps."""

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_token_counts_accumulate(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """Token counts from all steps accumulate in metrics."""
        docs = [
            _make_parsed_doc(filename="a.pdf", page_count=3),
            _make_parsed_doc(filename="b.pdf", page_count=7),
            _make_parsed_doc(filename="c.pdf", page_count=2),
        ]
        mock_extract_files.return_value = [
            (Path(f"/tmp/{d.filename}"), d.filename) for d in docs
        ]
        mock_parse_all.return_value = docs
        mock_extract_all.return_value = [
            (docs[0], _make_extraction_result(), {"input_tokens": 1000, "output_tokens": 200}),
            (docs[1], _make_extraction_result(), {"input_tokens": 2000, "output_tokens": 400}),
            (docs[2], _make_extraction_result(), {"input_tokens": 500, "output_tokens": 100}),
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 5000, "output_tokens": 800},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 3000, "output_tokens": 500},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        m = analysis["metrics_json"]

        # Extraction: 1000+2000+500 = 3500 in, 200+400+100 = 700 out
        assert m["tokens_extraction_input"] == 3500
        assert m["tokens_extraction_output"] == 700
        assert m["tokens_aggregation_input"] == 5000
        assert m["tokens_aggregation_output"] == 800
        assert m["tokens_evaluation_input"] == 3000
        assert m["tokens_evaluation_output"] == 500

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_cost_estimation(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """Cost estimation uses $3/M input + $15/M output."""
        doc = _make_parsed_doc()
        mock_extract_files.return_value = [(Path("/tmp/a.pdf"), "a.pdf")]
        mock_parse_all.return_value = [doc]
        mock_extract_all.return_value = [
            (doc, _make_extraction_result(), {"input_tokens": 1_000_000, "output_tokens": 0})
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 0, "output_tokens": 1_000_000},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 0, "output_tokens": 0},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        # 1M input tokens * $3/M + 1M output tokens * $15/M = $3 + $15 = $18
        assert analysis["metrics_json"]["estimated_cost_usd"] == pytest.approx(18.0)

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_elapsed_time_recorded(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """Elapsed time is positive on completion."""
        doc = _make_parsed_doc()
        mock_extract_files.return_value = [(Path("/tmp/a.pdf"), "a.pdf")]
        mock_parse_all.return_value = [doc]
        mock_extract_all.return_value = [
            (doc, _make_extraction_result(), {"input_tokens": 0, "output_tokens": 0})
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 0, "output_tokens": 0},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 0, "output_tokens": 0},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        assert analysis["metrics_json"]["elapsed_seconds"] > 0

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_page_count_accumulated(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """Total pages across all documents is summed correctly."""
        docs = [
            _make_parsed_doc(filename="a.pdf", page_count=12),
            _make_parsed_doc(filename="b.pdf", page_count=8),
            _make_parsed_doc(filename="c.pdf", page_count=25),
        ]
        mock_extract_files.return_value = [
            (Path(f"/tmp/{d.filename}"), d.filename) for d in docs
        ]
        mock_parse_all.return_value = docs
        mock_extract_all.return_value = [
            (d, _make_extraction_result(), {"input_tokens": 0, "output_tokens": 0})
            for d in docs
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 0, "output_tokens": 0},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 0, "output_tokens": 0},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        assert analysis["metrics_json"]["total_pages"] == 45  # 12 + 8 + 25


class TestPipelineEvents:
    """Test event emission throughout the pipeline."""

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_events_emitted_in_order(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """Pipeline emits events in correct order with incrementing indexes."""
        doc = _make_parsed_doc(filename="test.pdf")
        mock_extract_files.return_value = [(Path("/tmp/test.pdf"), "test.pdf")]
        mock_parse_all.return_value = [doc]
        mock_extract_all.return_value = [
            (doc, _make_extraction_result(), {"input_tokens": 100, "output_tokens": 50})
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 200, "output_tokens": 100},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 150, "output_tokens": 75},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/test.pdf")])
        # Wait for background tasks
        await asyncio.sleep(0.1)

        events = await mock_db.get_events(analysis_id)

        # Verify at least aggregation_started/completed and evaluation_started/completed + metrics_update
        event_types = [e["event_type"] for e in events]
        assert "aggregation_started" in event_types
        assert "aggregation_completed" in event_types
        assert "evaluation_started" in event_types
        assert "evaluation_completed" in event_types
        assert "metrics_update" in event_types

        # Verify indexes are sequential
        for i, event in enumerate(events):
            assert event["index"] == i

        # Verify timestamps are present and non-zero
        for event in events:
            assert "timestamp" in event
            assert event["timestamp"] > 0

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_file_parsed_events(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """file_parsed events are emitted for each parsed document."""
        docs = [
            _make_parsed_doc(filename="a.pdf", page_count=5, file_size_bytes=5120),
            _make_parsed_doc(filename="b.docx", page_count=3, file_size_bytes=3072),
        ]
        mock_extract_files.return_value = [
            (Path("/tmp/a.pdf"), "a.pdf"),
            (Path("/tmp/b.docx"), "b.docx"),
        ]

        # parse_all needs to actually invoke the callback
        async def fake_parse_all(file_paths, on_parsed=None):
            for doc in docs:
                if on_parsed:
                    on_parsed(doc)
            return docs

        mock_parse_all.side_effect = fake_parse_all
        mock_extract_all.return_value = [
            (d, _make_extraction_result(), {"input_tokens": 0, "output_tokens": 0})
            for d in docs
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 0, "output_tokens": 0},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 0, "output_tokens": 0},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.1)

        events = await mock_db.get_events(analysis_id)
        parsed_events = [e for e in events if e["event_type"] == "file_parsed"]
        assert len(parsed_events) == 2
        assert parsed_events[0]["data"]["filename"] == "a.pdf"
        assert parsed_events[0]["data"]["pages"] == 5
        assert parsed_events[0]["data"]["format"] == "pdf"
        assert parsed_events[0]["data"]["size_kb"] == 5  # 5120 // 1024
        assert parsed_events[1]["data"]["filename"] == "b.docx"
        assert parsed_events[1]["data"]["format"] == "docx"

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_extraction_events_via_callbacks(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """extraction_started and extraction_completed events fire via callbacks."""
        doc = _make_parsed_doc(filename="test.pdf")
        mock_extract_files.return_value = [(Path("/tmp/test.pdf"), "test.pdf")]
        mock_parse_all.return_value = [doc]

        # Simulate extract_all calling the callbacks
        async def fake_extract_all(
            docs, llm, model, max_concurrent=5, on_started=None, on_completed=None, on_error=None
        ):
            for i, d in enumerate(docs):
                if on_started:
                    on_started(i, d.filename)
                usage = {"input_tokens": 500, "output_tokens": 100}
                if on_completed:
                    on_completed(i, d.filename, usage)
            return [
                (d, _make_extraction_result(), {"input_tokens": 500, "output_tokens": 100})
                for d in docs
            ]

        mock_extract_all.side_effect = fake_extract_all
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 0, "output_tokens": 0},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 0, "output_tokens": 0},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/test.pdf")])
        await asyncio.sleep(0.1)

        events = await mock_db.get_events(analysis_id)
        event_types = [e["event_type"] for e in events]
        assert "extraction_started" in event_types
        assert "extraction_completed" in event_types

        started = [e for e in events if e["event_type"] == "extraction_started"]
        assert started[0]["data"]["filename"] == "test.pdf"
        assert started[0]["data"]["doc_index"] == 0

        completed = [e for e in events if e["event_type"] == "extraction_completed"]
        assert completed[0]["data"]["filename"] == "test.pdf"
        assert completed[0]["data"]["tokens_in"] == 500
        assert completed[0]["data"]["tokens_out"] == 100

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    async def test_error_event_on_failure(self, mock_extract_files, mock_db, mock_llm):
        """Error event contains the failure message."""
        mock_extract_files.side_effect = OSError("Disk full")

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        events = await mock_db.get_events(analysis_id)
        error_events = [e for e in events if e["event_type"] == "error"]
        assert len(error_events) == 1
        assert "Disk full" in error_events[0]["data"]["message"]

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_metrics_update_event_on_completion(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """A metrics_update event with full metrics is emitted on success."""
        doc = _make_parsed_doc()
        mock_extract_files.return_value = [(Path("/tmp/a.pdf"), "a.pdf")]
        mock_parse_all.return_value = [doc]
        mock_extract_all.return_value = [
            (doc, _make_extraction_result(), {"input_tokens": 100, "output_tokens": 50})
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 200, "output_tokens": 100},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 150, "output_tokens": 75},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        events = await mock_db.get_events(analysis_id)
        metrics_events = [e for e in events if e["event_type"] == "metrics_update"]
        assert len(metrics_events) == 1
        data = metrics_events[0]["data"]
        assert data["total_files"] == 1
        assert data["model_used"] == "test-model"
        assert data["elapsed_seconds"] > 0


class TestPipelineEvaluationFailure:
    """Test pipeline when evaluation step fails."""

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_evaluation_error_fails_pipeline(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """Pipeline fails if evaluate_report raises."""
        doc = _make_parsed_doc()
        mock_extract_files.return_value = [(Path("/tmp/a.pdf"), "a.pdf")]
        mock_parse_all.return_value = [doc]
        mock_extract_all.return_value = [
            (doc, _make_extraction_result(), {"input_tokens": 100, "output_tokens": 50})
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 200, "output_tokens": 100},
        )
        mock_evaluate.side_effect = RuntimeError("Evaluation model error")

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        analysis = await mock_db.get_analysis(analysis_id)
        assert analysis["status"] == AnalysisStatus.FAILED.value
        assert "Evaluation model error" in analysis["error"]
        # Extraction and aggregation metrics should be preserved
        m = analysis["metrics_json"]
        assert m["tokens_extraction_input"] == 100
        assert m["tokens_aggregation_input"] == 200


class TestPipelineCostCalculation:
    """Test cost calculation logic."""

    def test_calculate_total_cost_zero(self, mock_db, mock_llm):
        pipeline = AnalysisPipeline(
            analysis_id="test", db=mock_db, llm=mock_llm, model="test"
        )
        pipeline._calculate_total_cost()
        assert pipeline.metrics.estimated_cost_usd == 0.0

    def test_calculate_total_cost_input_only(self, mock_db, mock_llm):
        pipeline = AnalysisPipeline(
            analysis_id="test", db=mock_db, llm=mock_llm, model="test"
        )
        pipeline.metrics.tokens_extraction_input = 1_000_000
        pipeline._calculate_total_cost()
        # 1M input * $3/M = $3
        assert pipeline.metrics.estimated_cost_usd == pytest.approx(3.0)

    def test_calculate_total_cost_output_only(self, mock_db, mock_llm):
        pipeline = AnalysisPipeline(
            analysis_id="test", db=mock_db, llm=mock_llm, model="test"
        )
        pipeline.metrics.tokens_aggregation_output = 1_000_000
        pipeline._calculate_total_cost()
        # 1M output * $15/M = $15
        assert pipeline.metrics.estimated_cost_usd == pytest.approx(15.0)

    def test_calculate_total_cost_mixed(self, mock_db, mock_llm):
        pipeline = AnalysisPipeline(
            analysis_id="test", db=mock_db, llm=mock_llm, model="test"
        )
        pipeline.metrics.tokens_extraction_input = 500_000
        pipeline.metrics.tokens_extraction_output = 100_000
        pipeline.metrics.tokens_aggregation_input = 200_000
        pipeline.metrics.tokens_aggregation_output = 50_000
        pipeline.metrics.tokens_evaluation_input = 100_000
        pipeline.metrics.tokens_evaluation_output = 25_000
        pipeline._calculate_total_cost()
        # Input: (500k + 200k + 100k) * $3/M = 800k * 0.000003 = $2.4
        # Output: (100k + 50k + 25k) * $15/M = 175k * 0.000015 = $2.625
        expected = (800_000 / 1_000_000 * 3.0) + (175_000 / 1_000_000 * 15.0)
        assert pipeline.metrics.estimated_cost_usd == pytest.approx(expected)


class TestPipelineServiceCalls:
    """Test that pipeline calls services with correct arguments."""

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_extract_files_called_with_upload_paths(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """extract_files receives the original upload paths."""
        doc = _make_parsed_doc()
        mock_extract_files.return_value = [(Path("/tmp/a.pdf"), "a.pdf")]
        mock_parse_all.return_value = [doc]
        mock_extract_all.return_value = [
            (doc, _make_extraction_result(), {"input_tokens": 0, "output_tokens": 0})
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 0, "output_tokens": 0},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 0, "output_tokens": 0},
        )

        upload_paths = [Path("/uploads/file1.zip"), Path("/uploads/file2.pdf")]
        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run(upload_paths)
        await asyncio.sleep(0.05)

        mock_extract_files.assert_called_once_with(upload_paths)

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_extract_all_called_with_correct_model(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """extract_all receives the correct model and LLM client."""
        doc = _make_parsed_doc()
        mock_extract_files.return_value = [(Path("/tmp/a.pdf"), "a.pdf")]
        mock_parse_all.return_value = [doc]
        mock_extract_all.return_value = [
            (doc, _make_extraction_result(), {"input_tokens": 0, "output_tokens": 0})
        ]
        mock_aggregate.return_value = (
            _make_aggregated_report(),
            {"input_tokens": 0, "output_tokens": 0},
        )
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 0, "output_tokens": 0},
        )

        analysis_id = await mock_db.create_analysis(model="my-special-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id,
            db=mock_db,
            llm=mock_llm,
            model="my-special-model",
        )
        await pipeline.run([Path("/tmp/a.pdf")])
        await asyncio.sleep(0.05)

        # Verify extract_all was called with the right model
        call_kwargs = mock_extract_all.call_args
        assert call_kwargs.kwargs["model"] == "my-special-model"
        assert call_kwargs.kwargs["llm"] is mock_llm

    @pytest.mark.asyncio
    @patch("app.services.pipeline.extract_files")
    @patch("app.services.pipeline.parse_all")
    @patch("app.services.pipeline.extract_all")
    @patch("app.services.pipeline.aggregate_results")
    @patch("app.services.pipeline.evaluate_report")
    async def test_evaluate_receives_source_docs_from_parsed(
        self,
        mock_evaluate,
        mock_aggregate,
        mock_extract_all,
        mock_parse_all,
        mock_extract_files,
        mock_db,
        mock_llm,
    ):
        """evaluate_report receives SourceDocument list built from parsed docs."""
        docs = [
            _make_parsed_doc(
                filename="spec.pdf",
                page_count=10,
                doc_type=DocumentType.TECHNICAL_SPEC,
            ),
            _make_parsed_doc(
                filename="contract.docx",
                page_count=5,
                doc_type=DocumentType.CONTRACT,
            ),
        ]
        mock_extract_files.return_value = [
            (Path(f"/tmp/{d.filename}"), d.filename) for d in docs
        ]
        mock_parse_all.return_value = docs
        mock_extract_all.return_value = [
            (d, _make_extraction_result(), {"input_tokens": 0, "output_tokens": 0})
            for d in docs
        ]
        report = _make_aggregated_report()
        mock_aggregate.return_value = (report, {"input_tokens": 0, "output_tokens": 0})
        mock_evaluate.return_value = (
            _make_qa_evaluation(),
            {"input_tokens": 0, "output_tokens": 0},
        )

        analysis_id = await mock_db.create_analysis(model="test-model")
        pipeline = AnalysisPipeline(
            analysis_id=analysis_id, db=mock_db, llm=mock_llm, model="test-model"
        )
        await pipeline.run([Path("/tmp/spec.pdf")])
        await asyncio.sleep(0.05)

        # Verify evaluate_report was called with correct source docs
        eval_call = mock_evaluate.call_args
        source_docs = eval_call.args[1] if len(eval_call.args) > 1 else eval_call.kwargs.get("documents")
        assert len(source_docs) == 2
        assert source_docs[0].filename == "spec.pdf"
        assert source_docs[0].type == DocumentType.TECHNICAL_SPEC
        assert source_docs[0].pages == 10
        assert source_docs[1].filename == "contract.docx"
        assert source_docs[1].type == DocumentType.CONTRACT
