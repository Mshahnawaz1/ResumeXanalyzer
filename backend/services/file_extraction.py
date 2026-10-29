"""
File extraction service — PDF and DOCX → raw text.

Called before any agent runs; agents receive plain text only.
"""

from __future__ import annotations

import io

import docx
import pdfplumber


def extract_text(file_bytes: bytes, filename: str) -> str:
    name = filename.lower()

    if name.endswith(".pdf"):
        return _extract_pdf(file_bytes)
    elif name.endswith(".docx"):
        return _extract_docx(file_bytes)
    else:
        raise ValueError(
            f"Unsupported file type: '{filename}'. Only PDF and DOCX are accepted."
        )


def _extract_pdf(data: bytes) -> str:
    pages: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    if not pages:
        raise ValueError("PDF appears to contain no extractable text.")
    return "\n\n".join(pages)


def _extract_docx(data: bytes) -> str:
    doc = docx.Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    if not paragraphs:
        raise ValueError("DOCX appears to contain no extractable text.")
    return "\n\n".join(paragraphs)
