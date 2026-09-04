"""Follow-up resolver and standalone question rewriter.
Rewrites ambiguous conversational follow-ups into fully standalone questions using a 2-turn history cap.
Enforces the security invariant: NEVER carries forward previous chunks or evidence across turns.
"""
import re
from typing import Any
from src.session.schema import Turn
from src.answer.schema import StandaloneQuestion

FOLLOWUP_TRIGGERS = [
    r"\b(it|that|those|these|them|they|their|its)\b",
    r"\b(what about|how about|why did|why is|and for|show me the ones|what was the amount)\b",
    r"\b(the former|the latter|previous|above|same)\b",
    r"^(why|how|when|where|what|who)\?*$",
]

def looks_like_followup(question: str) -> bool:
    """Heuristic check for conversational follow-ups lacking self-contained context."""
    q_lower = question.strip().lower()
    words = q_lower.split()
    if len(words) <= 4 and any(w in ("why", "how", "what", "where", "who", "when", "more", "details") for w in words):
        return True
    for pat in FOLLOWUP_TRIGGERS:
        if re.search(pat, q_lower):
            return True
    return False

def rewrite_followup_rule_based(question: str, history: list[Turn]) -> str:
    """Deterministic standalone query rewriter for tests and offline fallbacks.
    Inspects up to 2 previous turns to resolve pronouns and implicit targets.
    """
    if not history:
        return question

    last_turn = history[-1]
    last_q = last_turn.rewritten_question or last_turn.question
    rewritten = question

    # Extract supplier from previous question
    supplier_match = re.search(r"\b(SUP-\d{3})\b", last_q, re.IGNORECASE)
    # Extract region from previous question
    region_match = re.search(r"\b(EMEA|NA|APAC)\b", last_q, re.IGNORECASE)

    # Extract topic from previous question
    topic = ""
    if "invoice" in last_q.lower():
        topic = "open invoices"
    elif "refund" in last_q.lower():
        topic = "refunds"
    elif "incident" in last_q.lower() or "5xx" in last_q.lower():
        topic = "checkout incidents"
    elif "purchase order" in last_q.lower() or " po " in last_q.lower():
        topic = "open purchase orders"
    elif "discount" in last_q.lower() or "pricing" in last_q.lower():
        topic = "the discount above 15 percent in pricing policy"
    elif "meridian" in last_q.lower():
        topic = "the Meridian agreement"

    # Replace pronouns/implicit references
    if supplier_match:
        supp = supplier_match.group(1).upper()
        if re.search(r"\b(it|that|those|them|the supplier)\b", rewritten, re.IGNORECASE):
            rewritten = re.sub(r"\b(it|that|those|them|the supplier)\b", f"supplier {supp}", rewritten, flags=re.IGNORECASE)
        elif not re.search(r"SUP-\d{3}", rewritten, re.IGNORECASE):
            rewritten = f"{rewritten} for supplier {supp}"

    if topic:
        if re.search(r"\b(that|it|those|them)\b", rewritten, re.IGNORECASE):
            rewritten = re.sub(r"\b(that|it|those|them)\b", topic, rewritten, flags=re.IGNORECASE)
        elif not any(t in rewritten.lower() for t in topic.lower().split()[:2]):
            rewritten = f"{rewritten} regarding {topic}"

    if region_match and not re.search(r"\b(EMEA|NA|APAC)\b", rewritten, re.IGNORECASE):
        rewritten = f"{rewritten} in {region_match.group(1).upper()}"

    # If still completely identical to the input question, append context from last turn
    if rewritten.strip() == question.strip() and topic:
        rewritten = f"{question.strip()} for {topic}"

    return rewritten.strip()

def resolve_followup(
    question: str,
    history: list[Turn],
    ctx: Any = None,
    is_followup: bool | None = None,
    llm_client: Any = None,
) -> tuple[str, bool]:
    """Resolves and rewrites a follow-up into a standalone question.
    Strict two-turn history cap is applied (`history[-2:]`).
    Accepts explicit `is_followup` pass-through or auto-detects.

    TRAP MITIGATION:
    Carry forward the question, NOT the evidence.
    Rewriting a follow-up into a standalone question and re-retrieving is the
    only version that stays correct: entitlements are re-checked, freshness is re-read,
    and a second caller in a shared session cannot inherit the first one's reach.
    Nothing else carries over.
    """
    # 1. Apply strict two-turn history cap
    recent_history = history[-2:] if history else []

    # 2. Determine whether it is a follow-up
    if is_followup is not None:
        followup_detected = is_followup
    else:
        followup_detected = bool(recent_history) and looks_like_followup(question)

    if not recent_history or not followup_detected:
        return question, False

    # 3. Rewrite using LLM client or rule-based fallback
    if llm_client and hasattr(llm_client, "structured"):
        try:
            res: StandaloneQuestion = llm_client.structured(
                role="classify",
                schema=StandaloneQuestion,
                question=question,
                previous=[
                    {"question": t.question, "answer_summary": t.answer_summary}
                    for t in recent_history
                ],
            )
            return res.text, True
        except Exception:
            pass

    # Deterministic fallback
    rewritten = rewrite_followup_rule_based(question, recent_history)
    return rewritten, True
