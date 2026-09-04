"""Claims model and entitlement bridge."""
from dataclasses import dataclass, field
from typing import Any

@dataclass(frozen=True)
class Claims:
    subject: str
    roles: frozenset[str]
    regions: frozenset[str]
    department: str | None = None
    _reports: frozenset[str] = field(default_factory=frozenset)

    @property
    def entitlements(self) -> frozenset[str]:
        """What this caller may see in the corpus.
        Corpus tags use the exact same vocabulary: finance, legal, region:EMEA
        """
        return self.roles | {f"region:{r}" for r in self.regions}

    def manages(self, employee_id: str) -> bool:
        return employee_id in self._reports

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "Claims":
        roles_val = payload.get("roles", [])
        if isinstance(roles_val, list):
            roles = frozenset(roles_val)
        elif isinstance(roles_val, str):
            roles = frozenset([roles_val])
        else:
            roles = frozenset()

        regions_val = payload.get("regions", [])
        if isinstance(regions_val, list):
            regions = frozenset(regions_val)
        elif isinstance(regions_val, str):
            regions = frozenset([regions_val])
        else:
            regions = frozenset()

        reports_val = payload.get("reports", [])
        if isinstance(reports_val, list):
            reports = frozenset(reports_val)
        else:
            reports = frozenset()

        return cls(
            subject=payload.get("sub", ""),
            roles=roles,
            regions=regions,
            department=payload.get("department"),
            _reports=reports,
        )
