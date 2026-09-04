"""Standalone eval and verification runner.
Runs the complete test suite against the read-only enterprise agent.
"""
import sys
import os

# Add src to python path
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("src"))

from seeds.seed import seed_world
from tests.test_session_followup_entitlements import (
    test_shared_session_second_user_returns_nothing_first_user_entitled,
    test_two_turn_history_cap,
    test_is_followup_pass_through,
    test_corpus_entitlement_isolation_in_shared_session,
)
from tests.test_worked_examples import (
    test_e1_corpus_question,
    test_e2_cross_system_investigation,
    test_e3_scope_denial,
    test_e4_decline_for_want_of_evidence,
    test_e5_row_limit_reached,
    test_e6_untrusted_content_attempting_to_steer,
)
from tests.test_definition_of_done import (
    test_read_tool_decorator_four_import_time_failures,
    test_findings_require_evidence_min_length,
    test_negative_retrieval_restricted_document_not_returned,
    test_cost_recorded_on_request,
    test_every_finding_carries_resolvable_evidence,
)

def run_all():
    print("=" * 70)
    print("READ-ONLY ENTERPRISE AGENT EVALUATION RUNNER")
    print("=" * 70)

    tests = [
        # Session Follow-up & Entitlement Isolation (Primary Requirement)
        ("Shared Session: Second user returns nothing first user entitled", test_shared_session_second_user_returns_nothing_first_user_entitled),
        ("Two-turn history cap strictly enforced", test_two_turn_history_cap),
        ("is_followup pass-through flag handling", test_is_followup_pass_through),
        ("Corpus entitlement isolation in shared session", test_corpus_entitlement_isolation_in_shared_session),

        # Worked Examples E1 - E6
        ("E1: A corpus question (refund window)", test_e1_corpus_question),
        ("E2: Cross-system investigation (EMEA revenue & checkout incidents)", test_e2_cross_system_investigation),
        ("E3: Scope denial (APAC open invoices for EMEA caller)", test_e3_scope_denial),
        ("E4: Decline for want of evidence (dealer relationships)", test_e4_decline_for_want_of_evidence),
        ("E5: Row limit reached (open purchase orders)", test_e5_row_limit_reached),
        ("E6: Untrusted content attempting to steer (Meridian agreement)", test_e6_untrusted_content_attempting_to_steer),

        # Definition of Done
        ("DoD: Read-tool decorator 4 import-time failures", test_read_tool_decorator_four_import_time_failures),
        ("DoD: Finding requires evidence min_length=1", test_findings_require_evidence_min_length),
        ("DoD: Negative retrieval on restricted document", test_negative_retrieval_restricted_document_not_returned),
        ("DoD: Cost recorded on request", test_cost_recorded_on_request),
        ("DoD: Every finding carries resolvable evidence", test_every_finding_carries_resolvable_evidence),
    ]

    passed = 0
    failed = 0

    for name, test_fn in tests:
        seed_world()
        try:
            test_fn()
            print(f" [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f" [FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("=" * 70)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests.")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_all()
