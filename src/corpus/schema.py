"""Corpus chunk and source document schemas."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class Chunk(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: int | None = None
    doc_id: str
    source: str  # "policy/refunds.md", "handbook/leave.md"
    locator: str  # "§2.1", "lines 88–104"
    text: str
    updated_at: datetime  # freshness, surfaced in answers
    entitlements: frozenset[str]  # who may see this chunk
    trusted: bool = True  # False for content written outside the org
    content_hash: str = ""

class SourceDoc(BaseModel):
    model_config = ConfigDict(extra="forbid")

    doc_id: str
    source: str
    text: str
    updated_at: datetime
    entitlements: frozenset[str]
    trusted: bool = True

class IngestResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    written: int
    skipped: int
