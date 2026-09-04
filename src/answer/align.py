"""Deterministic code-joining and evidence alignment.
Normalises currencies, aligns time series, and links records by entity id without model guessing.
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any
from src.answer.schema import EvidenceRef

BASE_CCY = "EUR"
FX_RATES = {
    "USD": 0.92,
    "EUR": 1.0,
    "GBP": 1.17,
}

@dataclass
class SourceResult:
    source_name: str
    rows: list[Any]
    provenance: list[EvidenceRef]
    truncated: bool = False

@dataclass
class AlignedEvidence:
    rows: list[Any]
    by_bucket: dict[Any, list[Any]] = field(default_factory=dict)
    by_entity: dict[str, dict[str, Any]] = field(default_factory=dict)
    provenance: list[EvidenceRef] = field(default_factory=list)
    truncated_sources: list[str] = field(default_factory=list)

def align(results: list[SourceResult], *, bucket: str = "day") -> AlignedEvidence:
    """Time-bucket, normalise currency, and join on entity id. No model involved."""
    all_rows = []
    all_prov = []
    truncated_sources = []

    for res in results:
        all_rows.extend(res.rows)
        all_prov.extend(res.provenance)
        if res.truncated:
            truncated_sources.append(f"{res.source_name} (limit reached)")

    # 1. Currency normalisation
    for r in all_rows:
        curr = getattr(r, "currency", None)
        if curr and curr != BASE_CCY:
            amt = getattr(r, "amount", 0.0)
            rate = FX_RATES.get(curr, 1.0)
            setattr(r, "amount_base", amt * rate)
            setattr(r, "fx_rate_source", f"fx.{curr}.2026-11-14")

    # 2. Time-bucket
    buckets: dict[str, list[Any]] = {}
    for r in all_rows:
        dt = getattr(r, "occurred_at", None) or getattr(r, "issued_at", None) or getattr(r, "date", None)
        if dt:
            dt_key = str(dt)[:10]
            buckets.setdefault(dt_key, []).append(r)

    # 3. Entity join
    by_entity: dict[str, dict[str, Any]] = {}
    for r in all_rows:
        eid = getattr(r, "supplier_id", None) or getattr(r, "dealer_id", None) or getattr(r, "account_id", None)
        if eid:
            by_entity.setdefault(eid, {})[r.__class__.__name__] = r

    return AlignedEvidence(
        rows=all_rows,
        by_bucket=buckets,
        by_entity=by_entity,
        provenance=all_prov,
        truncated_sources=truncated_sources,
    )
