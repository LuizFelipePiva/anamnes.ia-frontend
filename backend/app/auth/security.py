import os
import uuid as _uuid

from fastapi import Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import JWT_ALGORITHM, SECRET_KEY
from app.errors import http_error

security = HTTPBearer()

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adiciona headers de segurança HTTP em todas as respostas."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        # Previne MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Impede a página de ser carregada em iframe (clickjacking)
        response.headers["X-Frame-Options"] = "DENY"
        # Política de referrer
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Desativa features de browser desnecessárias
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        # HSTS apenas em produção (força HTTPS por 1 ano)
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        # Remove header que revela tecnologia
        if "server" in response.headers:
            del response.headers["server"]
        return response


def validate_uuid(value: str, field_name: str = "ID") -> str:
    """Valida que um path parameter é um UUID válido. Previne path injection."""
    try:
        _uuid.UUID(value)
        return value
    except (ValueError, AttributeError):
        raise http_error(400, "invalid_uuid", f"{field_name} inválido") from None


def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        exc = http_error(status.HTTP_401_UNAUTHORIZED, "invalid_token", "Token inválido ou expirado")
        exc.headers = {"WWW-Authenticate": "Bearer"}
        raise exc from None