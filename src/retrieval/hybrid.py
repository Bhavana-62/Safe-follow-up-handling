"""Hybrid retrieval with Reciprocal Rank Fusion (RRF) and entitlement-aware caching.
Over-fetches 3x before fusing to ensure high quality merged candidate lists.
"""
from collections import defaultdict
import time
from src.corpus.schema import Chunk
from src.identity.claims import Claims
from src.retrieval.store import get_store, HybridStore

# In-memory retrieval cache with TTL and entitlement in the key
_RETRIEVAL_CACHE: dict[tuple, tuple[float, list[Chunk]]] = {}

def rrf(rankings: list[list[int]], k: int = 60) -> dict[int, float]:
    """Reciprocal rank fusion — combines by position, never by score."""
    scores: dict[int, float] = defaultdict(float)
    for ranking in rankings:
        for rank, cid in enumerate(ranking, start=1):
            scores[cid] += 1.0 / (k + rank)
    return scores

def retrieve_hybrid(
    query: str,
    claims: Claims,
    k: int = 8,
    store: HybridStore | None = None,
    use_cache: bool = True,
) -> list[Chunk]:
    """Retrieves chunks matching query using vector + keyword hybrid search.
    The entitlement filter is part of the query, NOT a post-filter.
    """
    if store is None:
        store = get_store()

    # The entitlement set MUST be part of the retrieval cache key.
    # Caching on question alone leads to permission escalation across callers.
    cache_key = (
        query.strip().lower(),
        tuple(sorted(claims.entitlements)),
        k,
    )

    now = time.time()
    if use_cache and cache_key in _RETRIEVAL_CACHE:
        cached_time, cached_chunks = _RETRIEVAL_CACHE[cache_key]
        if now - cached_time < 300:  # 300s TTL
            return cached_chunks

    over = k * 3  # Over-fetch roughly 3x before fusing
    vec = store.vector_search(query, claims.entitlements, limit=over)
    kw = store.keyword_search(query, claims.entitlements, limit=over)

    by_id: dict[int, Chunk] = {}
    vec_ids: list[int] = []
    kw_ids: list[int] = []

    for c in vec:
        if c.id is not None:
            vec_ids.append(c.id)
            by_id[c.id] = c

    for c in kw:
        if c.id is not None:
            kw_ids.append(c.id)
            by_id[c.id] = c

    # If neither returned anything
    if not vec_ids and not kw_ids:
        return []

    fused = rrf([vec_ids, kw_ids], k=60)
    top = sorted(fused, key=fused.get, reverse=True)[:k]
    result = [by_id[cid] for cid in top if cid in by_id]

    if use_cache:
        _RETRIEVAL_CACHE[cache_key] = (now, result)

    return result

def clear_retrieval_cache():
    _RETRIEVAL_CACHE.clear()
