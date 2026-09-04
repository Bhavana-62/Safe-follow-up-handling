"""Test follow-up rewriting into standalone questions, two-turn history cap,
is_followup pass-through, per-turn caller identity in session store,
and strict multi-turn entitlement isolation (avoiding the context carry-over trap).
"""
import pytest
from seeds.seed import seed_world
from tests.helpers import as_user, ask
from src.session.store import get_session_store
from src.session.schema import Turn
from src.session.resolver import resolve_followup, looks_like_followup

@pytest.fixture(autouse=True)
def setup_estate():
    seed_world()

def test_shared_session_second_user_returns_nothing_first_user_entitled():
    """Done when: In a shared session, a second user's follow-up returns nothing
    the first user's entitlements uniquely permitted. The rewritten question is shown to the user.

    Trap tested & prevented: Carrying previous turn's retrieved chunks forward.
    It is faster, users prefer it, and it is an access-control defect.
    """
    store = get_session_store()
    session_id = "shared-collab-session-001"

    # User 1: finance.lead (holds 'finance' role)
    user1_ctx = as_user("finance.lead")
    assert "finance" in user1_ctx.claims.roles

    # User 2: dana.reyes (holds 'support', 'employee' - DOES NOT hold 'finance')
    user2_ctx = as_user("dana.reyes")
    assert "finance" not in user2_ctx.claims.roles

    # Turn 1: User 1 queries privileged financial information
    q1 = "Show me the open invoices for SUP-001 in EMEA"
    a1 = ask(q1, as_user=user1_ctx, session_id=session_id)
    assert a1.kind == "answered"
    assert len(a1.findings) > 0
    # User 1 legitimately received invoice findings
    assert any("INV-" in f.claim or "invoice" in f.claim.lower() for f in a1.findings)

    # Turn 2: User 2 (unprivileged) asks a follow-up in the EXACT SAME session
    q2 = "What was the amount of that?"
    a2 = ask(q2, as_user=user2_ctx, session_id=session_id)

    # Verification 1: Rewritten question is shown to the user
    assert a2.rewritten_question is not None
    assert "SUP-001" in a2.rewritten_question or "invoice" in a2.rewritten_question.lower()
    assert a2.is_followup is True

    # Verification 2: Second user returns NOTHING the first user's entitlements uniquely permitted!
    # User 2 has no finance access. The system must decline or deny, NOT return invoice amounts from turn 1!
    assert a2.kind == "declined"
    assert a2.findings == []  # Zero fabricated findings, zero leaked data
    assert any("finance" in s.lower() for s in a2.missing_sources + a2.scope_limits)

    # Verification 3: Check per-turn caller identity in session store
    turns = store.get_all_turns(session_id)
    assert len(turns) == 2
    assert turns[0].caller_identity == "finance.lead"
    assert turns[0].question == q1
    assert turns[1].caller_identity == "dana.reyes"
    assert turns[1].question == q2
    assert turns[1].rewritten_question == a2.rewritten_question

def test_two_turn_history_cap():
    """Verifies that history is strictly capped at two turns to prevent prompt degradation."""
    store = get_session_store()
    session_id = "cap-test-session"
    store.clear(session_id)

    # Append 4 sequential turns
    for i in range(1, 5):
        turn = Turn(
            turn_id=f"t-{i}",
            caller_identity=f"user-{i}",
            question=f"Question number {i}",
            rewritten_question=None,
            is_followup=False,
            answer_summary=f"Summary {i}",
            evidence_refs=[],
            tools_called=[],
        )
        store.append_turn(session_id, turn)

    # Verify session history retrieval with default cap=2
    recent_history = store.get_history(session_id, cap=2)
    assert len(recent_history) == 2
    assert recent_history[0].turn_id == "t-3"
    assert recent_history[1].turn_id == "t-4"

def test_is_followup_pass_through():
    """Verifies that explicit is_followup flag passes through and controls rewriting."""
    user_ctx = as_user("finance.lead")
    session_id = "passthrough-session"

    # Turn 1
    ask("What are the open invoices for SUP-001?", as_user=user_ctx, session_id=session_id)

    # Explicit is_followup=True overrides auto-detection
    a_explicit_true = ask(
        "And what are the amounts?",
        as_user=user_ctx,
        session_id=session_id,
        is_followup=True,
    )
    assert a_explicit_true.is_followup is True
    assert a_explicit_true.rewritten_question is not None

    # Explicit is_followup=False prevents follow-up rewriting
    a_explicit_false = ask(
        "What is that?",
        as_user=user_ctx,
        session_id=session_id,
        is_followup=False,
    )
    assert a_explicit_false.is_followup is False
    assert a_explicit_false.rewritten_question is None

def test_corpus_entitlement_isolation_in_shared_session():
    """Verifies that in a shared session, corpus chunks requiring privileged entitlements
    are NOT leaked via follow-up context to a caller lacking the entitlement tag.
    """
    session_id = "corpus-shared-session"

    # User 1: sales.lead (entitled to policy/pricing.md via 'sales' role)
    sales_user = as_user("sales.lead")
    a1 = ask("What is the approval threshold for discounts above 15 percent?", as_user=sales_user, session_id=session_id)
    assert a1.kind == "answered"
    assert any("policy/pricing.md" in ref.source for f in a1.findings for ref in f.evidence)

    # User 2: dana.reyes (roles: employee, support — NOT sales, NOT finance)
    support_user = as_user("dana.reyes")
    a2 = ask("Who must approve that?", as_user=support_user, session_id=session_id)

    # Must be rewritten
    assert a2.is_followup is True
    assert a2.rewritten_question is not None

    # Must NOT reveal anything from policy/pricing.md
    assert not any("policy/pricing.md" in ref.source for f in a2.findings for ref in f.evidence)
    assert a2.kind == "declined"
