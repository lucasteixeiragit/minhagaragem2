// ============================================================
// ARQUIVO: routes/pagamento.routes.js
// DESCRIÇÃO: Assinatura do plano Pro via InfinitePay
// ============================================================
// FLUXO:
//   1. POST /api/pagamento/assinar  → concede o teste de 7 dias na
//      primeira vez, ou devolve a URL de checkout nas seguintes.
//   2. O usuário paga na página da InfinitePay.
//   3. POST /api/pagamento/webhook  → a InfinitePay avisa. Como o webhook
//      não tem assinatura, este endpoint NÃO confia no corpo: ele chama
//      verificarPagamento() e só ativa o plano com confirmação do gateway.
//   4. GET  /api/pagamento/status   → o frontend lê plano e histórico.
//
// SEGURANÇA:
//   - O preço vem de middleware/plano.js, nunca do corpo da requisição.
//   - O webhook fica fora do limitadorGeral (ver app.js), porque um pico
//     de pagamentos legítimos tomaria 429.
//   - O webhook não usa requireAuth: quem chama é o gateway, não um
//     usuário logado. A autenticidade vem do /payment_check.
// ============================================================

import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import {
    planoAtivo,
    PRECO_CENTAVOS,
    DIAS_ASSINATURA,
    DIAS_TRIAL
} from '../middleware/plano.js';
import Usuario from '../models/Usuario.js';
import Assinatura from '../models/Assinatura.js';
import { criarLinkPagamento, verificarPagamento, configurado } from '../services/infinitepayService.js';
import { registrarAuditoria } from '../utils/audit.js';

const router = express.Router();

// Limite próprio de /assinar: como este router é montado antes do
// limitadorGeral (ver app.js), ele precisa do seu próprio freio para
// evitar que alguém crie centenas de links de checkout em sequência.
const limitadorAssinar = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Muitas tentativas de assinatura. Tente novamente mais tarde.' }
});

// Soma dias a uma data, partindo da data maior entre hoje e o vencimento
// atual. Assim quem renova antes de vencer não perde os dias restantes.
function somarDias(base, dias) {
    const inicio = base && new Date(base).getTime() > Date.now()
        ? new Date(base)
        : new Date();
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + dias);
    return fim;
}

// ============================================================
// POST /api/pagamento/assinar
// PROPÓSITO: Inicia a assinatura
// REGRA DO TESTE: só na primeira vez (trialUsado false). Concede
// DIAS_TRIAL dias de PRO sem cobrança e devolve { trial: true }.
// Nas vezes seguintes cria o link de checkout e devolve { url }.
// ============================================================
router.post('/assinar', limitadorAssinar, requireAuth, async (req, res) => {
    try {
        const usuario = await Usuario.buscarPorId(req.user._id);

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        // Já é PRO válido: não cobra de novo, apenas informa o vencimento
        if (planoAtivo(usuario)) {
            return res.status(200).json({
                success: true,
                jaAtivo: true,
                plano: 'PRO',
                planoExpiraEm: usuario.planoExpiraEm,
                message: 'Sua assinatura já está ativa.'
            });
        }

        // Primeira assinatura: concede o teste de 7 dias
        if (!usuario.trialUsado) {
            const expiraEm = somarDias(null, DIAS_TRIAL);
            await Usuario.marcarTrialUsado(usuario._id, expiraEm);

            await registrarAuditoria({
                userId: usuario._id,
                action: 'START_TRIAL',
                resource: 'assinatura',
                resourceId: usuario._id,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            return res.status(200).json({
                success: true,
                trial: true,
                plano: 'PRO',
                planoExpiraEm: expiraEm,
                dias: DIAS_TRIAL,
                message: `Teste de ${DIAS_TRIAL} dias ativado.`
            });
        }

        // Assinatura paga: cria o link no gateway
        if (!configurado()) {
            return res.status(503).json({
                success: false,
                message: 'Pagamento indisponível no momento. Tente mais tarde.'
            });
        }

        const orderNsu = `mg-${usuario._id}-${Date.now()}`;

        const link = await criarLinkPagamento({
            orderNsu,
            valorCentavos: PRECO_CENTAVOS,
            descricao: 'Minha Garagem Pro - 30 dias'
        });

        if (link.erro) {
            return res.status(502).json({ success: false, message: link.erro });
        }

        // Grava a cobrança pendente antes de mandar o usuário ao gateway.
        // O índice único em orderNsu protege contra pedido duplicado.
        await Assinatura.criar({
            userId: usuario._id,
            orderNsu,
            valorCentavos: PRECO_CENTAVOS
        });

        await registrarAuditoria({
            userId: usuario._id,
            action: 'CREATE_CHECKOUT',
            resource: 'assinatura',
            resourceId: usuario._id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.status(200).json({
            success: true,
            url: link.url,
            orderNsu,
            valorCentavos: PRECO_CENTAVOS,
            message: 'Redirecionando para o pagamento.'
        });
    } catch (error) {
        console.error('Erro ao iniciar assinatura:', error);
        return res.status(500).json({ success: false, message: 'Erro ao iniciar a assinatura.' });
    }
});

// ============================================================
// POST /api/pagamento/webhook
// PROPÓSITO: Recebe a notificação da InfinitePay e ativa o plano
// SEGURANÇA: o corpo NÃO é confiável. Só ativa depois de
// verificarPagamento() confirmar no servidor do gateway.
// IDEMPOTÊNCIA: marcarPaga só altera quando o status ainda não é 'pago',
// então um webhook repetido não estende o prazo duas vezes.
// ============================================================
router.post('/webhook', async (req, res) => {
    // Responde rápido: a documentação pede 200 em menos de 1 segundo
    try {
        const corpo = req.body || {};
        const orderNsu = corpo.order_nsu;
        const transactionNsu = corpo.transaction_nsu;
        const slug = corpo.slug || corpo.invoice_slug;

        if (!orderNsu) {
            return res.status(400).json({ success: false, message: 'order_nsu ausente.' });
        }

        const assinatura = await Assinatura.buscarPorOrderNsu(orderNsu);

        if (!assinatura) {
            // Pedido desconhecido: aceita o 200 para o gateway não reenviar
            console.warn('Webhook para order_nsu desconhecido:', orderNsu);
            return res.status(200).json({ success: true, ignorado: true });
        }

        // Já processado: responde 200 sem repetir a ativação
        if (assinatura.status === 'pago') {
            return res.status(200).json({ success: true, jaProcessado: true });
        }

        const verificacao = await verificarPagamento({ orderNsu, transactionNsu, slug });

        if (!verificacao.pago) {
            console.warn('Webhook recebido, mas payment_check não confirmou:', orderNsu);
            return res.status(200).json({ success: true, confirmado: false });
        }

        // Confere o valor para impedir link adulterado de valor menor
        if (verificacao.valorCentavos !== null && verificacao.valorCentavos < PRECO_CENTAVOS) {
            console.error('Valor pago menor que o esperado:', orderNsu, verificacao.valorCentavos);
            return res.status(200).json({ success: true, confirmado: false, motivo: 'valor' });
        }

        const resultado = await Assinatura.marcarPaga(orderNsu, { transactionNsu, slug });

        // modifiedCount 0 = outro processo já marcou como paga
        if (resultado.modifiedCount === 0) {
            return res.status(200).json({ success: true, jaProcessado: true });
        }

        const usuario = await Usuario.buscarPorId(assinatura.userId);
        const expiraEm = somarDias(usuario ? usuario.planoExpiraEm : null, DIAS_ASSINATURA);

        await Usuario.atualizarPlano(assinatura.userId, { plano: 'PRO', planoExpiraEm: expiraEm });

        await registrarAuditoria({
            userId: assinatura.userId,
            action: 'PAYMENT_CONFIRMED',
            resource: 'assinatura',
            resourceId: assinatura._id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.status(200).json({ success: true, confirmado: true, planoExpiraEm: expiraEm });
    } catch (error) {
        console.error('Erro no webhook de pagamento:', error);
        // 500 faz o gateway reenviar, o que é desejável em falha transitória
        return res.status(500).json({ success: false, message: 'Erro ao processar o webhook.' });
    }
});

// ============================================================
// GET /api/pagamento/status
// PROPÓSITO: Informa plano, vencimento e histórico ao frontend
// USADO POR: assinatura.html e session-menu.js
// ============================================================
router.get('/status', requireAuth, async (req, res) => {
    try {
        const usuario = await Usuario.buscarPorId(req.user._id);

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        const historico = await Assinatura.listarDoUsuario(req.user._id);

        return res.status(200).json({
            success: true,
            plano: planoAtivo(usuario) ? 'PRO' : 'FREE',
            planoExpiraEm: usuario.planoExpiraEm || null,
            trialUsado: Boolean(usuario.trialUsado),
            precoCentavos: PRECO_CENTAVOS,
            diasAssinatura: DIAS_ASSINATURA,
            diasTrial: DIAS_TRIAL,
            historico: historico.map(a => ({
                orderNsu: a.orderNsu,
                status: a.status,
                valorCentavos: a.valorCentavos,
                criadoEm: a.criadoEm,
                pagoEm: a.pagoEm
            }))
        });
    } catch (error) {
        console.error('Erro ao consultar status do plano:', error);
        return res.status(500).json({ success: false, message: 'Erro ao consultar o plano.' });
    }
});

export default router;
