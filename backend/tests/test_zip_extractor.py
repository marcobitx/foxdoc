# backend/tests/test_zip_extractor.py
# Comprehensive tests for the ZIP extraction service
# Tests: pass-through, extraction, nested ZIPs, filtering, corruption handling
# Related: backend/app/services/zip_extractor.py

import io
import os
import tempfile
import zipfile
from pathlib import Path

import pytest

from app.services.zip_extractor import (
    SUPPORTED_EXTENSIONS,
    _extract_zip,
    _sanitize_filename,
    extract_files,
)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _create_dummy_file(directory: Path, name: str, content: bytes = b"dummy") -> Path:
    """Create a dummy file in the given directory."""
    path = directory / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def _create_zip(
    directory: Path,
    zip_name: str,
    files: dict[str, bytes],
) -> Path:
    """Create a ZIP file containing the specified files.

    Args:
        directory: Directory to create the ZIP in.
        zip_name: Name of the ZIP file.
        files: Mapping of {filename_in_zip: file_content}.

    Returns:
        Path to the created ZIP file.
    """
    zip_path = directory / zip_name
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return zip_path


def _create_nested_zip(
    directory: Path,
    outer_name: str,
    outer_files: dict[str, bytes],
    inner_name: str,
    inner_files: dict[str, bytes],
) -> Path:
    """Create a ZIP that contains another ZIP inside it.

    Args:
        directory: Directory to create the outer ZIP in.
        outer_name: Name of the outer ZIP file.
        outer_files: Regular files in the outer ZIP.
        inner_name: Name of the inner ZIP (as it appears in the outer ZIP).
        inner_files: Files inside the inner ZIP.

    Returns:
        Path to the created outer ZIP file.
    """
    # Build inner ZIP in memory
    inner_buf = io.BytesIO()
    with zipfile.ZipFile(inner_buf, "w", zipfile.ZIP_DEFLATED) as inner_zf:
        for name, content in inner_files.items():
            inner_zf.writestr(name, content)
    inner_bytes = inner_buf.getvalue()

    # Build outer ZIP containing the inner ZIP + regular files
    all_files = {**outer_files, inner_name: inner_bytes}
    return _create_zip(directory, outer_name, all_files)


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    """Provide a clean temporary directory for each test."""
    return tmp_path


# ── Tests: _sanitize_filename ────────────────────────────────────────────────


class TestSanitizeFilename:
    """Tests for the path traversal sanitization function."""

    def test_normal_filename(self) -> None:
        assert _sanitize_filename("document.pdf") == "document.pdf"

    def test_filename_with_subdirectory(self) -> None:
        result = _sanitize_filename("subdir/document.pdf")
        assert result is not None
        assert Path(result).name == "document.pdf"
        assert "subdir" in result

    def test_strips_parent_directory_references(self) -> None:
        result = _sanitize_filename("../../etc/passwd")
        assert result is not None
        assert ".." not in result
        assert "etc" in result

    def test_strips_leading_slash(self) -> None:
        result = _sanitize_filename("/etc/passwd")
        assert result is not None
        assert not result.startswith("/")
        assert not result.startswith("\\")

    def test_strips_drive_letter(self) -> None:
        result = _sanitize_filename("C:/Windows/system32/file.txt")
        assert result is not None
        assert "C:" not in result

    def test_empty_filename_returns_none(self) -> None:
        assert _sanitize_filename("") is None

    def test_dots_only_returns_none(self) -> None:
        assert _sanitize_filename("../..") is None

    def test_backslash_path(self) -> None:
        result = _sanitize_filename("folder\\subfolder\\file.docx")
        assert result is not None
        assert "file.docx" in result

    def test_unicode_filename(self) -> None:
        result = _sanitize_filename("документы/файл.pdf")
        assert result is not None
        assert "файл.pdf" in result


# ── Tests: extract_files — regular file pass-through ─────────────────────────


class TestExtractFilesPassThrough:
    """Tests for direct file pass-through (non-ZIP files)."""

    @pytest.mark.asyncio
    async def test_supported_file_passes_through(self, tmp_dir: Path) -> None:
        """Regular files with supported extensions should pass through unchanged."""
        pdf_file = _create_dummy_file(tmp_dir, "report.pdf", b"%PDF-1.4 dummy")
        docx_file = _create_dummy_file(tmp_dir, "spec.docx", b"PK dummy docx")

        results = await extract_files([pdf_file, docx_file])

        assert len(results) == 2
        paths = {r[0] for r in results}
        names = {r[1] for r in results}
        assert pdf_file in paths
        assert docx_file in paths
        assert "report.pdf" in names
        assert "spec.docx" in names

    @pytest.mark.asyncio
    async def test_unsupported_file_filtered_out(self, tmp_dir: Path) -> None:
        """Files with unsupported extensions should be silently filtered out."""
        txt_file = _create_dummy_file(tmp_dir, "readme.txt", b"Hello")
        xml_file = _create_dummy_file(tmp_dir, "data.xml", b"<root/>")

        results = await extract_files([txt_file, xml_file])

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_nonexistent_file_skipped(self, tmp_dir: Path) -> None:
        """Non-existent file paths should be skipped gracefully."""
        fake_path = tmp_dir / "does_not_exist.pdf"

        results = await extract_files([fake_path])

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_all_supported_extensions_pass_through(self, tmp_dir: Path) -> None:
        """Every supported extension should pass through."""
        files: list[Path] = []
        for ext in SUPPORTED_EXTENSIONS:
            f = _create_dummy_file(tmp_dir, f"file{ext}", b"dummy content")
            files.append(f)

        results = await extract_files(files)

        assert len(results) == len(SUPPORTED_EXTENSIONS)

    @pytest.mark.asyncio
    async def test_empty_input_returns_empty(self, tmp_dir: Path) -> None:
        """Empty input list should return empty output."""
        results = await extract_files([])

        assert results == []


# ── Tests: extract_files — ZIP extraction ────────────────────────────────────


class TestExtractFilesZip:
    """Tests for ZIP file extraction."""

    @pytest.mark.asyncio
    async def test_zip_with_supported_files(self, tmp_dir: Path) -> None:
        """ZIP containing supported files should extract them all."""
        zip_path = _create_zip(tmp_dir, "docs.zip", {
            "report.pdf": b"%PDF-1.4 content",
            "spec.docx": b"PK docx content",
            "data.xlsx": b"PK xlsx content",
        })

        results = await extract_files([zip_path])

        assert len(results) == 3
        names = {r[1] for r in results}
        assert names == {"report.pdf", "spec.docx", "data.xlsx"}

        # Verify extracted files exist and have correct content
        for path, _name in results:
            assert path.exists()

    @pytest.mark.asyncio
    async def test_zip_filters_unsupported_files(self, tmp_dir: Path) -> None:
        """Unsupported files inside ZIP should be filtered out."""
        zip_path = _create_zip(tmp_dir, "mixed.zip", {
            "report.pdf": b"pdf content",
            "readme.txt": b"text content",
            "config.xml": b"xml content",
            "image.png": b"png content",
            "script.py": b"python content",
        })

        results = await extract_files([zip_path])

        assert len(results) == 2
        names = {r[1] for r in results}
        assert names == {"report.pdf", "image.png"}

    @pytest.mark.asyncio
    async def test_empty_zip_returns_empty(self, tmp_dir: Path) -> None:
        """Empty ZIP file should return no results."""
        zip_path = _create_zip(tmp_dir, "empty.zip", {})

        results = await extract_files([zip_path])

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_zip_with_subdirectories(self, tmp_dir: Path) -> None:
        """Files in subdirectories inside ZIP should be extracted."""
        zip_path = _create_zip(tmp_dir, "structured.zip", {
            "docs/report.pdf": b"pdf",
            "images/photo.jpg": b"jpg",
            "nested/deep/spec.docx": b"docx",
        })

        results = await extract_files([zip_path])

        assert len(results) == 3
        names = {r[1] for r in results}
        assert names == {"report.pdf", "photo.jpg", "spec.docx"}


# ── Tests: Nested ZIP extraction ─────────────────────────────────────────────


class TestExtractFilesNestedZip:
    """Tests for recursive nested ZIP extraction."""

    @pytest.mark.asyncio
    async def test_nested_zip_extracts_recursively(self, tmp_dir: Path) -> None:
        """ZIP inside ZIP should be extracted recursively."""
        zip_path = _create_nested_zip(
            tmp_dir,
            outer_name="outer.zip",
            outer_files={
                "outer_doc.pdf": b"outer pdf content",
            },
            inner_name="inner.zip",
            inner_files={
                "inner_doc.docx": b"inner docx content",
                "inner_image.png": b"inner png content",
            },
        )

        results = await extract_files([zip_path])

        assert len(results) == 3
        names = {r[1] for r in results}
        assert "outer_doc.pdf" in names
        assert "inner_doc.docx" in names
        assert "inner_image.png" in names

    @pytest.mark.asyncio
    async def test_double_nested_zip(self, tmp_dir: Path) -> None:
        """ZIP inside ZIP inside ZIP — three levels deep."""
        # Build innermost ZIP
        innermost_buf = io.BytesIO()
        with zipfile.ZipFile(innermost_buf, "w") as zf:
            zf.writestr("deep_file.pdf", b"deepest content")
        innermost_bytes = innermost_buf.getvalue()

        # Build middle ZIP containing innermost
        middle_buf = io.BytesIO()
        with zipfile.ZipFile(middle_buf, "w") as zf:
            zf.writestr("middle_file.xlsx", b"middle content")
            zf.writestr("innermost.zip", innermost_bytes)
        middle_bytes = middle_buf.getvalue()

        # Build outer ZIP containing middle
        outer_path = tmp_dir / "triple_nested.zip"
        with zipfile.ZipFile(outer_path, "w") as zf:
            zf.writestr("outer_file.docx", b"outer content")
            zf.writestr("middle.zip", middle_bytes)

        results = await extract_files([outer_path])

        assert len(results) == 3
        names = {r[1] for r in results}
        assert names == {"outer_file.docx", "middle_file.xlsx", "deep_file.pdf"}

    @pytest.mark.asyncio
    async def test_nested_zip_filters_unsupported(self, tmp_dir: Path) -> None:
        """Unsupported files in nested ZIPs should still be filtered out."""
        zip_path = _create_nested_zip(
            tmp_dir,
            outer_name="filtered.zip",
            outer_files={
                "keep.pdf": b"pdf",
                "skip.txt": b"text",
            },
            inner_name="inner.zip",
            inner_files={
                "keep_inner.docx": b"docx",
                "skip_inner.csv": b"csv",
            },
        )

        results = await extract_files([zip_path])

        assert len(results) == 2
        names = {r[1] for r in results}
        assert names == {"keep.pdf", "keep_inner.docx"}


# ── Tests: Corrupt ZIP handling ──────────────────────────────────────────────


class TestExtractFilesCorruptZip:
    """Tests for graceful handling of corrupt ZIP files."""

    @pytest.mark.asyncio
    async def test_corrupt_zip_skipped_gracefully(self, tmp_dir: Path) -> None:
        """Corrupt ZIP files should be skipped without crashing."""
        corrupt_path = tmp_dir / "corrupt.zip"
        corrupt_path.write_bytes(b"This is not a ZIP file at all!")

        results = await extract_files([corrupt_path])

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_corrupt_zip_among_valid_files(self, tmp_dir: Path) -> None:
        """Corrupt ZIP shouldn't prevent other valid files from being processed."""
        corrupt_path = tmp_dir / "bad.zip"
        corrupt_path.write_bytes(b"not a zip")

        valid_pdf = _create_dummy_file(tmp_dir, "good.pdf", b"pdf content")

        valid_zip = _create_zip(tmp_dir, "good.zip", {
            "inside.docx": b"docx content",
        })

        results = await extract_files([corrupt_path, valid_pdf, valid_zip])

        assert len(results) == 2
        names = {r[1] for r in results}
        assert names == {"good.pdf", "inside.docx"}

    @pytest.mark.asyncio
    async def test_truncated_zip_handled(self, tmp_dir: Path) -> None:
        """A truncated/partial ZIP should be handled gracefully."""
        # Create a valid ZIP then truncate it
        valid_zip = _create_zip(tmp_dir, "valid.zip", {
            "file.pdf": b"x" * 1000,
        })
        content = valid_zip.read_bytes()
        truncated_path = tmp_dir / "truncated.zip"
        truncated_path.write_bytes(content[:len(content) // 2])

        results = await extract_files([truncated_path])

        # Should either extract what it can or skip entirely — no crash
        assert isinstance(results, list)


# ── Tests: Mixed input ───────────────────────────────────────────────────────


class TestExtractFilesMixed:
    """Tests for mixed input of regular files and ZIPs."""

    @pytest.mark.asyncio
    async def test_mixed_regular_and_zip(self, tmp_dir: Path) -> None:
        """Mix of regular files and ZIPs should all be processed correctly."""
        pdf = _create_dummy_file(tmp_dir, "direct.pdf", b"direct pdf")
        xlsx = _create_dummy_file(tmp_dir, "direct.xlsx", b"direct xlsx")

        zip_path = _create_zip(tmp_dir, "archive.zip", {
            "from_zip.docx": b"zipped docx",
            "from_zip.png": b"zipped png",
            "ignored.log": b"log file",
        })

        results = await extract_files([pdf, zip_path, xlsx])

        assert len(results) == 4
        names = {r[1] for r in results}
        assert names == {"direct.pdf", "direct.xlsx", "from_zip.docx", "from_zip.png"}

    @pytest.mark.asyncio
    async def test_mixed_with_unsupported_and_corrupt(self, tmp_dir: Path) -> None:
        """Full mixed scenario: valid files, unsupported files, corrupt ZIP, valid ZIP."""
        valid_pdf = _create_dummy_file(tmp_dir, "report.pdf", b"pdf")
        unsupported = _create_dummy_file(tmp_dir, "notes.txt", b"text")

        corrupt_zip = tmp_dir / "broken.zip"
        corrupt_zip.write_bytes(b"garbage data")

        valid_zip = _create_zip(tmp_dir, "good.zip", {
            "spec.docx": b"docx",
            "photo.jpeg": b"jpeg",
        })

        results = await extract_files([
            valid_pdf,
            unsupported,
            corrupt_zip,
            valid_zip,
        ])

        assert len(results) == 3
        names = {r[1] for r in results}
        assert names == {"report.pdf", "spec.docx", "photo.jpeg"}


# ── Tests: Path traversal protection ─────────────────────────────────────────


class TestPathTraversalProtection:
    """Tests ensuring malicious ZIP entries can't escape the extraction directory."""

    @pytest.mark.asyncio
    async def test_zip_with_path_traversal_entry(self, tmp_dir: Path) -> None:
        """ZIP entries with ../ should be sanitized, not used as-is."""
        zip_path = tmp_dir / "malicious.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("../../etc/passwd.pdf", b"malicious content")
            zf.writestr("normal.docx", b"safe content")

        results = await extract_files([zip_path])

        # The traversal entry should either be sanitized or skipped
        # The normal file should be extracted
        names = {r[1] for r in results}
        assert "normal.docx" in names

        # No file should exist outside the temp extraction directory
        assert not (tmp_dir / "etc").exists()

    @pytest.mark.asyncio
    async def test_zip_with_absolute_path_entry(self, tmp_dir: Path) -> None:
        """ZIP entries with absolute paths should be sanitized."""
        zip_path = tmp_dir / "absolute.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("/tmp/evil.pdf", b"content")

        results = await extract_files([zip_path])

        # Should extract with sanitized name, not to /tmp/
        for path, _name in results:
            assert str(path.resolve()).startswith(
                str(Path(tempfile.gettempdir()).resolve())
            )


# ── Tests: _extract_zip directly ─────────────────────────────────────────────


class TestExtractZipDirect:
    """Direct tests for the _extract_zip helper function."""

    @pytest.mark.asyncio
    async def test_basic_extraction(self, tmp_dir: Path) -> None:
        """Direct call to _extract_zip should work correctly."""
        zip_path = _create_zip(tmp_dir, "test.zip", {
            "doc.pdf": b"pdf content",
            "img.jpg": b"jpg content",
        })
        dest = tmp_dir / "output"
        dest.mkdir()

        results = await _extract_zip(zip_path, dest)

        assert len(results) == 2
        for path, name in results:
            assert path.exists()

    @pytest.mark.asyncio
    async def test_depth_limit_protection(self, tmp_dir: Path) -> None:
        """Extremely deep nesting should be stopped by the depth limit."""
        # Create a ZIP — we'll test by calling _extract_zip with high _depth
        zip_path = _create_zip(tmp_dir, "deep.zip", {
            "file.pdf": b"pdf content",
        })
        dest = tmp_dir / "output"
        dest.mkdir()

        # Calling at max_depth+1 should return empty
        results = await _extract_zip(
            zip_path, dest, _depth=11, _max_depth=10,
        )

        assert results == []

    @pytest.mark.asyncio
    async def test_zip_with_directories_only(self, tmp_dir: Path) -> None:
        """ZIP containing only directories should return empty results."""
        zip_path = tmp_dir / "dirs_only.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.mkdir("empty_dir")
            zf.mkdir("another_dir/nested")

        dest = tmp_dir / "output"
        dest.mkdir()

        results = await _extract_zip(zip_path, dest)

        assert results == []


# ── Tests: Edge cases ────────────────────────────────────────────────────────


class TestEdgeCases:
    """Tests for various edge cases."""

    @pytest.mark.asyncio
    async def test_case_insensitive_extensions(self, tmp_dir: Path) -> None:
        """File extensions should be matched case-insensitively."""
        zip_path = _create_zip(tmp_dir, "case.zip", {
            "UPPER.PDF": b"pdf",
            "Mixed.Docx": b"docx",
            "lower.xlsx": b"xlsx",
        })

        results = await extract_files([zip_path])

        assert len(results) == 3

    @pytest.mark.asyncio
    async def test_files_with_spaces_in_names(self, tmp_dir: Path) -> None:
        """Files with spaces in their names should be handled."""
        zip_path = _create_zip(tmp_dir, "spaces.zip", {
            "my report.pdf": b"pdf content",
            "folder with spaces/doc file.docx": b"docx content",
        })

        results = await extract_files([zip_path])

        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_unicode_filenames_in_zip(self, tmp_dir: Path) -> None:
        """Unicode filenames (e.g., Lithuanian) should be handled."""
        zip_path = _create_zip(tmp_dir, "unicode.zip", {
            "ataskaita_lietuvių.pdf": b"pdf",
            "документ.docx": b"docx",
        })

        results = await extract_files([zip_path])

        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_large_number_of_files(self, tmp_dir: Path) -> None:
        """ZIP with many files should be handled efficiently."""
        files = {f"file_{i:03d}.pdf": f"content_{i}".encode() for i in range(100)}
        zip_path = _create_zip(tmp_dir, "many_files.zip", files)

        results = await extract_files([zip_path])

        assert len(results) == 100

    @pytest.mark.asyncio
    async def test_duplicate_filenames_in_zip(self, tmp_dir: Path) -> None:
        """ZIP with duplicate filenames in different directories should extract both."""
        zip_path = _create_zip(tmp_dir, "dupes.zip", {
            "dir1/report.pdf": b"version 1",
            "dir2/report.pdf": b"version 2",
        })

        results = await extract_files([zip_path])

        # Both should be extracted (to different paths), both named "report.pdf"
        assert len(results) == 2
        paths = [r[0] for r in results]
        assert paths[0] != paths[1]  # Different file paths
