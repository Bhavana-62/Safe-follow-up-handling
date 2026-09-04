# Read-Only Enterprise Agent

An enterprise read-only AI agent following the **Autonomy Ladder Practitioner Guide: Building a Read-Only Enterprise Agent** (Days 1–6) and **Implementation Guide** (§1–§14).

## Key Features & Requirements Built

1. **Follow-up Rewriting into Standalone Questions** (`src/session/resolver.py`)
   - Ambiguous conversational follow-ups (e.g. "What was the amount of that?", "Show me the ones from EMEA") are rewritten into fully self-contained standalone questions using recent conversation turns before retrieval or tool execution.
   - The rewritten question is surfaced directly to the user in the `rewritten_question` field of the output contract.

2. **Strict Two-Turn History Cap** (`src/session/store.py`)
   - Contextual history retrieval is strictly capped at the last two turns (`history[-2:]`) to prevent context window degradation and hallucination drift.

3. **`is_followup` Pass-Through** (`src/answer/schema.py`, `src/main.py`)
   - Callers can explicitly specify whether a request is a follow-up via `is_followup: bool | None`.
   - The verified or classified follow-up status is passed through and returned in the `Answer` object.

4. **Per-Turn Caller Identity in Session Store** (`src/session/schema.py`, `src/session/store.py`)
   - In shared or collaborative multi-user sessions, each `Turn` explicitly records the individual `caller_identity` (the `Claims.subject` authenticated for that turn) rather than assuming a single session owner.

5. **Entitlement Isolation & The Trap Avoidance**
   - **The Trap**: Carrying previous turns' retrieved chunks or tool data forward across turns. It is faster, users prefer it, and it is a major access-control defect.
   - **The Fix**: The system carries forward **only the rewritten question**, discarding all previous evidence chunks and tool records. Retrieval, entitlement pre-filtering, and tool permissions are re-evaluated from scratch against the **current turn caller's claims**.
   - In a shared session, if User 1 (with `finance` entitlements) asks about open invoices and User 2 (without `finance` entitlements) asks a follow-up ("What was the amount of that?"), User 2 receives **zero** information that User 1's entitlements uniquely permitted.

6. **The Output Contract & Honesty Behaviors** (`src/answer/schema.py`, `src/answer/synthesis.py`)
   - `min_length=1` on finding evidence: enforced by Pydantic type validation.
   - Declines when evidence is missing: `Answer.declined()` naming `missing_sources`.
   - Populates `scope_limits` from claims in code, never by LLM hallucination.
   - Propagates row limit truncation: sets `kind="partial"` and populates `truncated_sources`.
   - Handles untrusted external content with `trusted: bool = False`, reporting it attributed with low confidence.

---

## Directory Structure

```
├── frontend/                    # Modern React + TypeScript + Tailwind UI
│   ├── src/
│   │   ├── api/client.ts        # Dedicated typed API client with RS256 JWT auth
│   │   ├── components/          # Enterprise UI (Header, Sidebar, AnswerCard, EvidencePanel)
│   │   ├── hooks/               # useAuth, useChat
│   │   └── types/api.ts         # TypeScript models matching backend Pydantic schemas
│   ├── package.json
│   └── vite.config.ts
├── platform/
│   ├── docker-compose.yml       # PostgreSQL + pgvector, Keycloak, Ollama, Jaeger, Frontend
│   ├── .env.example             # Environment configuration
│   ├── migrations/001_init.sql  # Schema with pgvector, GIN index on entitlements
│   ├── profiles/local.yaml      # Model role profiles and compute pricing
│   └── keycloak/realm-agent.json# Keycloak realm with audience & flattened roles
├── src/
│   ├── identity/                # JWT verification, Claims, and entitlement bridge
│   ├── corpus/                  # Document schemas, structural chunker, idempotent ingestion
│   ├── retrieval/               # Vector, keyword, RRF fusion, pre-query entitlement filter
│   ├── tools/                   # Read tool decorator, 4 import-time checks, adapters
│   ├── answer/                  # Output contract, planning, deterministic align, synthesis
│   ├── session/                 # Turn schema, session store, follow-up rewriting, history cap
│   ├── telemetry/               # OpenTelemetry tracer setup, cost meter
│   ├── llm/                     # Structured output client, repair retry, versioned prompts
│   ├── main.py                  # FastAPI service (/ask, /sessions/{session_id}/ask, /auth)
│   └── cli.py                   # CLI entrypoint with trace URL output
├── seeds/                       # Fixture data and sample corpus (refunds, pricing, contracts)
├── tests/                       # Complete eval suite (E1-E6, DoD, shared session security)
└── run_evals.py                 # Standalone test runner
```

---

## Running the Application

### 1. Start the Backend API
In your Python environment:
```powershell
uvicorn src.main:app --reload --port 8000
```
- API & Swagger documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Start the Frontend UI
In a separate terminal:
```powershell
cd frontend
npm install
npm run dev
```
- Frontend application: [http://localhost:5173](http://localhost:5173)

### 3. Run via Docker Compose (Complete Estate)
```powershell
docker compose -f platform/docker-compose.yml up --build -d
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Keycloak: [http://localhost:8080](http://localhost:8080)
- Jaeger UI: [http://localhost:16686](http://localhost:16686)

---

## Running the Evals & Verifications

Run the evaluation test suite:

```bash
python run_evals.py
```
Or via pytest:
```bash
pytest -v
```
