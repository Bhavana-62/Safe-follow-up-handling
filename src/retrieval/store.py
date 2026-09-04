"""Storage engine for document chunks supporting vector and keyword search.
Implements in-database entitlement filtering and stable id lookup.
"""
import math
import re
from datetime import datetime
from collections import defaultdict
from src.corpus.schema import Chunk

def compute_deterministic_embedding(text: str, dim: int = 768) -> list[float]:
    """Generates a stable, deterministic 768-dim normalized embedding vector.
    Used for local evaluation and testing without requiring external GPU/Ollama.
    """
    words = re.findall(r"\w+", text.lower())
    vec = [0.0] * dim
    if not words:
        return vec
    for w in words:
        h = hash(w)
        idx = abs(h) % dim
        sign = 1.0 if (h // dim) % 2 == 0 else -1.0
        vec[idx] += sign
    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 1e-9:
        vec = [x / norm for x in vec]
    return vec

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    if len(v1) != len(v2) or not v1:
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)

class HybridStore:
    def __init__(self):
        self._chunks: dict[int, Chunk] = {}
        self._next_id: int = 1
        self._doc_loc_index: dict[tuple[str, str], int] = {}
        self._embeddings: dict[int, list[float]] = {}

    def is_unchanged(self, doc_id: str, locator: str, content_hash: str) -> bool:
        cid = self._doc_loc_index.get((doc_id, locator))
        if cid is None:
            return False
        return self._chunks[cid].content_hash == content_hash

    def upsert_chunk(self, chunk: Chunk) -> int:
        key = (chunk.doc_id, chunk.locator)
        if key in self._doc_loc_index:
            cid = self._doc_loc_index[key]
        else:
            cid = self._next_id
            self._next_id += 1
            self._doc_loc_index[key] = cid

        stored_chunk = Chunk(
            id=cid,
            doc_id=chunk.doc_id,
            source=chunk.source,
            locator=chunk.locator,
            text=chunk.text,
            updated_at=chunk.updated_at,
            entitlements=chunk.entitlements,
            trusted=chunk.trusted,
            content_hash=chunk.content_hash,
        )
        self._chunks[cid] = stored_chunk
        self._embeddings[cid] = compute_deterministic_embedding(chunk.text)
        return cid

    def prune_removed(self, doc_id: str, keep_locators: set[str]) -> list[str]:
        removed = []
        to_delete = []
        for (d_id, loc), cid in list(self._doc_loc_index.items()):
            if d_id == doc_id and loc not in keep_locators:
                to_delete.append(((d_id, loc), cid))
        for key, cid in to_delete:
            del self._doc_loc_index[key]
            if cid in self._chunks:
                del self._chunks[cid]
            if cid in self._embeddings:
                del self._embeddings[cid]
            removed.append(key[1])
        return removed

    def lookup(self, source: str, locator: str) -> Chunk | None:
        for c in self._chunks.values():
            if c.source == source and c.locator == locator:
                return c
        return None

    def vector_search(self, query: str, caller_entitlements: frozenset[str], limit: int) -> list[Chunk]:
        """Entitlement filter is evaluated INSIDE the search query, never post-filtered."""
        q_emb = compute_deterministic_embedding(query)
        scored: list[tuple[float, Chunk]] = []

        for cid, chunk in self._chunks.items():
            # In SQL: WHERE entitlements && caller_entitlements
            if not (chunk.entitlements & caller_entitlements):
                continue
            emb = self._embeddings.get(cid, [])
            sim = cosine_similarity(q_emb, emb)
            scored.append((sim, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:limit]]

    def keyword_search(self, query: str, caller_entitlements: frozenset[str], limit: int) -> list[Chunk]:
        """Lexical search with in-query entitlement filtering."""
        q_tokens = set(re.findall(r"\w+", query.lower()))
        scored: list[tuple[float, Chunk]] = []

        for cid, chunk in self._chunks.items():
            # In SQL: WHERE entitlements && caller_entitlements
            if not (chunk.entitlements & caller_entitlements):
                continue
            text_tokens = re.findall(r"\w+", chunk.text.lower())
            if not text_tokens:
                continue
            overlap = sum(1 for t in text_tokens if t in q_tokens)
            if overlap > 0:
                score = overlap / math.sqrt(len(text_tokens))
                scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:limit]]

    def get_chunk(self, cid: int) -> Chunk | None:
        return self._chunks.get(cid)

    def clear(self):
        self._chunks.clear()
        self._doc_loc_index.clear()
        self._embeddings.clear()
        self._next_id = 1

_STORE = HybridStore()

def get_store() -> HybridStore:
    return _STORE
