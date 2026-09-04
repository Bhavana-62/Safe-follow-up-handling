"""Read tool specifications, decorator, and registry.
Enforces four import-time failures to ensure tool safety and planner predictability.
"""
from dataclasses import dataclass
from typing import Callable, Any, Generic, TypeVar
from pydantic import BaseModel
from src.identity.claims import Claims

T = TypeVar("T")

class Page(BaseModel, Generic[T]):
    rows: list[T]
    truncated: bool = False

class Denied(Exception):
    def __init__(self, code: str, detail: str):
        super().__init__(f"{code}: {detail}")
        self.code = code
        self.detail = detail

@dataclass
class ReadToolSpec:
    name: str
    handler: Callable
    input_model: type[BaseModel]
    required_claims: frozenset[str]
    scope_check: Callable[[BaseModel, Claims], bool] | None
    row_limit: int
    freshness: str  # "live" | "snapshot"
    description: str

    def as_prompt_entry(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "input_fields": list(self.input_model.model_fields.keys()),
            "row_limit": self.row_limit,
            "freshness": self.freshness,
        }

READ_TOOLS: dict[str, ReadToolSpec] = {}

def read_tool(
    *,
    name: str,
    input_model: type[BaseModel],
    required_claims: frozenset[str] | set[str] = frozenset(),
    scope_check: Callable[[Any, Claims], bool] | None = None,
    row_limit: int,
    freshness: str = "live",
    description: str = "",
):
    """Decorator for registering read-only enterprise tools.
    Enforces four import-time constraints:
    1. input_model has extra='forbid'
    2. row_limit <= 1000
    3. description is provided and non-empty
    4. tool name is unique
    """
    def wrap(fn: Callable) -> Callable:
        if input_model.model_config.get("extra") != "forbid":
            raise ValueError(f"{name}: input model must set extra='forbid'")
        if row_limit is None or row_limit > 1000 or row_limit <= 0:
            raise ValueError(f"{name}: declare a row limit 1 <= row_limit <= 1000")
        if not description or not description.strip():
            raise ValueError(f"{name}: describe it — the planner reads this")
        if name in READ_TOOLS:
            raise ValueError(f"duplicate tool {name}")

        READ_TOOLS[name] = ReadToolSpec(
            name=name,
            handler=fn,
            input_model=input_model,
            required_claims=frozenset(required_claims),
            scope_check=scope_check,
            row_limit=row_limit,
            freshness=freshness,
            description=description.strip(),
        )
        return fn
    return wrap

def visible_tools(claims: Claims, automation: str = "default") -> list[ReadToolSpec]:
    """Filters tools visible to caller before planner sees them.
    A tool is visible only if the caller possesses all its required role claims.
    """
    visible = []
    for tool in READ_TOOLS.values():
        if tool.required_claims.issubset(claims.roles):
            visible.append(tool)
    return visible
