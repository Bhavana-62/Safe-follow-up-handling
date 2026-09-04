"""Session Turn schema."""
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field
from src.answer.schema import EvidenceRef

class Turn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    turn_id: str
    caller_identity: str  # per-turn caller identity in session store
    question: str
    rewritten_question: str | None = None
    is_followup: bool = False
    answer_summary: str
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)  # what the answer stood on
    tools_called: list[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
