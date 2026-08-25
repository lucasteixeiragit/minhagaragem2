// ============================================================
// ARQUIVO: services/emailService.js
// DESCRIÇÃO: Serviço de envio de email via Gmail (nodemailer)
// ============================================================
import nodemailer from 'nodemailer';

// Cria o transportador (configuração do SMTP do Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
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
