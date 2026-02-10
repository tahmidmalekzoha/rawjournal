import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from config import ENCRYPTION_KEY


def _get_key() -> bytes:
    key = ENCRYPTION_KEY
    if not key:
        raise ValueError("ENCRYPTION_KEY not set")
    return bytes.fromhex(key)


def encrypt(plaintext: str) -> str:
    """Encrypt plaintext with AES-256-GCM. Returns base64(nonce + ciphertext)."""
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt(token: str) -> str:
    """Decrypt base64(nonce + ciphertext) back to plaintext."""
    key = _get_key()
    aesgcm = AESGCM(key)
    raw = base64.b64decode(token)
    nonce = raw[:12]
    ct = raw[12:]
    return aesgcm.decrypt(nonce, ct, None).decode()
