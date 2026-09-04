"""CLI client for the Read-Only Enterprise Agent."""
import argparse
import json
import sys
from uuid import uuid4
from src.identity.mock_auth import mint_dev_token
from src.identity.verify import verify
from src.main import RequestContext
from src.tools.spec import visible_tools
from src.answer.investigate import run_investigation
from src.telemetry.cost import CTX_COST
from src.config import JAEGER_UI

def render(answer) -> str:
    return json.dumps(answer.model_dump(), indent=2, default=str)

def main():
    parser = argparse.ArgumentParser(description="Read-Only Enterprise Agent CLI")
    parser.add_argument("question", type=str, help="Question to ask")
    parser.add_argument("--as-user", type=str, default="finance.lead", help="Dev username to authenticate as")
    parser.add_argument("--automation", type=str, default="default", help="Automation name")
    parser.add_argument("--session-id", type=str, default=None, help="Shared conversation session ID")
    parser.add_argument("--followup", action="store_true", default=None, help="Explicitly mark as follow-up")

    args = parser.parse_args()

    token = mint_dev_token(args.as_user)
    claims = verify(token)
    run_id = uuid4()

    ctx = RequestContext(
        run_id=run_id,
        claims=claims,
        _token=token,
        automation=args.automation,
        visible_tool_names=frozenset(t.name for t in visible_tools(claims, args.automation)),
    )

    answer = run_investigation(
        question=args.question,
        ctx=ctx,
        session_id=args.session_id,
        is_followup=args.followup,
    )

    print(render(answer))
    print(f"\ntrace {JAEGER_UI}/trace/{run_id} cost ${CTX_COST.get():.5f}")

if __name__ == "__main__":
    main()
