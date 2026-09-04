"""Configuration and profiles for read-only enterprise agent."""
from dataclasses import dataclass, field
from pathlib import Path
import os
import yaml

BASE_DIR = Path(__file__).resolve().parent.parent

MAX_QUESTION_CHARS = 2000
MAX_CONCURRENT_TOOLS = 6
DEFAULT_BUDGET = 20000
RATE_PER_SUBJECT = "30/minute, burst 5"
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
REALM = os.getenv("REALM", "agent")
AUDIENCE = "agent-api"
OTLP_ENDPOINT = os.getenv("OTLP_ENDPOINT", "http://localhost:4318/v1/traces")
JAEGER_UI = os.getenv("JAEGER_UI", "http://localhost:16686")

@dataclass
class RoleConfig:
    model: str
    ctx: int = 8192
    temperature: float = 0.0
    dim: int = 768

@dataclass
class PricingConfig:
    basis: str = "amortized_compute"
    per_1k_tokens: dict[str, float] = field(default_factory=lambda: {"in": 0.00002, "out": 0.00002})

@dataclass
class ProfileConfig:
    name: str
    egress: str
    roles: dict[str, RoleConfig]
    pricing: PricingConfig

def load_profile(name: str = "local") -> ProfileConfig:
    profile_path = BASE_DIR / "platform" / "profiles" / f"{name}.yaml"
    if not profile_path.exists():
        # Fallback default configuration
        return ProfileConfig(
            name="local",
            egress="none",
            roles={
                "embed": RoleConfig(model="nomic-embed-text", dim=768),
                "classify": RoleConfig(model="llama3.2:3b", ctx=8192, temperature=0.0),
                "synthesise": RoleConfig(model="llama3.1:8b", ctx=16384, temperature=0.0),
            },
            pricing=PricingConfig(),
        )
    with open(profile_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    roles = {}
    for role_name, role_data in data.get("roles", {}).items():
        roles[role_name] = RoleConfig(
            model=role_data.get("model", ""),
            ctx=role_data.get("ctx", 8192),
            temperature=role_data.get("temperature", 0.0),
            dim=role_data.get("dim", 768),
        )
    pricing_data = data.get("pricing", {})
    pricing = PricingConfig(
        basis=pricing_data.get("basis", "amortized_compute"),
        per_1k_tokens=pricing_data.get("per_1k_tokens", {"in": 0.00002, "out": 0.00002}),
    )
    return ProfileConfig(
        name=data.get("name", name),
        egress=data.get("egress", "none"),
        roles=roles,
        pricing=pricing,
    )

PROFILE = load_profile(os.getenv("MODEL_PROFILE", "local"))
