"""Mock / Dev authentication provider for offline and evaluation runs.
Mints real cryptographically signed RS256 JWTs with audience, issuer, exp, and claims.
"""
from datetime import datetime, timezone, timedelta
from typing import Any
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from pathlib import Path
from src.config import REALM, AUDIENCE, KEYCLOAK_URL, BASE_DIR

import os
from pathlib import Path
from src.config import REALM, AUDIENCE, KEYCLOAK_URL, BASE_DIR

DEV_KEY_PATH = BASE_DIR / "platform" / "dev_rsa_key.pem"
DEV_PUB_PATH = BASE_DIR / "platform" / "dev_rsa_pub.pem"

def _load_keys() -> tuple[bytes, bytes]:
    # 1. Environment variables directly containing PEM content
    env_priv = os.getenv("JWT_PRIVATE_KEY")
    env_pub = os.getenv("JWT_PUBLIC_KEY")
    if env_priv and env_pub:
        return env_priv.encode("utf-8"), env_pub.encode("utf-8")

    # 2. Environment variables pointing to key files
    env_priv_path = os.getenv("JWT_PRIVATE_KEY_PATH")
    env_pub_path = os.getenv("JWT_PUBLIC_KEY_PATH")
    if env_priv_path and env_pub_path:
        return Path(env_priv_path).read_bytes(), Path(env_pub_path).read_bytes()

    # 3. Development / Test suite fallback
    if DEV_KEY_PATH.exists() and DEV_PUB_PATH.exists():
        return DEV_KEY_PATH.read_bytes(), DEV_PUB_PATH.read_bytes()

    _priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    _pub = _priv.public_key()
    pem_priv = _priv.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pem_pub = _pub.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    DEV_KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    DEV_KEY_PATH.write_bytes(pem_priv)
    DEV_PUB_PATH.write_bytes(pem_pub)
    return pem_priv, pem_pub

_PEM_PRIVATE, _PEM_PUBLIC = _load_keys()

# Standard dev realm users
DEV_USERS: dict[str, dict[str, Any]] = {
    "finance.lead": {
        "roles": ["employee", "finance"],
        "regions": ["EMEA", "NA"],
        "department": "Finance",
    },
    "dana.reyes": {
        "roles": ["employee", "support"],
        "regions": ["EMEA"],
        "department": "Support",
    },
    "analyst": {
        "roles": ["employee", "operations"],
        "regions": ["EMEA"],
        "department": "Operations",
    },
    "procurement.lead": {
        "roles": ["employee", "procurement"],
        "regions": ["EMEA", "NA"],
        "department": "Procurement",
    },
    "sales.lead": {
        "roles": ["employee", "sales"],
        "regions": ["NA"],
        "department": "Sales",
    },
    "ops.analyst": {
        "roles": ["employee", "operations"],
        "regions": ["NA"],
        "department": "Operations",
    },
}

def mint_dev_token(
    username: str,
    *,
    audience: str = AUDIENCE,
    issuer: str | None = None,
    expires_in_seconds: int = 3600,
    roles: list[str] | None = None,
    regions: list[str] | None = None,
    department: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    user_info = DEV_USERS.get(username, {
        "roles": ["employee"],
        "regions": ["EMEA"],
        "department": "General",
    })

    user_roles = roles if roles is not None else user_info.get("roles", [])
    user_regions = regions if regions is not None else user_info.get("regions", [])
    user_dept = department if department is not None else user_info.get("department")

    payload = {
        "sub": username,
        "iss": issuer or f"{KEYCLOAK_URL}/realms/{REALM}",
        "aud": audience,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp()),
        "roles": user_roles,
        "regions": user_regions,
        "department": user_dept,
    }

    return jwt.encode(payload, _PEM_PRIVATE, algorithm="RS256", headers={"kid": "dev-key-1"})

def get_dev_public_pem() -> bytes:
    return _PEM_PUBLIC
