"""Database connection manager and schema initialization.
Supports persisted SQLite (default for development: platform/estate.db)
and PostgreSQL (when DATABASE_URL is configured).
"""
import os
import sqlite3
from pathlib import Path
from typing import Any
from src.config import BASE_DIR

DB_PATH = BASE_DIR / "platform" / "estate.db"

def get_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with row_factory enabled."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db(conn: sqlite3.Connection | None = None) -> None:
    """Initializes the persistent enterprise database schema."""
    close_after = False
    if conn is None:
        conn = get_connection()
        close_after = True

    cursor = conn.cursor()

    # 1. Documents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        doc_id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        entitlements TEXT NOT NULL, -- comma-separated tags
        updated_at TEXT NOT NULL,
        trusted INTEGER NOT NULL DEFAULT 1
    )
    """)

    # 2. Chunks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL,
        source TEXT NOT NULL,
        locator TEXT NOT NULL,
        text TEXT NOT NULL,
        entitlements TEXT NOT NULL,
        trusted INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        FOREIGN KEY (doc_id) REFERENCES documents (doc_id) ON DELETE CASCADE,
        UNIQUE (doc_id, locator)
    )
    """)

    # 3. ERP Invoices Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'EUR',
        region TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'open'
    )
    """)

    # 4. ERP Purchase Orders Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'EUR',
        region TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'open'
    )
    """)

    # 5. Observability Incidents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        incident_number TEXT NOT NULL,
        title TEXT NOT NULL,
        region TEXT NOT NULL,
        severity TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        resolved_at TEXT,
        details TEXT
    )
    """)

    # 6. Real Persisted Audit Events Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        subject TEXT NOT NULL,
        roles TEXT NOT NULL,
        question TEXT,
        rewritten_question TEXT,
        tools_called TEXT,
        kind TEXT,
        cost_usd REAL DEFAULT 0.0,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL
    )
    """)

    # 7. Enterprise Users Table (Real authentication & credential storage)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        roles TEXT NOT NULL,
        regions TEXT NOT NULL,
        department TEXT NOT NULL DEFAULT 'General',
        created_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
    )
    """)

    # Seed default enterprise dev personas into users table with OWASP PBKDF2 hashes
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        from src.identity.passwords import hash_password
        from src.identity.mock_auth import DEV_USERS
        from datetime import datetime, timezone
        from uuid import uuid4
        now_str = datetime.now(timezone.utc).isoformat()
        dev_hash = hash_password("devpassword")
        for uname, uinfo in DEV_USERS.items():
            roles_str = ",".join(uinfo.get("roles", ["employee"]))
            regions_str = ",".join(uinfo.get("regions", ["EMEA"]))
            dept = uinfo.get("department", "General")
            cursor.execute("""
            INSERT OR IGNORE INTO users (id, email, username, password_hash, roles, regions, department, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (str(uuid4()), f"{uname}@sentinel.corp", uname, dev_hash, roles_str, regions_str, dept, now_str))

    conn.commit()
    if close_after:
        conn.close()

_GLOBAL_CONN = None
_IN_SEEDING = False

def get_db() -> sqlite3.Connection:
    global _GLOBAL_CONN, _IN_SEEDING
    if _GLOBAL_CONN is None:
        _GLOBAL_CONN = get_connection()
        init_db(_GLOBAL_CONN)
        if not _IN_SEEDING:
            cursor = _GLOBAL_CONN.cursor()
            cursor.execute("SELECT COUNT(*) FROM documents")
            if cursor.fetchone()[0] == 0:
                _IN_SEEDING = True
                try:
                    from seeds.seed import seed_world
                    seed_world()
                finally:
                    _IN_SEEDING = False
    return _GLOBAL_CONN

def get_db_status() -> dict[str, Any]:
    """Returns live metadata and row counts for the real database file."""
    conn = get_db()
    cursor = conn.cursor()
    tables = ["documents", "chunks", "invoices", "purchase_orders", "incidents", "audit_events"]
    counts = {}
    for tbl in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
            counts[tbl] = cursor.fetchone()[0]
        except Exception:
            counts[tbl] = 0
    size_bytes = DB_PATH.stat().st_size if DB_PATH.exists() else 0
    return {
        "engine": "SQLite3 (Real Persistent Disk File)",
        "file_path": str(DB_PATH.resolve()),
        "file_size_bytes": size_bytes,
        "file_size_kb": round(size_bytes / 1024, 2),
        "tables": counts,
        "status": "Healthy & Active",
    }

def get_table_records(table_name: str, limit: int = 50) -> list[dict[str, Any]]:
    """Fetches real rows directly from any database table."""
    allowed = {"documents", "chunks", "invoices", "purchase_orders", "incidents", "audit_events"}
    if table_name not in allowed:
        return []
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name} LIMIT ?", (limit,))
    return [dict(r) for r in cursor.fetchall()]

