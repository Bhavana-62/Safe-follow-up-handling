"""Enterprise data repository implementing strict access-controlled queries
against the persistent database.
"""
import uuid
import json
from datetime import datetime, timezone
from typing import Any
from src.db.database import get_db
from src.identity.claims import Claims

class EnterpriseRepository:
    def __init__(self, conn=None):
        self.conn = conn or get_db()

    # --- Documents ---
    def get_documents(self, entitlements: frozenset[str]) -> list[dict[str, Any]]:
        """Returns documents where document entitlements overlap with caller's entitlements."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM documents ORDER BY doc_id ASC")
        rows = cursor.fetchall()
        authorized = []
        for r in rows:
            doc_ents = set(filter(None, [e.strip() for e in r["entitlements"].split(",")]))
            # Pre-filter: must overlap caller's entitlements
            if doc_ents & entitlements:
                authorized.append({
                    "doc_id": r["doc_id"],
                    "source": r["source"],
                    "title": r["title"],
                    "entitlements": list(doc_ents),
                    "updated_at": r["updated_at"],
                    "trusted": bool(r["trusted"]),
                })
        return authorized

    def get_document(self, doc_id: str, entitlements: frozenset[str]) -> dict[str, Any] | None:
        """Returns document content and metadata if caller is authorized."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE doc_id = ?", (doc_id,))
        r = cursor.fetchone()
        if not r:
            return None
        doc_ents = set(filter(None, [e.strip() for e in r["entitlements"].split(",")]))
        if not (doc_ents & entitlements):
            return None  # Access Denied
        
        # Fetch associated chunks
        cursor.execute("SELECT locator, text, updated_at, trusted FROM chunks WHERE doc_id = ? ORDER BY id ASC", (doc_id,))
        chunks = [dict(c) for c in cursor.fetchall()]

        return {
            "doc_id": r["doc_id"],
            "source": r["source"],
            "title": r["title"],
            "content": r["content"],
            "entitlements": list(doc_ents),
            "updated_at": r["updated_at"],
            "trusted": bool(r["trusted"]),
            "chunks": chunks,
        }

    # --- Invoices (ERP) ---
    def get_invoices(
        self,
        roles: frozenset[str],
        regions: frozenset[str],
        supplier_id: str | None = None,
        region: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """Queries open invoices. Requires 'finance' role and scopes to caller's regions."""
        if "finance" not in roles:
            return [], 0

        cursor = self.conn.cursor()
        query = "SELECT * FROM invoices WHERE 1=1"
        params: list[Any] = []

        # Scope by region
        if region:
            if region not in regions:
                return [], 0  # Outside scope
            query += " AND region = ?"
            params.append(region)
        else:
            placeholders = ",".join("?" for _ in regions)
            query += f" AND region IN ({placeholders})"
            params.extend(list(regions))

        if supplier_id:
            query += " AND supplier_id = ?"
            params.append(supplier_id)

        # Count total matching
        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        query += " ORDER BY issued_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]
        return rows, total

    # --- Purchase Orders (ERP) ---
    def get_purchase_orders(
        self,
        roles: frozenset[str],
        regions: frozenset[str],
        year: int | None = None,
        region: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """Queries purchase orders. Requires 'procurement' role and scopes to caller's regions."""
        if "procurement" not in roles:
            return [], 0

        cursor = self.conn.cursor()
        query = "SELECT * FROM purchase_orders WHERE 1=1"
        params: list[Any] = []

        if region:
            if region not in regions:
                return [], 0
            query += " AND region = ?"
            params.append(region)
        else:
            placeholders = ",".join("?" for _ in regions)
            query += f" AND region IN ({placeholders})"
            params.extend(list(regions))

        if year:
            query += " AND strftime('%Y', issued_at) = ?"
            params.append(str(year))

        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        query += " ORDER BY issued_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]
        return rows, total

    # --- Incidents (Observability) ---
    def get_incidents(
        self,
        roles: frozenset[str],
        regions: frozenset[str],
        region: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """Queries observability incidents. Scopes to caller's regions."""
        cursor = self.conn.cursor()
        query = "SELECT * FROM incidents WHERE 1=1"
        params: list[Any] = []

        if region:
            if region not in regions:
                return [], 0
            query += " AND region = ?"
            params.append(region)
        else:
            placeholders = ",".join("?" for _ in regions)
            query += f" AND region IN ({placeholders})"
            params.extend(list(regions))

        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        query += " ORDER BY occurred_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]
        return rows, total

    # --- Real Persisted Audit Logging ---
    def record_audit_event(
        self,
        event_type: str,
        subject: str,
        roles: list[str] | frozenset[str],
        question: str | None = None,
        rewritten_question: str | None = None,
        tools_called: list[str] | None = None,
        kind: str | None = None,
        cost_usd: float = 0.0,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
    ) -> None:
        cursor = self.conn.cursor()
        event_id = str(uuid.uuid4())
        roles_str = ",".join(sorted(roles))
        tools_str = ",".join(tools_called) if tools_called else ""
        now = datetime.now(timezone.utc).isoformat()

        cursor.execute("""
        INSERT INTO audit_events (
            id, event_type, subject, roles, question, rewritten_question,
            tools_called, kind, cost_usd, prompt_tokens, completion_tokens, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id, event_type, subject, roles_str, question, rewritten_question,
            tools_str, kind, cost_usd, prompt_tokens, completion_tokens, now
        ))
        self.conn.commit()

    def get_audit_events(self, subject: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        """Reads persisted audit records from the real database."""
        cursor = self.conn.cursor()
        if subject:
            cursor.execute("SELECT * FROM audit_events WHERE subject = ? ORDER BY timestamp DESC LIMIT ?", (subject, limit))
        else:
            cursor.execute("SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT ?", (limit,))
        rows = [dict(r) for r in cursor.fetchall()]
        return rows

    # --- Overview Metrics ---
    def get_overview_stats(self, claims: Claims) -> dict[str, Any]:
        """Calculates real metrics based on the caller's specific claims & entitlements."""
        # 1. Count authorized documents
        docs = self.get_documents(claims.entitlements)
        authorized_docs_count = len(docs)

        # 2. Count active records
        invoices, inv_total = self.get_invoices(claims.roles, claims.regions, limit=1)
        pos, po_total = self.get_purchase_orders(claims.roles, claims.regions, limit=1)
        incidents, inc_total = self.get_incidents(claims.roles, claims.regions, limit=1)

        # 3. Count recent user queries
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM audit_events WHERE subject = ?", (claims.subject,))
        user_queries = cursor.fetchone()[0]

        return {
            "authorized_documents": authorized_docs_count,
            "available_regions": sorted(list(claims.regions)),
            "roles": sorted(list(claims.roles)),
            "department": claims.department or "General",
            "invoice_records_accessible": inv_total,
            "purchase_orders_accessible": po_total,
            "incidents_accessible": inc_total,
            "recent_queries_count": user_queries,
            "database_engine": "SQLite (platform/estate.db)",
            "read_only_mode": True,
        }

    # --- Search ---
    def search_enterprise(self, query: str, claims: Claims) -> dict[str, Any]:
        """Global search across authorized documents and enterprise data."""
        q = f"%{query.strip().lower()}%"
        cursor = self.conn.cursor()

        # Search documents
        doc_matches = []
        for d in self.get_documents(claims.entitlements):
            cursor.execute("SELECT title, content FROM documents WHERE doc_id = ?", (d["doc_id"],))
            row = cursor.fetchone()
            if row and (query.lower() in row["title"].lower() or query.lower() in row["content"].lower()):
                doc_matches.append({
                    "type": "document",
                    "id": d["doc_id"],
                    "title": d["title"],
                    "snippet": row["content"][:200] + "...",
                    "source": d["source"],
                })

        # Search invoices if authorized
        invoice_matches = []
        if "finance" in claims.roles:
            cursor.execute("""
            SELECT id, supplier_id, amount, currency, region, issued_at 
            FROM invoices 
            WHERE (LOWER(id) LIKE ? OR LOWER(supplier_id) LIKE ?) AND region IN ({})
            LIMIT 10
            """.format(",".join("?" for _ in claims.regions)), [q, q] + list(claims.regions))
            for r in cursor.fetchall():
                invoice_matches.append({
                    "type": "invoice",
                    "id": r["id"],
                    "title": f"Invoice {r['id']} - {r['supplier_id']}",
                    "details": f"{r['currency']} {r['amount']:,.2f} ({r['region']}) - {r['issued_at']}",
                })

        # Search incidents if authorized
        incident_matches = []
        cursor.execute("""
        SELECT incident_number, title, region, severity, occurred_at 
        FROM incidents 
        WHERE (LOWER(incident_number) LIKE ? OR LOWER(title) LIKE ?) AND region IN ({})
        LIMIT 10
        """.format(",".join("?" for _ in claims.regions)), [q, q] + list(claims.regions))
        for r in cursor.fetchall():
            incident_matches.append({
                "type": "incident",
                "id": r["incident_number"],
                "title": f"{r['incident_number']}: {r['title']}",
                "details": f"Severity: {r['severity']} | Region: {r['region']} | {r['occurred_at'][:10]}",
            })

        return {
            "query": query,
            "documents": doc_matches,
            "invoices": invoice_matches,
            "incidents": incident_matches,
            "total_matches": len(doc_matches) + len(invoice_matches) + len(incident_matches),
        }

_REPO = None

def get_repository() -> EnterpriseRepository:
    global _REPO
    if _REPO is None:
        _REPO = EnterpriseRepository()
    return _REPO
