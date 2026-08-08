import logging
import os
import sys

from dotenv import load_dotenv

load_dotenv()

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_MODEL_EVAL = os.getenv("OPENAI_MODEL_EVAL", OPENAI_MODEL)  # modelo para avaliação SOAP
OPENAI_VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")
ASSISTANT_ID = os.getenv("ASSISTANT_ID")  # legado — remover após migração completa
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
REPLY_TO_EMAIL = os.getenv("REPLY_TO_EMAIL", "")

# JWT Configuration
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# CORS Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",")


# Configuração de logging
def setup_logging():
    """
    Configura logging estruturado para toda a aplicação.
    """
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    logging.basicConfig(
        level=getattr(logging, log_level),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Silencia logs verbosos de bibliotecas
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    
    return logging.getLogger("anamnes-ai")


logger = setup_logging()


def validate_environment():
    """
    Valida variáveis de ambiente obrigatórias no startup.
    Falha rápido se configuração crítica estiver ausente.
    """
    required_vars = {
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_KEY": SUPABASE_KEY,
        "SECRET_KEY": SECRET_KEY,
        "OPENAI_API_KEY": OPENAI_API_KEY,
    }
    
    missing_vars = [var for var, value in required_vars.items() if not value]
    
    if missing_vars:
        logger.error("❌ Variáveis de ambiente obrigatórias ausentes:")
        for var in missing_vars:
            logger.error(f"   - {var}")
        logger.info("💡 Configure as variáveis no arquivo .env")
        logger.info("   Consulte .env.example para referência")
        sys.exit(1)
    
    # Avisos para valores padrão perigosos
    if SECRET_KEY == "CHANGE_ME_IN_PRODUCTION":
        logger.warning("⚠️  SECRET_KEY usando valor padrão inseguro!")
        logger.warning("   Configure uma chave forte em produção")
    
    logger.info("✅ Variáveis de ambiente validadas com sucesso")
