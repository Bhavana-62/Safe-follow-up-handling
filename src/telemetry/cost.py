"""Cost tracking and token accounting per request."""
from contextvars import ContextVar
from dataclasses import dataclass
from src.config import PROFILE

CTX_COST: ContextVar[float] = ContextVar("ctx_cost", default=0.0)

@dataclass
class TokenUsage:
    prompt_tokens: int
    completion_tokens: int

def record_cost(role: str, model: str, usage: TokenUsage, span=None) -> float:
    p = PROFILE.pricing.per_1k_tokens
    cost = (usage.prompt_tokens * p.get("in", 0.00002) + usage.completion_tokens * p.get("out", 0.00002)) / 1000.0
    if span:
        try:
            span.set_attributes({
                "llm.model": model,
                "llm.tokens.in": usage.prompt_tokens,
                "llm.tokens.out": usage.completion_tokens,
                "llm.cost_usd": cost,
            })
        except Exception:
            pass
    CTX_COST.set(CTX_COST.get() + cost)
    return cost

def reset_cost():
    CTX_COST.set(0.0)
