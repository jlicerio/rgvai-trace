"""User authentication routes for the pipeline builder workshop."""
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel

from app.database import get_db, init_db
from app.encryption import encrypt_api_key, decrypt_api_key

router = APIRouter(prefix="/api/auth")

SESSION_DURATION_HOURS = 24


class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class KeySaveRequest(BaseModel):
    provider: str
    key: str


def _hash_password(password: str, salt: str) -> str:
    key = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64)
    return key.hex()

def _verify_password(password: str, salt: str, expected_hash: str) -> bool:
    return hmac.compare_digest(_hash_password(password, salt), expected_hash)

def _get_session_user(request: Request) -> Optional[dict]:
    session_id = request.cookies.get("session_id")
    if not session_id:
        return None
    conn = get_db()
    row = conn.execute(
        "SELECT u.id, u.username FROM sessions s JOIN users u ON s.user_id = u.id "
        "WHERE s.session_id = ? AND s.expires_at > datetime('now')",
        (session_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None

async def require_user(request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/register")
async def register(body: RegisterRequest, response: Response):
    username = body.username.strip()
    if len(username) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    salt = secrets.token_hex(16)
    pw_hash = _hash_password(body.password, salt)
    conn = get_db()
    try:
        conn.execute("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
                     (username, pw_hash, salt))
        conn.commit()
    except Exception:
        conn.close()
        raise HTTPException(status_code=409, detail="Username already taken")

    user = conn.execute("SELECT id, username FROM users WHERE username = ?", (username,)).fetchone()
    session_id = uuid.uuid4().hex
    expires = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
    conn.execute("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
                 (session_id, user["id"], expires.isoformat()))
    conn.commit()
    conn.close()

    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite="lax",
                        max_age=SESSION_DURATION_HOURS * 3600, path="/")
    return {"status": "ok", "user": {"id": user["id"], "username": user["username"]}}


@router.post("/login")
async def login(body: LoginRequest, response: Response):
    conn = get_db()
    user = conn.execute(
        "SELECT id, username, password_hash, salt FROM users WHERE username = ?",
        (body.username.strip(),),
    ).fetchone()
    conn.close()
    if not user or not _verify_password(body.password, user["salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    session_id = uuid.uuid4().hex
    expires = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
    conn = get_db()
    conn.execute("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
                 (session_id, user["id"], expires.isoformat()))
    conn.commit()
    conn.close()

    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite="lax",
                        max_age=SESSION_DURATION_HOURS * 3600, path="/")
    return {"status": "ok", "user": {"id": user["id"], "username": user["username"]}}


@router.post("/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    if session_id:
        conn = get_db()
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()
    response.delete_cookie("session_id", path="/")
    return {"status": "ok"}


@router.get("/me")
async def me(user: dict = Depends(require_user)):
    return {"id": user["id"], "username": user["username"]}


@router.get("/keys")
async def get_keys(user: dict = Depends(require_user)):
    conn = get_db()
    rows = conn.execute(
        "SELECT provider, updated_at FROM user_keys WHERE user_id = ?", (user["id"],)
    ).fetchall()
    conn.close()
    return [{"provider": r["provider"], "configured": True} for r in rows]


@router.post("/keys")
async def save_key(body: KeySaveRequest, user: dict = Depends(require_user)):
    conn = get_db()
    salt_row = conn.execute("SELECT salt FROM users WHERE id = ?", (user["id"],)).fetchone()
    if not salt_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    encrypted = encrypt_api_key(body.key, salt_row["salt"])
    conn.execute(
        "INSERT INTO user_keys (user_id, provider, encrypted_value) VALUES (?, ?, ?) "
        "ON CONFLICT(user_id, provider) DO UPDATE SET encrypted_value = ?, updated_at = CURRENT_TIMESTAMP",
        (user["id"], body.provider, encrypted, encrypted),
    )
    conn.commit()
    conn.close()
    return {"status": "ok", "provider": body.provider}
