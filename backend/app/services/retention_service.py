"""
Serviço de retenção de dados — LGPD Art. 15 & 16.
Limpa mensagens de conversas antigas (>90 dias) mantendo metadados para estatísticas.
"""
from datetime import UTC, datetime, timedelta

from app.config import logger
from app.db.supabase import get_supabase_client

RETENTION_DAYS = 90


def cleanup_old_messages() -> dict:
    """
    Remove o conteúdo de mensagens com mais de RETENTION_DAYS dias.
    Preserva metadados (id, conversation_id, role, created_at) para estatísticas.
    Retorna contagem de registros afetados.
    """
    sb = get_supabase_client()
    cutoff = (datetime.now(UTC) - timedelta(days=RETENTION_DAYS)).isoformat()

    # Busca mensagens antigas que ainda têm conteúdo
    old_msgs = sb.table("messages") \
        .select("id") \
        .lt("created_at", cutoff) \
        .neq("content", "[removido por política de retenção]") \
        .execute()

    count = len(old_msgs.data or [])
    if count == 0:
        logger.info(f"[Retention] Nenhuma mensagem antiga para limpar (cutoff={cutoff})")
        return {"cleaned": 0, "cutoff": cutoff}

    # Anonimiza em lotes de 100
    batch_size = 100
    msg_ids = [m["id"] for m in old_msgs.data]
    for i in range(0, len(msg_ids), batch_size):
        batch = msg_ids[i:i + batch_size]
        sb.table("messages") \
            .update({"content": "[removido por política de retenção]"}) \
            .in_("id", batch) \
            .execute()

    logger.info(f"[Retention] {count} mensagens anonimizadas (cutoff={cutoff})")
    return {"cleaned": count, "cutoff": cutoff}
