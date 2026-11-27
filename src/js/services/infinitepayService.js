// ============================================================
// ARQUIVO: services/infinitepayService.js
// DESCRIÇÃO: Integração com o Checkout Integrado da InfinitePay
// ============================================================
// DOCUMENTAÇÃO: https://www.infinitepay.io/checkout-documentacao
//
// DOIS FATOS DA DOCUMENTAÇÃO QUE MOLDAM ESTE ARQUIVO:
//   1. O webhook NÃO tem assinatura de segurança. Por isso ele nunca é
//      fonte de verdade: quem confirma o pagamento é verificarPagamento(),
//      que consulta /payment_check no servidor da InfinitePay.
//   2. Não existe sandbox. Testes usam transações reais de valor mínimo.
//
// VARIÁVEIS DE AMBIENTE:
//   INFINITEPAY_HANDLE  → InfiniteTag da conta, sem o "$"
//   INFINITEPAY_API_KEY → opcional, header X-Api-Key (inchk_...)
//   APP_URL             → base para redirect_url e webhook_url
//
// USADO POR: routes/pagamento.routes.js
// ============================================================

const BASE_URL = 'https://api.checkout.infinitepay.io';

// ============================================================
// FUNÇÃO: configurado()
// PROPÓSITO: Diz se as credenciais existem, para a rota responder um
// erro claro em vez de estourar um fetch com handle undefined.
// ============================================================
export function configurado() {
    return Boolean(process.env.INFINITEPAY_HANDLE);
}

// Monta os cabeçalhos. A API Key é opcional na documentação, mas é
// obrigatória quando se usa o objeto "options".
function cabecalhos() {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.INFINITEPAY_API_KEY) {
        headers['X-Api-Key'] = process.env.INFINITEPAY_API_KEY;
    }
    return headers;
}

// ============================================================
// FUNÇÃO: criarLinkPagamento({ orderNsu, valorCentavos, descricao })
// PROPÓSITO: Cria o link de checkout e devolve a URL de pagamento
// RETORNO: { url } em caso de sucesso, { erro } em caso de falha
// OBSERVAÇÃO: o preço vem sempre do servidor (middleware/plano.js),
// nunca do corpo da requisição, senão o usuário pagaria o que quisesse.
// ============================================================
export async function criarLinkPagamento({ orderNsu, valorCentavos, descricao }) {
    const base = process.env.APP_URL || 'https://minhagaragem.net';

    const corpo = {
        handle: process.env.INFINITEPAY_HANDLE,
        items: [
            {
                quantity: 1,
                price: valorCentavos,
                description: descricao
            }
        ],
        order_nsu: orderNsu,
        redirect_url: `${base}/assinatura.html?order_nsu=${encodeURIComponent(orderNsu)}`,
        webhook_url: `${base}/api/pagamento/webhook`
    };

    try {
        const resposta = await fetch(`${BASE_URL}/links`, {
            method: 'POST',
            headers: cabecalhos(),
            body: JSON.stringify(corpo),
            signal: AbortSignal.timeout(15000)
        });

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            console.error('InfinitePay /links falhou:', resposta.status, JSON.stringify(dados));
            return { erro: `Falha ao criar o link de pagamento (HTTP ${resposta.status}).` };
        }

        // A documentação não fixa o nome do campo; aceita as formas conhecidas
        const url = dados.url || dados.checkout_url || dados.link || (dados.data && dados.data.url);

        if (!url) {
            console.error('InfinitePay /links sem URL na resposta:', JSON.stringify(dados));
            return { erro: 'A InfinitePay não devolveu a URL de pagamento.' };
        }

        // O slug da fatura é o último segmento da URL de checkout
        // (https://checkout.infinitepay.io/<handle>/<slug>). Guardamos ele
        // porque o webhook da InfinitePay devolve esse slug em invoice_slug
        // e nem sempre devolve o nosso order_nsu, então o casamento
        // confiável é por slug.
        const slug = String(url).split('/').filter(Boolean).pop() || null;

        return { url, slug, bruto: dados };
    } catch (error) {
        console.error('Erro de rede ao criar link InfinitePay:', error.message);
        return { erro: 'Não foi possível falar com a InfinitePay agora.' };
    }
}

// ============================================================
// FUNÇÃO: verificarPagamento({ orderNsu, transactionNsu, slug })
// PROPÓSITO: Confirma no servidor da InfinitePay se o pagamento existe
// e foi aprovado. É a ÚNICA fonte de verdade, porque o webhook não tem
// assinatura e os parâmetros do redirect vêm do navegador.
// RETORNO: { pago: Boolean, valorCentavos: Number|null, bruto }
// ============================================================
export async function verificarPagamento({ orderNsu, transactionNsu, slug }) {
    const corpo = {
        handle: process.env.INFINITEPAY_HANDLE,
        order_nsu: orderNsu,
        transaction_nsu: transactionNsu,
        slug
    };

    try {
        const resposta = await fetch(`${BASE_URL}/payment_check`, {
            method: 'POST',
            headers: cabecalhos(),
            body: JSON.stringify(corpo),
            signal: AbortSignal.timeout(15000)
        });

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            console.error('InfinitePay /payment_check falhou:', resposta.status, JSON.stringify(dados));
            return { pago: false, valorCentavos: null, bruto: dados };
        }

        // A documentação orienta comparar "amount" (valor esperado) e não
        // "paid_amount", que pode incluir taxas repassadas ao comprador.
        const valor = dados.amount ?? dados.paid_amount ?? null;

        // A API devolve {"success":false} quando o pedido não existe ou não
        // foi pago. Tratar esse campo evita depender só do status textual.
        if (dados.success === false) {
            return { pago: false, valorCentavos: null, bruto: dados };
        }

        // Considera pago quando o status indica aprovação ou quando o
        // valor confirmado existe e é positivo.
        const status = String(dados.status || dados.payment_status || '').toLowerCase();
        const pago = ['paid', 'approved', 'aprovado', 'pago', 'settled'].includes(status)
            || (valor !== null && Number(valor) > 0);

        return { pago, valorCentavos: valor === null ? null : Number(valor), bruto: dados };
    } catch (error) {
        console.error('Erro de rede ao verificar pagamento InfinitePay:', error.message);
        return { pago: false, valorCentavos: null, bruto: null };
    }
}
