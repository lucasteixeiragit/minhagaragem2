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
//   GET  /api/pagamento/status  → plano, preço, trial, histórico
//   POST /api/pagamento/assinar → trial na 1ª vez, senão { url }
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
// EXECUÇÃO
// ============================================================
elMotivo.textContent = MOTIVOS[motivo] || MOTIVOS.geral;
btnAssinar.addEventListener('click', assinar);
renderizarStatus();
