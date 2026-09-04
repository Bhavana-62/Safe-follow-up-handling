"""The Output Contract.
An answer is a typed object where every claim carries evidence,
hypotheses considered and rejected are named, and 'I cannot answer this' is a valid result.
"""
from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class EvidenceRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: str  # "erp.invoices" · "policy/refunds.md"
    locator: str  # "rows 4471–4498" · "§2.1"
    retrieved_at: datetime
    as_of: datetime | None = None  # freshness of underlying data

class Finding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    claim: str
    evidence: list[EvidenceRef] = Field(min_length=1)  # enforced, not prompted
    confidence: Literal["high", "medium", "low"]

class Answer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["answered", "partial", "declined"]
    summary: str
    findings: list[Finding] = Field(default_factory=list)
    considered_and_rejected: list[str] = Field(default_factory=list)
    scope_limits: list[str] = Field(default_factory=list)  # derived from caller's claims in code
    truncated_sources: list[str] = Field(default_factory=list)  # row limits hit
    unanswered: list[str] = Field(default_factory=list)
    missing_sources: list[str] = Field(default_factory=list)  # what would be needed to answer
    rewritten_question: str | None = None  # shown to user when question is rewritten
    is_followup: bool = False  # pass-through flag

    @classmethod
    def declined(
        cls,
        question: str,
        missing_sources: list[str] | None = None,
        summary: str = "I can't answer that from available evidence.",
        unanswered: list[str] | None = None,
        scope_limits: list[str] | None = None,
        rewritten_question: str | None = None,
        is_followup: bool = False,
        considered_and_rejected: list[str] | None = None,
    ) -> "Answer":
        return cls(
            kind="declined",
            summary=summary,
            findings=[],
            considered_and_rejected=considered_and_rejected or [],
            scope_limits=scope_limits or [],
            truncated_sources=[],
            unanswered=unanswered or ([question] if not summary.startswith("I can't answer that — your access") else []),
            missing_sources=missing_sources or [],
            rewritten_question=rewritten_question,
            is_followup=is_followup,
        )

class StandaloneQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str  # The rewritten standalone question
    is_followup: bool  # Whether the input was classified as a follow-up
    rationale: str = ""
