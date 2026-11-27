// ============================================================
// ARQUIVO: js/assinatura.js (FRONTEND)
// DESCRIÇÃO: Tela de assinatura do plano Pro
// ============================================================
// PÁGINA HTML: assinatura.html
// RESPONSABILIDADES:
//   - Mostrar o plano atual, o preço e o vencimento
//   - Destacar o recurso que trouxe o usuário até aqui (?motivo=)
//   - Pedir o teste de 7 dias ou o link de pagamento à API
//   - Redirecionar para o checkout da InfinitePay
//
// DEPENDE DE: js/plano.js (carregarPlano, formatarPreco, formatarData)
// API USADA:
//   GET  /api/pagamento/status   → plano, preço, trial, histórico
//   POST /api/pagamento/assinar  → trial na 1ª vez, senão { url }
//   POST /api/pagamento/confirmar → confirma o retorno do checkout
// ============================================================

import { carregarPlano, formatarPreco, formatarData } from './plano.js';

// Texto do motivo informado pela página que bloqueou o recurso
const MOTIVOS = {
    veiculo: 'Você chegou aqui porque o plano gratuito guarda apenas 1 veículo.',
    'nota-fiscal': 'Você chegou aqui porque a nota fiscal faz parte do plano Pro.',
    geral: 'Assine o Pro para liberar todos os recursos.'
};

const urlParams = new URLSearchParams(window.location.search);
const motivo = urlParams.get('motivo') || 'geral';

// Referências ao DOM
const elPlano = document.getElementById('planoAtual');
const elVencimento = document.getElementById('planoVencimento');
const elPreco = document.getElementById('planoPreco');
const elMotivo = document.getElementById('motivoAviso');
const elMensagem = document.getElementById('mensagemAssinatura');
const elHistorico = document.getElementById('historicoAssinaturas');
const btnAssinar = document.getElementById('btnAssinar');

// ============================================================
// FUNÇÃO: mostrarMensagem(texto, tipo)
// PROPÓSITO: Escreve o retorno da API na tela
// tipo: 'erro' | 'sucesso'
// ============================================================
function mostrarMensagem(texto, tipo = 'erro') {
    elMensagem.textContent = texto;
    elMensagem.className = `assinatura__mensagem assinatura__mensagem--${tipo}`;
    elMensagem.hidden = false;
}

// ============================================================
// FUNÇÃO: renderizarStatus()
// PROPÓSITO: Preenche plano, vencimento, preço e histórico
// ============================================================
async function renderizarStatus() {
    const status = await carregarPlano(true);

    if (!status) {
        window.location.href = '/login.html';
        return;
    }

    elPlano.textContent = status.plano === 'PRO' ? 'Pro' : 'Gratuito';
    elPlano.className = `assinatura__plano assinatura__plano--${status.plano === 'PRO' ? 'pro' : 'free'}`;

    elVencimento.textContent = status.planoExpiraEm
        ? `Válido até ${formatarData(status.planoExpiraEm)}`
        : 'Sem assinatura ativa';

    elPreco.textContent = `${formatarPreco(status.precoCentavos)} por ${status.diasAssinatura} dias`;

    // Já é Pro: o botão não deve cobrar de novo
    if (status.plano === 'PRO') {
        btnAssinar.textContent = 'Renovar por mais ' + status.diasAssinatura + ' dias';
    } else if (!status.trialUsado) {
        btnAssinar.textContent = `Começar teste de ${status.diasTrial} dias`;
    } else {
        btnAssinar.textContent = 'Assinar o Pro';
    }

    // Histórico de cobranças (vazio na primeira visita)
    if (!status.historico || status.historico.length === 0) {
        elHistorico.innerHTML = '<p class="assinatura__vazio">Nenhuma cobrança registrada ainda.</p>';
        return;
    }

    elHistorico.innerHTML = status.historico.map(item => `
        <div class="assinatura__historico__item">
            <span class="assinatura__historico__valor">${formatarPreco(item.valorCentavos)}</span>
            <span class="assinatura__historico__status">${item.status === 'pago' ? 'Pago' : 'Pendente'}</span>
            <span class="assinatura__historico__data">${formatarData(item.pagoEm || item.criadoEm)}</span>
        </div>
    `).join('');
}

// ============================================================
// FUNÇÃO: assinar()
// PROPÓSITO: Pede a assinatura à API e trata os três retornos:
//   trial:true  → teste concedido, recarrega a tela
//   url         → manda o usuário ao checkout da InfinitePay
//   jaAtivo     → assinatura já válida
// ============================================================
async function assinar() {
    btnAssinar.disabled = true;
    const textoOriginal = btnAssinar.textContent;
    btnAssinar.textContent = 'Aguarde...';

    try {
        const resposta = await fetch('/api/pagamento/assinar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
            mostrarMensagem(dados.message || 'Não foi possível iniciar a assinatura.');
            btnAssinar.disabled = false;
            btnAssinar.textContent = textoOriginal;
            return;
        }

        if (dados.trial) {
            mostrarMensagem(dados.message || 'Teste ativado.', 'sucesso');
            await renderizarStatus();
            btnAssinar.disabled = false;
            return;
        }

        if (dados.jaAtivo) {
            mostrarMensagem(dados.message || 'Sua assinatura já está ativa.', 'sucesso');
            await renderizarStatus();
            btnAssinar.disabled = false;
            return;
        }

        if (dados.url) {
            window.location.href = dados.url;
            return;
        }

        mostrarMensagem('Resposta inesperada do servidor.');
        btnAssinar.disabled = false;
        btnAssinar.textContent = textoOriginal;
    } catch (error) {
        console.error('Erro ao assinar:', error);
        mostrarMensagem('Erro de conexão ao iniciar a assinatura.');
        btnAssinar.disabled = false;
        btnAssinar.textContent = textoOriginal;
    }
}

// ============================================================
// FUNÇÃO: confirmarRetorno()
// PROPÓSITO: Quando o usuário volta do checkout, a InfinitePay anexa
// order_nsu, slug, transaction_nsu e receipt_url à redirect_url.
// Esta função envia esses dados para a API, que confirma o pagamento
// no gateway e ativa o plano sem esperar o webhook.
// RETORNO: true quando o plano foi ativado agora
// ============================================================
async function confirmarRetorno() {
    const orderNsu = urlParams.get('order_nsu');
    const slug = urlParams.get('slug');
    const transactionNsu = urlParams.get('transaction_nsu');

    // Sem order_nsu não há o que confirmar: é uma visita normal à página
    if (!orderNsu) return false;

    try {
        const resposta = await fetch('/api/pagamento/confirmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNsu, slug, transactionNsu })
        });
        const dados = await resposta.json();

        if (dados.confirmado) {
            mostrarMensagem('Pagamento confirmado. Seu plano Pro está ativo.', 'sucesso');
            return true;
        }

        if (dados.jaProcessado) {
            mostrarMensagem('Este pagamento já havia sido confirmado.', 'sucesso');
            return true;
        }

        // Ainda não aprovado: o webhook pode chegar em instantes
        mostrarMensagem('Pagamento ainda não confirmado pela InfinitePay. Recarregue em alguns instantes.');
        return false;
    } catch (error) {
        console.error('Erro ao confirmar retorno do checkout:', error);
        mostrarMensagem('Não foi possível confirmar o pagamento agora.');
        return false;
    }
}

// ============================================================
// EXECUÇÃO
// ============================================================
elMotivo.textContent = MOTIVOS[motivo] || MOTIVOS.geral;
btnAssinar.addEventListener('click', assinar);

// Confirma o retorno do checkout antes de desenhar o status, para a
// tela já aparecer como Pro quando o pagamento foi aprovado.
confirmarRetorno().finally(renderizarStatus);
