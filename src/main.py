"""FastAPI service entrypoint for the Read-Only Enterprise Agent."""
from dataclasses import dataclass, field
from datetime import datetime, timezone
import time
from typing import Any
from uuid import UUID, uuid4
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from src.config import MAX_QUESTION_CHARS, DEFAULT_BUDGET
from src.identity.claims import Claims
from src.identity.verify import verify, AuthenticationError
from src.identity.mock_auth import DEV_USERS, mint_dev_token
from src.tools.spec import visible_tools, READ_TOOLS
import src.tools.adapters
from src.answer.schema import Answer
from src.answer.investigate import run_investigation
from src.telemetry.setup import get_tracer
from src.telemetry.cost import CTX_COST

app = FastAPI(title="readonly-agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TokenBucket:
    def __init__(self, rate_per_minute: int = 30, burst: int = 5):
        self.rate = rate_per_minute / 60.0
        self.burst = burst
        self.buckets: dict[str, tuple[float, float]] = {}

    def consume(self, subject: str) -> bool:
        now = time.time()
        tokens, last = self.buckets.get(subject, (self.burst, now))
        tokens = min(self.burst, tokens + (now - last) * self.rate)
        if tokens >= 1.0:
            self.buckets[subject] = (tokens - 1.0, now)
            return True
        self.buckets[subject] = (tokens, now)
        return False

    def retry_after(self, subject: str) -> int:
        now = time.time()
        tokens, last = self.buckets.get(subject, (0.0, now))
        needed = 1.0 - tokens
        return max(1, int(needed / self.rate))

_RATE_LIMITER = TokenBucket()

@dataclass
class RequestContext:
    run_id: UUID
    claims: Claims
    _token: str
    automation: str = "default"
    budget: int = DEFAULT_BUDGET
    visible_tool_names: frozenset[str] = field(default_factory=frozenset)

class AskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=3, max_length=MAX_QUESTION_CHARS)
    automation: str = "default"
    session_id: str | None = None
    is_followup: bool | None = None  # pass-through flag

@app.post("/ask", response_model=Answer)
def ask(req: AskRequest, authorization: str = Header(...)) -> Answer:
    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = verify(token)
    except AuthenticationError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    if not _RATE_LIMITER.consume(claims.subject):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Retry after {_RATE_LIMITER.retry_after(claims.subject)}s",
        )

    ctx = RequestContext(
        run_id=uuid4(),
        claims=claims,
        _token=token,
        automation=req.automation,
        budget=DEFAULT_BUDGET,
        visible_tool_names=frozenset(t.name for t in visible_tools(claims, req.automation)),
    )

    tracer = get_tracer()
    with tracer.start_as_current_span("request") as sp:
        if hasattr(sp, "set_attributes"):
            sp.set_attributes({
                "actor": claims.subject,
                "roles": ",".join(sorted(claims.roles)),
                "question": req.question,
                "automation": req.automation,
                "budget.tokens": ctx.budget,
            })

        answer = run_investigation(
            question=req.question,
            ctx=ctx,
            session_id=req.session_id,
            is_followup=req.is_followup,
        )

        if hasattr(sp, "set_attributes"):
            sp.set_attributes({
                "cost.total_usd": CTX_COST.get(),
                "answer.kind": answer.kind,
            })

    return answer

@app.post("/sessions/{session_id}/ask", response_model=Answer)
def ask_session(session_id: str, req: AskRequest, authorization: str = Header(...)) -> Answer:
    req.session_id = session_id
    return ask(req, authorization)

class TokenRequest(BaseModel):
    username: str
    password: str = "devpassword"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]

class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str
    password: str
    department: str = "General"

class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str
    password: str

from src.identity.users import register_user, authenticate_user, mint_user_jwt, AuthError

@app.post("/auth/register", response_model=TokenResponse)
def register_endpoint(req: RegisterRequest) -> TokenResponse:
    try:
        user = register_user(req.email, req.password, req.department)
        token = mint_user_jwt(user)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user={
                "username": user["username"],
                "roles": user["roles"],
                "regions": user["regions"],
                "department": user["department"],
            },
        )
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

@app.post("/auth/login", response_model=TokenResponse)
def login_endpoint(req: LoginRequest) -> TokenResponse:
    try:
        user = authenticate_user(req.email, req.password)
        token = mint_user_jwt(user)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user={
                "username": user["username"],
                "roles": user["roles"],
                "regions": user["regions"],
                "department": user["department"],
            },
        )
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

@app.post("/auth/token", response_model=TokenResponse)
def login_token(req: TokenRequest) -> TokenResponse:
    try:
        user = authenticate_user(req.username, req.password)
        token = mint_user_jwt(user)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user={
                "username": user["username"],
                "roles": user["roles"],
                "regions": user["regions"],
                "department": user["department"],
            },
        )
    except AuthError:
        # Backward compatibility for test suites
        username = req.username.strip()
        if username in DEV_USERS and req.password == "devpassword":
            token = mint_dev_token(username)
            user_info = DEV_USERS[username]
            return TokenResponse(
                access_token=token,
                token_type="bearer",
                user={
                    "username": username,
                    "roles": user_info.get("roles", []),
                    "regions": user_info.get("regions", []),
                    "department": user_info.get("department", ""),
                },
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password.",
        )

@app.get("/auth/personas")
def list_personas():
    return [
        {
            "username": uname,
            "roles": udata.get("roles", []),
            "regions": udata.get("regions", []),
            "department": udata.get("department", ""),
        }
        for uname, udata in DEV_USERS.items()
    ]

# ---------------------------------------------------------------------------
# SENTINEL Enterprise REST APIs
# ---------------------------------------------------------------------------
from src.db.repository import get_repository

def _get_claims(auth_header: str) -> Claims:
    token = auth_header.removeprefix("Bearer ").strip()
    try:
        return verify(token)
    except AuthenticationError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@app.get("/api/overview")
def get_overview(authorization: str = Header(...)):
    claims = _get_claims(authorization)
    repo = get_repository()
    return repo.get_overview_stats(claims)

@app.get("/api/documents")
def get_documents(authorization: str = Header(...)):
    claims = _get_claims(authorization)
    repo = get_repository()
    return repo.get_documents(claims.entitlements)

@app.get("/api/documents/{doc_id:path}")
def get_document_detail(doc_id: str, authorization: str = Header(...)):
    claims = _get_claims(authorization)
    repo = get_repository()
    doc = repo.get_document(doc_id, claims.entitlements)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Document '{doc_id}' requires entitlements not held by your claims.",
        )
    return doc

class DocumentActionRequest(BaseModel):
    doc_id: str
    action: str  # "summarize" | "explain" | "ask"
    question: str | None = None

@app.post("/api/ai/document-action")
def execute_document_action(req: DocumentActionRequest, authorization: str = Header(...)):
    claims = _get_claims(authorization)
    repo = get_repository()
    doc = repo.get_document(req.doc_id, claims.entitlements)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Document '{req.doc_id}' requires entitlements not held by your claims.",
        )

    action_prompts = {
        "summarize": f"Summarize key provisions, policies, or obligations in {req.doc_id}.",
        "explain": f"Explain the operational requirements and scope of {req.doc_id}.",
        "ask": req.question or f"What are the terms defined in {req.doc_id}?",
    }
    q = action_prompts.get(req.action, req.question or f"Review of {req.doc_id}")

    ctx = RequestContext(
        run_id=uuid4(),
        claims=claims,
        _token=authorization.removeprefix("Bearer ").strip(),
        automation="default",
        budget=DEFAULT_BUDGET,
        visible_tool_names=frozenset(t.name for t in visible_tools(claims)),
    )
    return run_investigation(question=q, ctx=ctx)

@app.get("/api/data/invoices")
def get_invoices_api(
    supplier_id: str | None = None,
    region: str | None = None,
    limit: int = 50,
    offset: int = 0,
    authorization: str = Header(...),
):
    claims = _get_claims(authorization)
    repo = get_repository()
    rows, total = repo.get_invoices(
        roles=claims.roles,
        regions=claims.regions,
        supplier_id=supplier_id,
        region=region,
        limit=limit,
        offset=offset,
    )
    return {"items": rows, "total": total, "limit": limit, "offset": offset}

@app.get("/api/data/purchase-orders")
def get_purchase_orders_api(
    year: int | None = None,
    region: str | None = None,
    limit: int = 50,
    offset: int = 0,
    authorization: str = Header(...),
):
    claims = _get_claims(authorization)
    repo = get_repository()
    rows, total = repo.get_purchase_orders(
        roles=claims.roles,
        regions=claims.regions,
        year=year,
        region=region,
        limit=limit,
        offset=offset,
    )
    return {"items": rows, "total": total, "limit": limit, "offset": offset}

@app.get("/api/data/incidents")
def get_incidents_api(
    region: str | None = None,
    limit: int = 50,
    offset: int = 0,
    authorization: str = Header(...),
):
    claims = _get_claims(authorization)
    repo = get_repository()
    rows, total = repo.get_incidents(
        roles=claims.roles,
        regions=claims.regions,
        region=region,
        limit=limit,
        offset=offset,
    )
    return {"items": rows, "total": total, "limit": limit, "offset": offset}

@app.get("/api/systems")
def get_systems_api(authorization: str = Header(...)):
    _get_claims(authorization)
    return [
        {
            "id": "erp",
            "name": "Finance & Supply Chain ERP",
            "status": "Available",
            "mode": "Read-Only",
            "capabilities": ["get_open_invoices", "get_open_pos", "revenue_by_region"],
            "required_roles": ["finance", "procurement"],
            "regional_scope": "Scoped strictly by verified caller claims",
            "safety_guarantee": "Safe by Construction (No write mutations exist)",
        },
        {
            "id": "obs",
            "name": "Production Telemetry & Observability",
            "status": "Available",
            "mode": "Read-Only",
            "capabilities": ["incidents_in_window"],
            "required_roles": ["employee"],
            "regional_scope": "Scoped strictly by verified caller claims",
            "safety_guarantee": "Non-intrusive read replica query execution",
        },
        {
            "id": "crm",
            "name": "Commercial CRM & Partner Registry",
            "status": "Available",
            "mode": "Read-Only",
            "capabilities": ["pipeline_changes", "org_changes", "dealer_contract_status", "dealer_revenue_trend"],
            "required_roles": ["employee"],
            "regional_scope": "Global / Regional filtering applied",
            "safety_guarantee": "Audited query ingress, zero update endpoints",
        },
        {
            "id": "corpus",
            "name": "Enterprise Document Knowledge Store",
            "status": "Available",
            "mode": "Read-Only",
            "capabilities": ["Hybrid Vector + Lexical Retrieval", "In-Query Entitlement Pre-Filter"],
            "required_roles": ["employee"],
            "regional_scope": "Gated by structural document entitlement tags",
            "safety_guarantee": "In-database filtering before LLM retrieval",
        },
    ]

@app.get("/api/search")
def search_api(q: str, authorization: str = Header(...)):
    claims = _get_claims(authorization)
    repo = get_repository()
    return repo.search_enterprise(q, claims)

@app.get("/api/security/permissions")
def get_permissions_api(authorization: str = Header(...)):
    claims = _get_claims(authorization)
    vis = visible_tools(claims)
    vis_names = {t.name for t in vis}
    
    denied = []
    for t in READ_TOOLS.values():
        if t.name not in vis_names:
            denied.append({
                "name": t.name,
                "description": t.description,
                "required_claims": sorted(list(t.required_claims)),
                "reason": f"Missing required role: {sorted(list(t.required_claims - claims.roles))}",
            })

    return {
        "subject": claims.subject,
        "roles": sorted(list(claims.roles)),
        "regions": sorted(list(claims.regions)),
        "department": claims.department or "General",
        "entitlements": sorted(list(claims.entitlements)),
        "allowed_tools": [
            {"name": t.name, "description": t.description, "row_limit": t.row_limit, "freshness": t.freshness}
            for t in vis
        ],
        "denied_tools": denied,
        "token_verification": "RS256 Algorithm Pinned · Keycloak / Dev Realm",
    }

@app.get("/api/security/activity")
def get_activity_api(limit: int = 50, authorization: str = Header(...)):
    claims = _get_claims(authorization)
    repo = get_repository()
    return repo.get_audit_events(limit=limit)

from src.db.database import get_db_status, get_table_records
from seeds.seed import seed_world

@app.get("/api/database/status")
def get_database_status_api(authorization: str = Header(...)):
    claims = _get_claims(authorization)
    if "admin" not in claims.roles and "finance" not in claims.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Database administration is restricted to system administrators.",
        )
    return get_db_status()

@app.get("/api/database/tables/{table_name}")
def get_database_table_api(table_name: str, limit: int = 50, authorization: str = Header(...)):
    claims = _get_claims(authorization)
    if "admin" not in claims.roles and "finance" not in claims.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Raw database table inspection is restricted to system administrators.",
        )
    if table_name == "users":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Violation: The users table contains credential hashes and cannot be inspected.",
        )
    return {
        "table": table_name,
        "rows": get_table_records(table_name, limit),
    }

@app.post("/api/database/seed")
def seed_database_api(authorization: str = Header(...)):
    claims = _get_claims(authorization)
    if "admin" not in claims.roles and "finance" not in claims.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Database seeding is restricted to system administrators.",
        )
    seed_world()
    return {
        "status": "success",
        "message": "Real database successfully seeded and verified on disk.",
        "db": get_db_status(),
    }



