// ============================================================
// ARQUIVO: services/emailService.js
// DESCRIÇÃO: Serviço de envio de email via SMTP (nodemailer)
// ============================================================
// CONFIGURAÇÃO VEM DO .env (nunca fixa no código):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// FALLBACK: enquanto as chaves SMTP_* não existirem no .env, usa as antigas
// EMAIL_* e o Gmail, para o ambiente local continuar enviando email.
// USADO POR: routes/auth.routes.js (código de confirmação e link de
// redefinição de senha) e pelo cron de notificações em server.js.
// ============================================================
import nodemailer from 'nodemailer';

// Porta em número: o .env entrega string e o nodemailer compara com 465
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

// Cria o transportador (configuração do SMTP)
// secure: true é TLS implícito e só vale na 465. Na 587 o TLS é negociado
// por STARTTLS, então secure precisa ser false e requireTLS true.
// Os timeouts evitam que uma falha de rede deixe a requisição pendurada.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    requireTLS: SMTP_PORT !== 465,
    pool: true,
    maxConnections: 1,
    auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
});

// Envia um email
// from precisa ser do domínio novo: o DMARC exige alinhamento entre o
// domínio do From e o que SPF/DKIM validaram.
export async function enviarEmail({ para, assunto, texto, html }) {
    const info = await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.EMAIL_FROM,
        to: para,
        subject: assunto,
        text: texto,
        html: html
    });
    return info;
}
