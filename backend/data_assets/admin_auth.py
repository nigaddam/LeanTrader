"""Small header-based guard for internal data operations endpoints."""
import os

from fastapi import Header, HTTPException, status


def _is_development() -> bool:
    return os.getenv("APP_ENV", "development").lower() == "development"


async def require_admin_secret(x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret")):
    secret = os.getenv("ADMIN_API_SECRET", "").strip()

    if not secret:
        if _is_development():
            return True
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin API secret is not configured.",
        )

    if not x_admin_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Admin-Secret header.",
        )

    if x_admin_secret != secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin secret.",
        )

    return True
