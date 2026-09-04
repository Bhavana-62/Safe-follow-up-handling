"""Cryptographic password hashing, verification, and policy enforcement.
Complies with OWASP recommendations: versioned format, configurable iterations (default 600,000),
salted PBKDF2-HMAC-SHA256, and constant-time verification.
"""
import hashlib
import hmac
import os
import re
import secrets

DEFAULT_ITERATIONS = int(os.getenv("PBKDF2_ITERATIONS", "600000"))
ALGORITHM_ID = "pbkdf2_sha256"
FORMAT_VERSION = "v1"

def validate_password_strength(password: str) -> tuple[bool, str | None]:
    """Enforces enterprise password complexity requirements:
    - At least 10 characters long
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one numerical digit (0-9)
    - At least one special symbol (!@#$%^&*()_+-=[]{}|;:,.<>?)
    """
    if len(password) < 10:
        return False, "Password must be at least 10 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must include at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must include at least one lowercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must include at least one numerical digit."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", password):
        return False, "Password must include at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)."
    return True, None

def hash_password(password: str, iterations: int = DEFAULT_ITERATIONS) -> str:
    """Hashes a password with a 16-byte random salt using PBKDF2-HMAC-SHA256.
    Returns versioned format: pbkdf2_sha256$v1$<iterations>$<salt>$<hash>
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return f"{ALGORITHM_ID}${FORMAT_VERSION}${iterations}${salt}${key}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a password against the stored versioned hash using constant-time comparison.
    Supports versioned formats and allows seamless future hash upgrades.
    """
    if not stored_hash:
        return False
    parts = stored_hash.split("$")
    
    # Versioned format: pbkdf2_sha256$v1$<iterations>$<salt>$<hash>
    if len(parts) == 5 and parts[0] == ALGORITHM_ID and parts[1] == FORMAT_VERSION:
        try:
            iterations = int(parts[2])
            salt = parts[3]
            expected_key = parts[4]
            actual_key = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt.encode("utf-8"),
                iterations,
            ).hex()
            return hmac.compare_digest(actual_key, expected_key)
        except Exception:
            return False

    # Legacy fallback (salt$hash) for seamless migration if needed
    if len(parts) == 2:
        try:
            salt, expected_key = parts
            actual_key = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt.encode("utf-8"),
                100_000,
            ).hex()
            return hmac.compare_digest(actual_key, expected_key)
        except Exception:
            return False

    return False
