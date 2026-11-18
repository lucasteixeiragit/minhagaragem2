// ============================================================
// ARQUIVO: services/emailService.js
// DESCRIÇÃO: Serviço de envio de email via Gmail (nodemailer)
// ============================================================
import nodemailer from 'nodemailer';

// Cria o transportador (configuração do SMTP do Gmail)
// Porta 587 com STARTTLS: a 465 não devolve o greeting SMTP nesta rede.
// Os timeouts evitam que uma falha de rede deixe a requisição pendurada.
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    pool: true,
    maxConnections: 1,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
});

// Envia um email
export async function enviarEmail({ para, assunto, texto, html }) {
    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: para,
        subject: assunto,
        text: texto,
        html: html
    });
    return info;
}
