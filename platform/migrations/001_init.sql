-- platform/migrations/001_init.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS schema_version (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunk (
    id BIGSERIAL PRIMARY KEY,
    doc_id TEXT NOT NULL,
    source TEXT NOT NULL, -- "policy/refunds.md"
    locator TEXT NOT NULL, -- "§2.1" · "lines 88–104"
    text TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    entitlements TEXT[] NOT NULL,
    trusted BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL, -- freshness of the SOURCE
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    content_hash TEXT NOT NULL, -- re-ingest idempotency
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
    CONSTRAINT chunk_unique UNIQUE (doc_id, locator)
);

CREATE INDEX IF NOT EXISTS chunk_vec_idx ON chunk USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunk_tsv_idx ON chunk USING gin (tsv);
CREATE INDEX IF NOT EXISTS chunk_ent_idx ON chunk USING gin (entitlements);
CREATE INDEX IF NOT EXISTS chunk_doc_idx ON chunk (doc_id);

-- Mock tables for enterprise sources
CREATE SCHEMA IF NOT EXISTS erp;

CREATE TABLE IF NOT EXISTS erp.invoices (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    region TEXT NOT NULL,
    issued_at DATE NOT NULL,
    state TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS erp.purchase_orders (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    region TEXT NOT NULL,
    issued_at DATE NOT NULL,
    state TEXT NOT NULL DEFAULT 'open'
);

CREATE SCHEMA IF NOT EXISTS obs;

CREATE TABLE IF NOT EXISTS obs.incidents (
    id TEXT PRIMARY KEY,
    incident_number TEXT NOT NULL,
    title TEXT NOT NULL,
    region TEXT NOT NULL,
    severity TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    details TEXT
);
