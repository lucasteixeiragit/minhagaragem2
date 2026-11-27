// ============================================================
// ARQUIVO: js/plano-ui.js
// DESCRIÇÃO: Mostra na tela os recursos que exigem o plano Pro
// ============================================================
// PAPEL: este arquivo NÃO bloqueia nada. Ele deixa explícito para o
// usuário que o recurso existe e que depende da assinatura. Quem impede
// de fato é o servidor, em middleware/plano.js.
//
// COMO FUNCIONA: a página declara no <body> qual porteiro visual usar:
//   <body data-plano-gate="veiculo">      → limite de 1 veículo no FREE
//   <body data-plano-gate="nota-fiscal">  → anexo de nota fiscal só no PRO
//
// USADO POR (via <script type="module" src="./js/plano-ui.js">):
//   - veiculo-novo.html      → data-plano-gate="veiculo"
//   - manutencao-nova.html   → data-plano-gate="nota-fiscal"
//   - manutencao-editar.html → data-plano-gate="nota-fiscal"
//
// DEPENDE DE: js/plano.js (carregarPlano, montarAvisoUpgrade)
// ============================================================

import { carregarPlano, montarAvisoUpgrade } from './plano.js';

// Lê o porteiro declarado no <body>. Sem atributo, nada é feito.
const gate = document.body.dataset.planoGate;

// ============================================================
// FUNÇÃO: aplicarGateVeiculo()
// PROPÓSITO: No plano FREE com 1 veículo já cadastrado, avisa que o
// segundo veículo é recurso Pro e desabilita o botão de salvar.
// O servidor também barra (POST /api/vehicles → 403 LIMITE_PLANO),
// então desabilitar aqui é só para o usuário não perder o preenchimento.
// ============================================================
async function aplicarGateVeiculo() {
    const status = await carregarPlano();
    if (!status || status.plano === 'PRO') return;

    // Conta os veículos do usuário para saber se o limite já foi atingido
    let total = 0;
    try {
        const resposta = await fetch('/api/vehicles');
        if (resposta.ok) {
            const dados = await resposta.json();
            total = (dados.veiculos || []).length;
        }
    } catch (error) {
        console.error('Erro ao contar veículos:', error);
        return;
    }

    if (total < 1) return;

    const container = document.getElementById('avisoPlano');
    if (container) {
        container.appendChild(montarAvisoUpgrade({
            titulo: 'Adicionar mais veículos é um recurso Pro',
            texto: 'O plano gratuito guarda 1 veículo. Assine o Pro para registrar toda a garagem.'
        }));
        container.hidden = false;
    }

    // Desabilita o envio do formulário: o cadastro não passaria no servidor
    const botaoSalvar = document.querySelector('#formNovoVeiculo button[type="submit"]');
    if (botaoSalvar) {
        botaoSalvar.disabled = true;
        botaoSalvar.textContent = 'Assine o Pro para adicionar';
    }
}

// ============================================================
// FUNÇÃO: aplicarGateNotaFiscal()
// PROPÓSITO: No plano FREE, avisa que a nota fiscal é recurso Pro e
// desabilita o upload. O servidor descarta o anexo (maintenance.routes.js),
// então o aviso evita o usuário anexar um arquivo que seria ignorado.
// ============================================================
async function aplicarGateNotaFiscal() {
    const status = await carregarPlano();
    if (!status || status.plano === 'PRO') return;

    const container = document.getElementById('avisoNotaFiscal');
    if (container) {
        container.appendChild(montarAvisoUpgrade({
            titulo: 'Nota fiscal é um recurso Pro',
            texto: 'No plano gratuito a manutenção é salva sem o anexo. Assine o Pro para guardar a nota fiscal junto do serviço.'
        }));
        container.hidden = false;
    }

    // Desabilita o botão de anexo e o input de arquivo
    const botaoUpload = document.getElementById('btnUpload');
    if (botaoUpload) {
        botaoUpload.disabled = true;
        botaoUpload.textContent = 'Anexo disponível no plano Pro';
    }

    const inputArquivo = document.getElementById('notaFiscal');
    if (inputArquivo) {
        inputArquivo.disabled = true;
    }
}

// ============================================================
// EXECUÇÃO: escolhe o porteiro conforme o atributo do <body>
// ============================================================
if (gate === 'veiculo') {
    aplicarGateVeiculo();
} else if (gate === 'nota-fiscal') {
    aplicarGateNotaFiscal();
}
