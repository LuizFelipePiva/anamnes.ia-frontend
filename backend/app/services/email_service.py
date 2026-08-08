"""
Serviço de envio de emails via Resend.
Usado para notificar usuários criados pelo admin com suas credenciais temporárias.
"""
import logging
import os

from app.config import FRONTEND_URL, REPLY_TO_EMAIL

logger = logging.getLogger("anamnes-ai")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "")


def _build_welcome_html(name: str, email: str, password: str, role: str) -> str:
    role_label = "professor(a)" if role == "teacher" else "aluno(a)"
    return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3fb;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3fb;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(132,74,245,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#844AF5 0%,#6b35ff 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Anamnes.IA</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.80);font-size:14px;">Plataforma de Educação Médica com IA</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;color:#374151;font-size:16px;">Olá, <strong>{name}</strong>!</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
              Sua conta de <strong>{role_label}</strong> foi criada com sucesso na plataforma <strong>Anamnes.IA</strong>.
              Abaixo estão suas credenciais de acesso:
            </p>

            <!-- Credentials box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9fe;border:1.5px solid #e8e3fc;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;">
                        <span style="color:#9893b0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">E-mail</span><br>
                        <span style="color:#111018;font-size:15px;font-weight:600;">{email}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0 6px;border-top:1px solid #f0edf8;">
                        <span style="color:#9893b0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Senha temporária</span><br>
                        <span style="color:#844AF5;font-size:18px;font-weight:800;font-family:'Courier New',monospace;letter-spacing:0.05em;">{password}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="{FRONTEND_URL}/"
                     style="display:inline-block;background:linear-gradient(135deg,#844AF5,#6b35ff);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;letter-spacing:0.01em;">
                    Acessar a plataforma →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#9893b0;font-size:13px;line-height:1.6;">
              Recomendamos que você <strong>altere sua senha</strong> após o primeiro acesso
              em <em>Configurações → Alterar senha</em>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#faf9fe;border-top:1px solid #f0edf8;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#b0aac8;font-size:12px;">
              Este email foi enviado automaticamente. Em caso de dúvidas, entre em contato com seu administrador.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def send_welcome_email(name: str, email: str, password: str, role: str = "student") -> bool:
    """
    Envia email de boas-vindas com credenciais temporárias.
    Retorna True se enviado com sucesso, False caso contrário (nunca levanta exceção).
    """
    if not RESEND_API_KEY:
        logger.warning("⚠️  RESEND_API_KEY não configurada — email de boas-vindas não enviado")
        return False

    try:
        import resend
        resend.api_key = RESEND_API_KEY

        response = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": email,
            **({"reply_to": REPLY_TO_EMAIL} if REPLY_TO_EMAIL else {}),
            "subject": "Seu acesso ao Anamnes.IA 🩺",
            "html": _build_welcome_html(name, email, password, role),
        })
        logger.info(f"✅ Email de boas-vindas enviado | id={getattr(response, 'id', response)}")
        return True
    except Exception as e:
        logger.error(f"❌ Falha ao enviar email de boas-vindas: {type(e).__name__}")
        return False
