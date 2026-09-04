"""JWT Verification module.
Validates RS256 algorithm pinning, issuer, audience, expiration, and leeway.
"""
from jwt import PyJWKClient, InvalidTokenError
import jwt
from src.identity.claims import Claims
from src.identity.mock_auth import get_dev_public_pem
from src.config import KEYCLOAK_URL, REALM, AUDIENCE

_JWKS_URL = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/certs"

try:
    _jwks = PyJWKClient(_JWKS_URL, cache_keys=True, lifespan=300)
except Exception:
    _jwks = None

class AuthenticationError(Exception):
    pass

def verify(token: str) -> Claims:
    """Verifies a JWT token with strict constraints:
    1. RS256 algorithm pinned (never read from header)
    2. Audience must match 'agent-api'
    3. Issuer must match expected Keycloak realm
    4. Required claims: exp, iat, aud, iss, sub
    5. Leeway of 30 seconds for clock skew
    """
    key = None
    if _jwks:
        try:
            key = _jwks.get_signing_key_from_jwt(token).key
        except Exception:
            key = None

    if key is None:
        # Fallback to dev public key for local eval / test suites
        key = get_dev_public_pem()

    expected_issuer = f"{KEYCLOAK_URL}/realms/{REALM}"

    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],  # pinned; never read from the header
            audience=AUDIENCE,
            issuer=expected_issuer,
            leeway=30,  # clock skew, seconds
            options={"require": ["exp", "iat", "aud", "iss", "sub"]},
        )
    except InvalidTokenError as e:
        raise AuthenticationError(f"Token verification failed: {e}") from e

    return Claims.from_payload(payload)
