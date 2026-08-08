import os

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.auth.security import SecurityHeadersMiddleware
from app.config import ALLOWED_ORIGINS, logger, validate_environment
from app.routes import (
    admin,
    api,
    cases,
    classes,
    dashboard,
    flashcards,
    health,
    profile,
    questions,
    simulados,
)

# Valida variáveis de ambiente antes de iniciar
validate_environment()

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

# Configurar rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(
    title="ANAMNES.IA API",
    description="""
    ## API para plataforma de educação médica com IA
    
    Esta API fornece recursos para:
    * **Autenticação**: Cadastro e login de usuários
    * **Chat GPT**: Conversação com assistente médico baseado em IA
    * **Histórico**: Gerenciamento de conversas e mensagens
    * **Health Check**: Monitoramento da saúde da aplicação
    
    ### Autenticação
    
    A maioria dos endpoints requer autenticação via JWT token. 
    Use o endpoint `/api/login` para obter um token e inclua-o no header `Authorization: Bearer <token>`.
    
    ### Rate Limiting
    
    Endpoints de chat possuem limite de 20 requisições por minuto por IP para prevenir abuso.
    """,
    version="1.0.0",
    # Desativa Swagger/ReDoc em produção para não expor a estrutura da API
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
    openapi_tags=[
        {
            "name": "auth",
            "description": "Operações de autenticação e gerenciamento de usuários"
        },
        {
            "name": "chat",
            "description": "Endpoints para interação com o assistente GPT"
        },
        {
            "name": "classes",
            "description": "Gerenciamento de turmas (criar, listar, entrar via código)"
        },
        {
            "name": "cases",
            "description": "CRUD de casos clínicos, geração via IA, atribuição e tentativas"
        },
        {
            "name": "dashboard",
            "description": "Métricas agregadas do professor (relatórios, estatísticas)"
        },
        {
            "name": "health",
            "description": "Endpoints de monitoramento e health check"
        }
    ]
)

# CORS deve ser registrado antes de qualquer coisa para cobrir erros 500 também
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers em todas as respostas
app.add_middleware(SecurityHeadersMiddleware)

# Adicionar rate limiter ao app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Exception handlers globais

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Normaliza toda `HTTPException` para `{"detail": str, "code": str | None}`.

    SPEC-010 RF2 — o front lê `.detail` como string em 43 pontos
    (`core/utils/errorHandler.ts`); sem este achatamento, um site migrado com
    `detail=http_error(...)` (um dict) seria serializado ANINHADO pelo FastAPI
    (`{"detail": {"detail": ..., "code": ...}}`), quebrando esses 43 pontos.

    Rota não migrada continua com `detail` string solta — vira `code: None`,
    nunca quebra. A migração dos ~110 sites restantes (dívida, ver SPEC-010 §9)
    não depende de nenhuma mudança aqui.
    """
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        content = detail
    else:
        content = {"detail": detail, "code": None}
    return JSONResponse(status_code=exc.status_code, content=content, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handler para erros de validação de dados"""
    logger.warning(f"Erro de validação em {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Dados inválidos",
            "details": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handler genérico para exceções não tratadas"""
    logger.exception(f"Erro não tratado em {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Erro interno do servidor",
            "message": "Ocorreu um erro inesperado. Por favor, tente novamente mais tarde."
        }
    )

app.include_router(api.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(flashcards.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(simulados.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "API está online!", "status": "healthy"}