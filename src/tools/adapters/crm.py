"""CRM and Org Read Tools Adapter."""
from typing import Literal
from pydantic import BaseModel, ConfigDict
from src.tools.spec import read_tool, Page

class PipelineChangesInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    region: Literal["NA", "EMEA", "APAC"] = "EMEA"

class PipelineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    account_id: str
    stage: str
    value: float
    region: str

@read_tool(
    name="pipeline_changes",
    input_model=PipelineChangesInput,
    required_claims={"employee"},
    scope_check=lambda p, c: p.region in c.regions,
    row_limit=50,
    freshness="live",
    description="Inspect CRM sales pipeline stage modifications and movements.",
)
def pipeline_changes(p: PipelineChangesInput, ctx) -> Page[PipelineItem]:
    # 41 rows, none in the incident window
    rows = [
        PipelineItem(id=f"PL-{4471+i}", account_id=f"ACC-{100+i}", stage="Qualified", value=5000.0, region="EMEA")
        for i in range(41)
    ]
    return Page(rows=rows, truncated=False)

class OrgChangesInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    region: Literal["NA", "EMEA", "APAC"] = "EMEA"

class OrgChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    effective_date: str
    description: str
    region: str

@read_tool(
    name="org_changes",
    input_model=OrgChangesInput,
    required_claims={"employee"},
    scope_check=lambda p, c: p.region in c.regions,
    row_limit=50,
    freshness="live",
    description="Inspect organisational and territory reassignments.",
)
def org_changes(p: OrgChangesInput, ctx) -> Page[OrgChange]:
    # Planted coincidence: territory reassignment on 10 November (dealer accounts)
    rows = [
        OrgChange(
            id="ORG-2211",
            effective_date="2026-11-10",
            description="Territory reassignment effective 10 November: dealer-channel accounts reassigned",
            region="EMEA",
        )
    ]
    return Page(rows=rows, truncated=False)

class DealerContractStatusInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    region: Literal["NA", "EMEA", "APAC"] = "EMEA"

class DealerStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dealer_id: str
    name: str
    status: str
    region: str

@read_tool(
    name="dealer_contract_status",
    input_model=DealerContractStatusInput,
    required_claims={"operations"},
    scope_check=lambda p, c: p.region in c.regions,
    row_limit=500,
    freshness="live",
    description="Look up active dealer partner agreements and contract status.",
)
def dealer_contract_status(p: DealerContractStatusInput, ctx) -> Page[DealerStatus]:
    # 412 rows for E4 worked example
    rows = [
        DealerStatus(dealer_id=f"DLR-{1000+i}", name=f"Dealer {i}", status="Active", region="EMEA")
        for i in range(412)
    ]
    return Page(rows=rows, truncated=False)

class DealerRevenueTrendInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    region: Literal["NA", "EMEA", "APAC"] = "EMEA"

class RevenueTrend(BaseModel):
    model_config = ConfigDict(extra="forbid")
    month: str
    change_pct: float
    region: str

@read_tool(
    name="dealer_revenue_trend",
    input_model=DealerRevenueTrendInput,
    required_claims={"operations"},
    scope_check=lambda p, c: p.region in c.regions,
    row_limit=100,
    freshness="live",
    description="Fetch historical revenue trends for dealer channels.",
)
def dealer_revenue_trend(p: DealerRevenueTrendInput, ctx) -> Page[RevenueTrend]:
    rows = [
        RevenueTrend(month=f"2026-{m:02d}", change_pct=-0.4 if m == 11 else 1.2, region="EMEA")
        for m in range(1, 13)
    ]
    return Page(rows=rows, truncated=False)
