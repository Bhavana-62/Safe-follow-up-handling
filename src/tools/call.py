"""Tool execution engine with identity and scope verification."""
from typing import Any
from src.tools.spec import READ_TOOLS, Denied, Page
from src.telemetry.setup import get_tracer

def call_read_tool(name: str, args: dict[str, Any], ctx: Any) -> Page:
    """Executes a registered read tool with strict access verification:
    1. Checks if tool is registered and in caller's visible tools.
    2. Validates input schema.
    3. Checks caller role claims against required claims.
    4. Evaluates scope_check predicate against caller's regional/department claims.
    5. Records trace attributes and row counts.
    """
    spec = READ_TOOLS.get(name)
    if spec is None or (hasattr(ctx, "visible_tool_names") and name not in ctx.visible_tool_names):
        raise Denied("UNKNOWN_TOOL", name)

    tracer = get_tracer()
    with tracer.start_as_current_span("tool.read") as sp:
        if hasattr(sp, "set_attributes"):
            sp.set_attributes({
                "tool.name": name,
                "tool.row_limit": spec.row_limit,
                "tool.freshness": spec.freshness,
            })

        # Validate arguments shape
        payload = spec.input_model.model_validate(args)

        # 1. Claims / Role verification
        if missing := (spec.required_claims - ctx.claims.roles):
            raise Denied("DENIED_IDENTITY", f"requires {sorted(missing)}")

        # 2. Scope check verification
        if spec.scope_check and not spec.scope_check(payload, ctx.claims):
            raise Denied("DENIED_IDENTITY", "target outside caller scope")

        # Execute handler
        page = spec.handler(payload, ctx)

        if hasattr(sp, "set_attributes"):
            sp.set_attributes({
                "tool.rows": len(page.rows),
                "tool.truncated": page.truncated,
            })
        return page
