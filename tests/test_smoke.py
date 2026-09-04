"""Smoke test for core components."""
from seeds.seed import seed_world
from tests.helpers import as_user, ask

def test_smoke_pipeline():
    seed_world()
    user = as_user("finance.lead")
    a = ask("Why did EMEA revenue dip last week — is it connected to the checkout incidents?", as_user=user)
    assert a.kind == "answered"
    assert len(a.findings) > 0
