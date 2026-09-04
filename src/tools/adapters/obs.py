"""Observability & Incidents Read Tools Adapter."""
from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, ConfigDict
from src.tools.spec import read_tool, Page

class IncidentsInWindowInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    region: Literal["NA", "EMEA", "APAC"] = "EMEA"
    window: str = "last_week"

class Incident(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    incident_number: str
    title: str
    region: str
    duration_hours: float
    occurred_at: str
    resolved_at: str

@read_tool(
    name="incidents_in_window",
    input_model=IncidentsInWindowInput,
    required_claims={"employee"},
    scope_check=lambda p, c: p.region in c.regions,
    row_limit=50,
    freshness="live",
    description="Query production observability incidents and system outages by region.",
)
def incidents_in_window(p: IncidentsInWindowInput, ctx) -> Page[Incident]:
    rows = [
        Incident(
            id="INC-2026-1119",
            incident_number="INC-2026-1119",
            title="EU deployment checkout returned 5xx for 29.7 hours",
            region="EMEA",
            duration_hours=29.7,
            occurred_at="2026-11-11T08:20:00Z",
            resolved_at="2026-11-12T14:05:00Z",
        ),
        Incident(
            id="INC-2026-1120",
            incident_number="INC-2026-1120",
            title="Redis latency spike in worker queue",
            region="EMEA",
            duration_hours=0.5,
            occurred_at="2026-11-10T19:00:00Z",
            resolved_at="2026-11-10T19:30:00Z",
        ),
        Incident(
            id="INC-2026-1121",
            incident_number="INC-2026-1121",
            title="Search reindexing memory pressure",
            region="EMEA",
            duration_hours=1.2,
            occurred_at="2026-11-09T03:00:00Z",
            resolved_at="2026-11-09T04:12:00Z",
        ),
        Incident(
            id="INC-2026-1122",
            incident_number="INC-2026-1122",
            title="CDN certificate renewal warning",
            region="EMEA",
            duration_hours=0.1,
            occurred_at="2026-11-08T10:00:00Z",
            resolved_at="2026-11-08T10:06:00Z",
        ),
    ]
    return Page(rows=rows, truncated=False)
