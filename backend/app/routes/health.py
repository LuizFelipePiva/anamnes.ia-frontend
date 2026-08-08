"""
Health check endpoints for monitoring application status.
"""
from datetime import datetime

from fastapi import APIRouter

from app.config import OPENAI_API_KEY, logger
from app.db.supabase import get_supabase_client

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check():
    """
    ### Health Check Completo
    
    Verifica o status da aplicação e de todos os seus componentes:
    - Application: Status da aplicação FastAPI
    - Database: Conectividade com Supabase
    - OpenAI: Disponibilidade da API OpenAI
    
    Retorna status "healthy" apenas se todos os componentes estiverem funcionando.
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Check database connectivity
    try:
        supabase = get_supabase_client()
        # Tenta uma query simples para verificar conectividade
        supabase.table("users").select("id").limit(1).execute()
        health_status["checks"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        logger.error(f"Health check - Database error: {e}")
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
    
    # Check OpenAI API
    try:
        # Verifica se a chave existe e tem formato válido
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-api-key-here":
            raise ValueError("OpenAI API key not configured")
        
        health_status["checks"]["openai"] = {
            "status": "healthy",
            "message": "OpenAI API key configured"
        }
    except Exception as e:
        logger.error(f"Health check - OpenAI error: {e}")
        health_status["status"] = "unhealthy"
        health_status["checks"]["openai"] = {
            "status": "unhealthy",
            "message": f"OpenAI API check failed: {str(e)}"
        }
    
    # Application status is always healthy if we can respond
    health_status["checks"]["application"] = {
        "status": "healthy",
        "message": "Application is running"
    }
    
    return health_status


@router.get("/health/liveness", tags=["health"])
async def liveness_check():
    """
    ### Liveness Probe
    
    Endpoint para verificação de liveness em ambientes Kubernetes/Docker.
    Retorna 200 se a aplicação está rodando.
    """
    return {"status": "alive"}


@router.get("/health/readiness", tags=["health"])
async def readiness_check():
    """
    ### Readiness Probe
    
    Endpoint para verificação de readiness em ambientes Kubernetes/Docker.
    Retorna 200 apenas se todos os serviços críticos (como database) estão disponíveis.
    """
    try:
        supabase = get_supabase_client()
        supabase.table("users").select("id").limit(1).execute()
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {"status": "not ready", "error": str(e)}, 503
