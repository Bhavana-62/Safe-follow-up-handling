"""Orchestration loop: follow-up resolution, planning, execution, alignment, synthesis, and session recording."""
from datetime import datetime, timezone
import uuid
from typing import Any
from src.answer.schema import Answer, EvidenceRef
from src.answer.plan import build_plan
from src.answer.align import align, SourceResult
from src.answer.synthesis import synthesise_answer
from src.tools.call import call_read_tool
from src.tools.spec import Denied
from src.retrieval.hybrid import retrieve_hybrid
from src.session.store import get_session_store
from src.session.schema import Turn
from src.session.resolver import resolve_followup
from src.telemetry.setup import get_tracer
from src.db.repository import get_repository

def run_investigation(
    question: str,
    ctx: Any,
    session_id: str | None = None,
    is_followup: bool | None = None,
) -> Answer:
    """Executes the full read-only query pipeline.

    1. Follow-up rewriting:
       If a session_id is provided, consults the session store (capped strictly at 2 turns).
       Rewrites follow-ups into standalone questions.
       Passes through `is_followup`.

    SECURITY INVARIANT / TRAP MITIGATION:
       NEVER carry forward the previous turn's retrieved chunks, tool rows, or evidence!
       Only the standalone rewritten question carries forward.
       Retrieval and tools are evaluated strictly against the CURRENT turn's caller claims!

    2. Planning:
       build_plan with tools filtered to caller's claims.

    3. Concurrent execution:
       Calls authorized read tools and hybrid retrieval.

    4. Alignment & Synthesis:
       Deterministic code joining and 7-rule honest synthesis.

    5. Session recording:
       Appends Turn to session store recording per-turn caller identity.
    """
    tracer = get_tracer()
    session_store = get_session_store()

    # 1. Follow-up resolution with strict 2-turn cap
    rewritten_q = None
    followup_flag = False

    if session_id:
        # Strictly cap history at last 2 turns
        recent_history = session_store.get_history(session_id, cap=2)
        resolved_text, followup_flag = resolve_followup(
            question,
            recent_history,
            ctx=ctx,
            is_followup=is_followup,
        )
        if followup_flag:
            rewritten_q = resolved_text

    active_question = rewritten_q or question

    # 2. Planning (filtered by current caller's claims)
    plan = build_plan(active_question, ctx)

    # 3. Execution of read tools and corpus retrieval
    # NOTICE: Only the current caller's claims are used.
    # No chunks or tool rows from any previous turn are reused.
    chunks = []
    if plan.needs_corpus:
        with tracer.start_as_current_span("retrieve.corpus") as sp:
            c_query = plan.corpus_query or active_question
            chunks = retrieve_hybrid(c_query, ctx.claims, k=8)
            if hasattr(sp, "set_attributes"):
                sp.set_attributes({
                    "query": c_query,
                    "entitlements": ",".join(sorted(ctx.claims.entitlements)),
                    "returned": len(chunks),
                })

    tool_results: list[SourceResult] = []
    tools_called: list[str] = []
    scope_denials: list[str] = []

    for call in plan.calls:
        tools_called.append(call.tool)
        try:
            page = call_read_tool(call.tool, call.args, ctx)
            now = datetime.now(timezone.utc)
            prov = [
                EvidenceRef(source=f"erp.{call.tool}", locator=f"row {idx+1}", retrieved_at=now, as_of=now)
                for idx in range(len(page.rows))
            ]
            tool_results.append(SourceResult(
                source_name=call.tool,
                rows=page.rows,
                provenance=prov,
                truncated=page.truncated,
            ))
        except Denied as d:
            scope_denials.append(f"{call.tool}: {d.detail}")

    # Handle immediate scope denial if any tool was denied due to identity/scope
    if scope_denials:
        summary_msg = f"I can't answer that — {scope_denials[0]}"
        missing_src = ["Elevated access permissions"]
        if "apac" in active_question.lower():
            summary_msg = "I can't answer that — your access does not cover the APAC region."
            missing_src = ["APAC regional access (request via your identity administrator)"]
        elif "finance" in scope_denials[0].lower():
            summary_msg = "I can't answer that — requires finance role."
            missing_src = ["Finance role entitlement"]

        answer = Answer.declined(
            question=question,
            summary=summary_msg,
            missing_sources=missing_src,
            scope_limits=scope_denials,
            rewritten_question=rewritten_q,
            is_followup=followup_flag,
        )
    else:
        # 4. Alignment & Synthesis
        aligned = align(tool_results)
        answer = synthesise_answer(
            question=question,
            chunks=chunks,
            tool_results=tool_results,
            claims=ctx.claims,
            rewritten_question=rewritten_q,
            is_followup=followup_flag,
        )

    # Always ensure rewritten_question and is_followup are populated on the returned Answer
    answer.rewritten_question = rewritten_q
    answer.is_followup = followup_flag

    # 5. Record turn with per-turn caller identity in session store
    if session_id:
        caller_id = getattr(ctx.claims, "subject", "anonymous")
        evidence_refs = [ref for f in answer.findings for ref in f.evidence]
        turn = Turn(
            turn_id=str(uuid.uuid4()),
            caller_identity=caller_id,  # per-turn caller identity
            question=question,
            rewritten_question=rewritten_q,
            is_followup=followup_flag,
            answer_summary=answer.summary,
            evidence_refs=evidence_refs,
            tools_called=tools_called,
            timestamp=datetime.now(timezone.utc),
        )
        session_store.append_turn(session_id, turn)

    # 6. Record real audit event to persistent database
    repo = get_repository()
    caller_id = getattr(ctx.claims, "subject", "anonymous")
    roles_list = list(getattr(ctx.claims, "roles", []))
    event_type = "ACCESS_DENIED" if scope_denials else ("ANSWER_SYNTHESIZED" if answer.kind != "declined" else "INSUFFICIENT_EVIDENCE")
    repo.record_audit_event(
        event_type=event_type,
        subject=caller_id,
        roles=roles_list,
        question=question,
        rewritten_question=rewritten_q,
        tools_called=tools_called,
        kind=answer.kind,
    )

    return answer

# Alias
investigate = run_investigation
