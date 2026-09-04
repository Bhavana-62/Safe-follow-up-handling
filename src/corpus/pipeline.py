"""Ingestion pipeline for corpus documents.
Enforces strict entitlement rules by path, idempotent content_hash checks,
and prune_removed for deleted clauses.
"""
import fnmatch
import hashlib
from src.corpus.schema import SourceDoc, IngestResult, Chunk
from src.corpus.chunker import chunk_structurally

ENTITLEMENT_RULES: list[tuple[str, frozenset[str], bool]] = [
    ("*/policies/hr/*", frozenset({"employee"}), True),
    ("policies/hr/*", frozenset({"employee"}), True),
    ("*/policies/finance/*", frozenset({"finance"}), True),
    ("policies/finance/*", frozenset({"finance"}), True),
    ("policy/refunds.md*", frozenset({"employee", "support"}), True),
    ("*/policy/refunds.md*", frozenset({"employee", "support"}), True),
    ("policy/pricing.md*", frozenset({"sales", "finance"}), True),
    ("*/policy/pricing.md*", frozenset({"sales", "finance"}), True),
    ("*/contracts/*", frozenset({"legal", "procurement"}), True),
    ("contracts/*", frozenset({"legal", "procurement"}), True),
    ("*/supplier-notes/*", frozenset({"procurement"}), False),  # untrusted
    ("supplier-notes/*", frozenset({"procurement"}), False),
]

def resolve_entitlements_for_path(path: str) -> tuple[frozenset[str], bool]:
    """Resolves entitlements for a document path.
    Fails closed: anything not matched raises ValueError.
    """
    clean_path = path.replace("\\", "/")
    for pattern, ents, trusted in ENTITLEMENT_RULES:
        if fnmatch.fnmatch(clean_path, pattern):
            return ents, trusted
    raise ValueError(f"No entitlement rule matches path {clean_path!r}. Refusing open default.")

def ingest(doc: SourceDoc, store) -> IngestResult:
    """Ingests a source document into the vector/hybrid store.
    1. Splits structurally into chunks.
    2. Compares content_hash for idempotency.
    3. Prunes removed chunks that no longer exist in the new document.
    """
    chunks = chunk_structurally(
        doc.text,
        source=doc.source,
        doc_id=doc.doc_id,
        entitlements=doc.entitlements,
        updated_at=doc.updated_at,
        trusted=doc.trusted,
    )

    written = 0
    skipped = 0
    keep_locators = set()

    for c in chunks:
        h = c.content_hash or hashlib.sha256(c.text.encode("utf-8")).hexdigest()
        keep_locators.add(c.locator)
        if store.is_unchanged(doc.doc_id, c.locator, h):
            skipped += 1
            continue
        store.upsert_chunk(c)
        written += 1

    # Prune removed chunks
    store.prune_removed(doc.doc_id, keep_locators=keep_locators)

    return IngestResult(written=written, skipped=skipped)
