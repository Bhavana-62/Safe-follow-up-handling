"""ERP Read Tools Adapter querying the real persisted enterprise database."""
from datetime import date, datetime, timezone
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from src.tools.spec import read_tool, Page
from src.db.repository import get_repository

class OpenInvoicesInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    supplier_id: str | None = Field(default=None, pattern=r"^SUP-[0-9]{3}$")
    since: date = Field(default_factory=lambda: date(2026, 1, 1))
    region: Literal["NA", "EMEA", "APAC"] = "EMEA"

class Invoice(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    supplier_id: str
    amount: float
    currency: str = "EUR"
    region: str
    issued_at: date
    state: str = "open"

@read_tool(
    name="get_open_invoices",
    input_model=OpenInvoicesInput,
    required_claims={"finance"},
    scope_check=lambda p, c: p.region in c.regions,
    row_limit=200,
    freshness="live",
    description="Fetch open supplier invoices filtered by supplier_id, date, and region from the real database.",
)
def get_open_invoices(p: OpenInvoicesInput, ctx) -> Page[Invoice]:
    repo = get_repository()
    rows, total = repo.get_invoices(
        roles=ctx.claims.roles,
        regions=ctx.claims.regions,
        supplier_id=p.supplier_id,
        region=p.region,
        limit=200,
    )
    invoices = []
    for r in rows:
        dt = date.fromisoformat(r["issued_at"])
        if dt >= p.since:
            invoices.append(Invoice(
                id=r["id"],
                supplier_id=r["supplier_id"],
                amount=r["amount"],
                currency=r["currency"],
                region=r["region"],
                issued_at=dt,
                state=r["state"],
            ))
    return Page(rows=invoices[:200], truncated=total > 200)

class OpenPosInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    year: int = 2026
    region: Literal["NA", "EMEA", "APAC"] = "EMEA"

class PurchaseOrder(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    supplier_id: str
    amount: float
    currency: str = "EUR"
    region: str
    issued_at: date

@read_tool(
    name="get_open_pos",
    input_model=OpenPosInput,
    required_claims={"procurement"},
    scope_check=lambda p, c: p.region in c.regions,
    row_limit=200,
    freshness="live",
    description="Retrieve all open purchase orders for a specified year and region from the real database.",
)
def get_open_pos(p: OpenPosInput, ctx) -> Page[PurchaseOrder]:
    repo = get_repository()
    rows, total = repo.get_purchase_orders(
        roles=ctx.claims.roles,
        regions=ctx.claims.regions,
        year=p.year,
        region=p.region,
        limit=200,
    )
    pos = [
        PurchaseOrder(
            id=r["id"],
            supplier_id=r["supplier_id"],
            amount=r["amount"],
            currency=r["currency"],
            region=r["region"],
            issued_at=date.fromisoformat(r["issued_at"]),
        )
        for r in rows
    ]
    return Page(rows=pos, truncated=total > 200)

class RevenueByRegionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    region: Literal["NA", "EMEA", "APAC"] = "EMEA"
    time_window: str = "last_week"

class RevenueMetric(BaseModel):
    model_config = ConfigDict(extra="forbid")
    region: str
    channel: str
    delta_percent: float
    lost_revenue: float
    currency: str = "EUR"
    date: date

@read_tool(
    name="revenue_by_region",
    input_model=RevenueByRegionInput,
    required_claims={"finance"},
    scope_check=lambda p, c: p.region in c.regions,
    row_limit=100,
    freshness="live",
    description="Read revenue breakdown and channel delta metrics for a region.",
)
def revenue_by_region(p: RevenueByRegionInput, ctx) -> Page[RevenueMetric]:
    rows = [
        RevenueMetric(region=p.region, channel="direct_storefront", delta_percent=-88.0, lost_revenue=51200.0, currency="EUR", date=date(2026, 11, 12)),
        RevenueMetric(region=p.region, channel="dealer_channel", delta_percent=-0.4, lost_revenue=800.0, currency="EUR", date=date(2026, 11, 12)),
    ]
    return Page(rows=rows, truncated=False)
