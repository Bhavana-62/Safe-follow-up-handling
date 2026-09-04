"""Database and corpus seeding script.
Produces idempotent, deterministic state for evaluation, database storage, and demonstrations.
"""
from datetime import datetime, timezone, date
from pathlib import Path
from src.corpus.schema import SourceDoc
from src.corpus.pipeline import ingest
from src.retrieval.store import get_store
from src.session.store import get_session_store
from src.db.database import get_db, init_db

SEED = 20260101

DOCS_META = [
    {
        "file": "policy_refunds.md",
        "doc_id": "policy/refunds.md",
        "source": "policy/refunds.md",
        "title": "Corporate Refund & Damaged Goods Policy",
        "entitlements": frozenset({"employee", "support"}),
        "updated_at": datetime(2026, 9, 14, 0, 0, tzinfo=timezone.utc),
        "trusted": True,
    },
    {
        "file": "policy_pricing.md",
        "doc_id": "policy/pricing.md",
        "source": "policy/pricing.md",
        "title": "Commercial Pricing & Discount Authority Policy",
        "entitlements": frozenset({"sales", "finance"}),
        "updated_at": datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc),
        "trusted": True,
    },
    {
        "file": "contracts_meridian_msa.md",
        "doc_id": "contracts/meridian-msa.pdf",
        "source": "contracts/meridian-msa.pdf",
        "title": "Meridian Global Master Services Agreement (2025)",
        "entitlements": frozenset({"legal", "procurement"}),
        "updated_at": datetime(2025, 4, 1, 0, 0, tzinfo=timezone.utc),
        "trusted": True,
    },
    {
        "file": "supplier_notes_meridian.md",
        "doc_id": "supplier-notes/meridian-2026-08.md",
        "source": "supplier-notes/meridian-2026-08.md",
        "title": "Meridian Supplier Review & Extension Memo",
        "entitlements": frozenset({"procurement"}),
        "updated_at": datetime(2026, 8, 11, 0, 0, tzinfo=timezone.utc),
        "trusted": False,
    },
]

SEEDED_INVOICES = [
    ("INV-88214", "SUP-001", 25600.0, "EUR", "EMEA", "2026-11-11", "open"),
    ("INV-88215", "SUP-001", 25600.0, "EUR", "EMEA", "2026-11-12", "open"),
    ("INV-88410", "SUP-002", 14200.0, "EUR", "EMEA", "2026-11-10", "open"),
    ("INV-99001", "SUP-099", 89000.0, "USD", "NA", "2026-11-05", "open"),
    ("INV-77001", "SUP-014", 45000.0, "USD", "APAC", "2026-11-01", "open"),
]

SEEDED_INCIDENTS = [
    ("INC-2026-1119", "INC-2026-1119", "EU deployment checkout returned 5xx for 29.7 hours", "EMEA", "P1", "2026-11-11T08:20:00Z", "2026-11-12T14:05:00Z", "EU deployment checkout returned 5xx errors for 29.7 hours, impacting direct storefront revenue."),
    ("INC-4401", "INC-4401", "EMEA Checkout Service 500 error spike", "EMEA", "P1", "2026-11-03T14:10:00Z", "2026-11-03T15:25:00Z", "Gateway 502/500 errors impacted checkout processing."),
    ("INC-4402", "INC-4402", "Payment gateway timeout in EU-West", "EMEA", "P2", "2026-11-04T09:30:00Z", "2026-11-04T10:15:00Z", "Intermittent timeouts with third-party payment provider."),
    ("INC-5100", "INC-5100", "US East DB Replica replication lag", "NA", "P2", "2026-11-02T18:00:00Z", "2026-11-02T19:00:00Z", "Lag resolved after replica auto-scale."),
]

def seed_world(name: str = "sample") -> None:
    """Seeds the hybrid store and the persistent database."""
    conn = get_db()
    init_db(conn)
    cursor = conn.cursor()

    store = get_store()
    store.clear()
    get_session_store().clear()

    # Clear DB tables for clean idempotent state
    cursor.execute("DELETE FROM documents")
    cursor.execute("DELETE FROM chunks")
    cursor.execute("DELETE FROM invoices")
    cursor.execute("DELETE FROM purchase_orders")
    cursor.execute("DELETE FROM incidents")

    # Seed Documents and Chunks
    corpus_dir = Path(__file__).resolve().parent / name / "corpus"
    for meta in DOCS_META:
        fpath = corpus_dir / meta["file"]
        if fpath.exists():
            text = fpath.read_text(encoding="utf-8")
            doc = SourceDoc(
                doc_id=meta["doc_id"],
                source=meta["source"],
                text=text,
                updated_at=meta["updated_at"],
                entitlements=meta["entitlements"],
                trusted=meta["trusted"],
            )
            ingest(doc, store)

            # Persist in SQLite/Postgres documents table
            cursor.execute("""
            INSERT INTO documents (doc_id, source, title, content, entitlements, updated_at, trusted)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                meta["doc_id"],
                meta["source"],
                meta["title"],
                text,
                ",".join(sorted(meta["entitlements"])),
                meta["updated_at"].isoformat(),
                1 if meta["trusted"] else 0,
            ))

    # Persist Chunks in DB
    for cid, c in store._chunks.items():
        cursor.execute("""
        INSERT INTO chunks (id, doc_id, source, locator, text, entitlements, trusted, updated_at, content_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c.id,
            c.doc_id,
            c.source,
            c.locator,
            c.text,
            ",".join(sorted(c.entitlements)),
            1 if c.trusted else 0,
            c.updated_at.isoformat(),
            c.content_hash,
        ))

    # Seed Invoices
    for inv in SEEDED_INVOICES:
        cursor.execute("""
        INSERT INTO invoices (id, supplier_id, amount, currency, region, issued_at, state)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, inv)

    # Seed Purchase Orders (205 items for row limit test)
    for i in range(1, 206):
        cursor.execute("""
        INSERT INTO purchase_orders (id, supplier_id, amount, currency, region, issued_at, state)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            f"PO-2026-{i:04d}",
            f"SUP-{((i - 1) % 20) + 1:03d}",
            5000.0 + (i * 10),
            "EUR",
            "EMEA",
            f"2026-0{(i % 9) + 1:01d}-15",
            "open",
        ))

    # Seed Incidents
    for inc in SEEDED_INCIDENTS:
        cursor.execute("""
        INSERT INTO incidents (id, incident_number, title, region, severity, occurred_at, resolved_at, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, inc)

    conn.commit()

if __name__ == "__main__":
    seed_world()
    print("Seed complete: Documents, Chunks, Invoices, POs, and Incidents persisted in database.")
