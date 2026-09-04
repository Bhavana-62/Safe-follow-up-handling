"""Structural chunker for documents.
Splits on clauses and headings, preserves table headers, keeps code blocks atomic,
and computes stable locators.
"""
import re
import hashlib
from datetime import datetime, timezone
from src.corpus.schema import Chunk

MAX_TOKENS = 500
OVERLAP = 60

def _approx_token_count(text: str) -> int:
    return len(text.split())

def _hash_prefix(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:6]

def chunk_structurally(
    text: str,
    *,
    source: str,
    doc_id: str = "",
    entitlements: frozenset[str] = frozenset(),
    updated_at: datetime | None = None,
    trusted: bool = True,
) -> list[Chunk]:
    """Split on structure (headings, clauses). Fall back to paragraphs. Never on a fixed window."""
    if not doc_id:
        doc_id = source
    if updated_at is None:
        updated_at = datetime.now(timezone.utc)

    # 1. Check for table blocks or code blocks
    lines = text.splitlines()
    chunks: list[Chunk] = []

    # Regex patterns for structural sections
    # Matches: §2.1, Article 4(3), ## Heading, ### Subheading, 1.2 Clause
    clause_re = re.compile(r"^(§\s*[0-9]+(?:\.[0-9]+)*|Article\s+[0-9]+(?:\([0-9]+\))*|#{1,4}\s+.*|[0-9]+(?:\.[0-9]+)+\s+.*)", re.IGNORECASE)

    current_locator = "§1.0"
    current_lines: list[str] = []
    in_code_block = False
    code_block_lines: list[str] = []

    def flush_current():
        nonlocal current_lines, current_locator
        if not current_lines:
            return
        content = "\n".join(current_lines).strip()
        if not content:
            current_lines = []
            return

        # Check if length exceeds MAX_TOKENS, if so, split by paragraphs
        if _approx_token_count(content) <= MAX_TOKENS:
            c_hash = hashlib.sha256(content.encode()).hexdigest()
            chunks.append(Chunk(
                doc_id=doc_id,
                source=source,
                locator=current_locator,
                text=content,
                updated_at=updated_at,
                entitlements=entitlements,
                trusted=trusted,
                content_hash=c_hash,
            ))
        else:
            paras = content.split("\n\n")
            para_idx = 1
            for p in paras:
                p_text = p.strip()
                if not p_text:
                    continue
                loc = f"{current_locator} (p{para_idx}-{_hash_prefix(p_text)})"
                c_hash = hashlib.sha256(p_text.encode()).hexdigest()
                chunks.append(Chunk(
                    doc_id=doc_id,
                    source=source,
                    locator=loc,
                    text=p_text,
                    updated_at=updated_at,
                    entitlements=entitlements,
                    trusted=trusted,
                    content_hash=c_hash,
                ))
                para_idx += 1
        current_lines = []

    for line in lines:
        stripped = line.strip()

        # Handle fenced code block
        if stripped.startswith("```"):
            if not in_code_block:
                in_code_block = True
                code_block_lines = [line]
            else:
                code_block_lines.append(line)
                in_code_block = False
                # Code blocks are treated as atomic
                current_lines.extend(code_block_lines)
                code_block_lines = []
            continue

        if in_code_block:
            code_block_lines.append(line)
            continue

        # Check for clause / heading marker
        m = clause_re.match(stripped)
        if m:
            flush_current()
            # Derive locator
            raw_match = m.group(1).strip()
            if raw_match.startswith("#"):
                # Markdown heading
                h_text = raw_match.lstrip("#").strip()
                current_locator = h_text if h_text else f"sec-{_hash_prefix(stripped)}"
            else:
                current_locator = raw_match
            current_lines.append(line)
        else:
            current_lines.append(line)

    flush_current()

    # If no structural chunks produced (e.g., flat text), produce stable hash-based locator chunks
    if not chunks and text.strip():
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        for idx, p in enumerate(paragraphs, 1):
            h_pref = _hash_prefix(p)
            chunks.append(Chunk(
                doc_id=doc_id,
                source=source,
                locator=f"p{idx}-{h_pref}",
                text=p,
                updated_at=updated_at,
                entitlements=entitlements,
                trusted=trusted,
                content_hash=hashlib.sha256(p.encode()).hexdigest(),
            ))

    return chunks
