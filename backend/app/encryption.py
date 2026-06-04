"""Encryption helpers for API key storage using cryptography.fernet."""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Server secret: from env or a stable default for dev/workshop
SECRET_KEY = os.environ.get("SECRET_KEY", "pipeline-builder-workshop-dev-key")


def _derive_key(user_salt: str) -> bytes:
    """Derive a 32-byte Fernet key from server secret + user salt."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=user_salt.encode(),
        iterations=100000,
    )
    key_bytes = kdf.derive(SECRET_KEY.encode())
    return base64.urlsafe_b64encode(key_bytes)


def encrypt_api_key(api_key: str, user_salt: str) -> str:
    """Encrypt an API key. Returns base64-encoded ciphertext."""
    key = _derive_key(user_salt)
    f = Fernet(key)
    return f.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted: str, user_salt: str) -> str:
    """Decrypt an API key. Returns the original key string."""
    key = _derive_key(user_salt)
    f = Fernet(key)
    return f.decrypt(encrypted.encode()).decode()
