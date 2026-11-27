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
        // O slug vem da URL e é o que o webhook devolve em invoice_slug.
        await Assinatura.criar({
            userId: usuario._id,
            orderNsu,
            valorCentavos: PRECO_CENTAVOS,
            slug: link.slug
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

        // A nossa ID volta no eco de items[].product_reference, gravada na
        // criação do link por criarLinkPagamento(). É o casamento por
        // identidade: diz de quem é a cobrança, sem depender do valor.
        // LIDO DE: services/infinitepayService.js (criarLinkPagamento).
        const productReference = Array.isArray(corpo.items) && corpo.items[0]
            ? corpo.items[0].product_reference
            : null;

        // Log do corpo completo: sem ele não é possível reconciliar um
        // pagamento cujo order_nsu não exista na coleção assinaturas.
        // Não há dado sensível aqui (sem cartão, sem documento).
        console.log('Webhook InfinitePay recebido:', JSON.stringify(corpo));

        if (!orderNsu) {
            return res.status(400).json({ success: false, message: 'order_nsu ausente.' });
        }

        // O webhook da InfinitePay nem sempre devolve o nosso order_nsu:
        // em produção ele veio como um UUID próprio do gateway. Por isso o
        // casamento principal é pelo slug da fatura (invoice_slug), que
        // guardamos na criação do link, e o order_nsu fica como alternativa.
        let assinatura = await Assinatura.buscarPorOrderNsu(orderNsu);

        // Casamento por identidade: o product_reference ecoado é o nosso
        // order_nsu, então identifica a cobrança e o usuário sem ambiguidade.
        if (!assinatura && productReference) {
            assinatura = await Assinatura.buscarPorOrderNsu(productReference);

            if (assinatura) {
                console.log('Webhook casado por product_reference:', productReference);
            }
        }

        if (!assinatura) {
            assinatura = await Assinatura.buscarPorSlug(slug);
        }

        // Último recurso: o invoice_slug do webhook também não é o slug do
        // link de checkout (são identificadores distintos na InfinitePay).
        // Como o preço é fixo e definido no servidor, casa a cobrança
        // pendente mais antiga com o mesmo valor, dentro de 48 horas.
        // Só chega aqui depois de o payment_check confirmar o pagamento,
        // então o valor do corpo já foi validado contra o gateway.
        if (!assinatura) {
            const confirmacao = await verificarPagamento({ orderNsu, transactionNsu, slug });

            if (confirmacao.pago) {
                const desde = new Date(Date.now() - 48 * 60 * 60 * 1000);
                assinatura = await Assinatura.buscarPendentePorValor(confirmacao.valorCentavos, desde);

                if (assinatura) {
                    console.warn('Webhook casado por valor:', confirmacao.valorCentavos, 'centavos | assinatura:', String(assinatura._id));
                }
            }
        }

        if (!assinatura) {
            // Pedido desconhecido: aceita o 200 para o gateway não reenviar
            console.warn('Webhook para order_nsu desconhecido:', orderNsu, '| slug:', slug);
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

        // Marca pelo _id: o orderNsu recebido pode ser o UUID do gateway,
        // que não é a chave do nosso documento.
        const resultado = await Assinatura.marcarPagaPorId(assinatura._id, { transactionNsu, slug });

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

// ============================================================
// POST /api/pagamento/confirmar
// PROPÓSITO: Confirma o pagamento quando o usuário volta do checkout
// USADO POR: assinatura.js, ao carregar a página com os parâmetros
// que a InfinitePay anexa à redirect_url (order_nsu, slug,
// transaction_nsu, receipt_url).
// POR QUE EXISTE: o webhook pode atrasar ou se perder. O retorno do
// navegador é o caminho mais rápido para o usuário ver o plano ativo.
// SEGURANÇA: exige sessão e só confirma cobrança do próprio usuário.
// O corpo não é confiável: quem decide é verificarPagamento().
// ============================================================
router.post('/confirmar', limitadorAssinar, requireAuth, async (req, res) => {
    try {
        const corpo = req.body || {};
        const orderNsu = corpo.orderNsu;
        const transactionNsu = corpo.transactionNsu || null;
        const slug = corpo.slug || null;

        // orderNsu ou slug: o retorno do checkout traz os dois, mas o slug
        // é o que sempre existe, então aceitamos qualquer um dos dois.
        if (!orderNsu && !slug) {
            return res.status(400).json({ success: false, message: 'orderNsu ou slug é obrigatório.' });
        }

        // Mesmo casamento do webhook: orderNsu primeiro, slug como
        // alternativa, porque o retorno do checkout traz o slug da fatura.
        let assinatura = await Assinatura.buscarPorOrderNsu(orderNsu);

        if (!assinatura) {
            assinatura = await Assinatura.buscarPorSlug(slug);
        }

        if (!assinatura) {
            return res.status(404).json({ success: false, message: 'Cobrança não encontrada.' });
        }

        // IDOR: impede confirmar a cobrança de outra pessoa
        if (String(assinatura.userId) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Acesso negado.' });
        }

        if (assinatura.status === 'pago') {
            return res.status(200).json({ success: true, jaProcessado: true, plano: 'PRO' });
        }

        const verificacao = await verificarPagamento({ orderNsu, transactionNsu, slug });

        if (!verificacao.pago) {
            return res.status(200).json({ success: true, confirmado: false });
        }

        if (verificacao.valorCentavos !== null && verificacao.valorCentavos < PRECO_CENTAVOS) {
            console.error('Valor pago menor que o esperado:', orderNsu, verificacao.valorCentavos);
            return res.status(200).json({ success: true, confirmado: false, motivo: 'valor' });
        }

        // Marca pelo _id: o orderNsu recebido pode ser o UUID do gateway,
        // que não é a chave do nosso documento.
        const resultado = await Assinatura.marcarPagaPorId(assinatura._id, { transactionNsu, slug });

        if (resultado.modifiedCount === 0) {
            return res.status(200).json({ success: true, jaProcessado: true, plano: 'PRO' });
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

        return res.status(200).json({ success: true, confirmado: true, plano: 'PRO', planoExpiraEm: expiraEm });
    } catch (error) {
        console.error('Erro ao confirmar pagamento:', error);
        return res.status(500).json({ success: false, message: 'Erro ao confirmar o pagamento.' });
    }
});

export default router;
