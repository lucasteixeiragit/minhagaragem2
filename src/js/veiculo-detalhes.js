// ============================================================
// ARQUIVO: veiculo-detalhes.js (FRONTEND)
// DESCRIÇÃO: Página de detalhes de um veículo específico
// ============================================================
// PÁGINA HTML: veiculo-detalhes.html
// RESPONSABILIDADES:
//   - Exibir informações do veículo (marca, modelo, ano, placa, KM)
//   - Renderizar cards de alertas de manutenção (atrasadas, urgentes)
//   - Listar histórico de manutenções realizadas
//   - Permitir excluir manutenções
//   - Botão para adicionar nova manutenção
// ============================================================

import { calcularProximasManutencoes, getStatusColor, getStatusText } from './manutencao-utils.js';

const STORAGE_KEY = "minhaGaragem.veiculos";

// ============================================================
// FUNÇÕES DE ACESSO AO LOCALSTORAGE
// ============================================================

function getVeiculos() {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
}

function salvarVeiculos(veiculos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(veiculos));
}

// Busca um veículo específico por ID
function getVeiculoById(id) {
    const veiculos = getVeiculos();
    return veiculos.find(v => String(v.id) === String(id));
}

// Exclui uma manutenção específica do veículo
function excluirManutencao(veiculoId, manutencaoId) {
    const veiculos = getVeiculos();
    const veiculo = veiculos.find(v => String(v.id) === String(veiculoId));
    
    if (veiculo && veiculo.manutencoes) {
        // Remove manutenção do array
        veiculo.manutencoes = veiculo.manutencoes.filter(m => String(m.id) !== String(manutencaoId));
        salvarVeiculos(veiculos);
        // Re-renderiza listas
        renderizarManutencoes();
        renderizarAlertas();
    }
}

const urlParams = new URLSearchParams(window.location.search);
const veiculoId = urlParams.get('id');

if (!veiculoId) {
    window.location.href = './index.html';
}

const veiculo = getVeiculoById(veiculoId);

if (!veiculo) {
    window.location.href = './index.html';
}

if (!veiculo.manutencoes) {
    veiculo.manutencoes = [];
    const veiculos = getVeiculos();
    const index = veiculos.findIndex(v => String(v.id) === String(veiculoId));
    if (index !== -1) {
        veiculos[index] = veiculo;
        salvarVeiculos(veiculos);
    }
}

document.getElementById('veiculoTitulo').textContent = veiculo.apelido;

const infoHTML = `
    <p>${veiculo.marca || ''} ${veiculo.modelo || ''}</p>
    <p>Ano: ${veiculo.ano || '-'} | Placa: ${veiculo.placa || '-'}</p>
    <p>KM atual: ${veiculo.kmAtual || 0}</p>
`;
document.getElementById('veiculoInfo').innerHTML = infoHTML;

document.getElementById('btnAdicionarManutencao').addEventListener('click', () => {
    window.location.href = `./manutencao-nova.html?veiculoId=${veiculoId}`;
});

// ============================================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO
// ============================================================

// Formata data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
function formatarData(dataISO) {
    if (!dataISO) return '-';
    const data = new Date(dataISO + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
}

// Formata valor numérico para moeda brasileira (R$ 350,00)
function formatarMoeda(valor) {
    if (!valor) return '-';
    return parseFloat(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// ============================================================
// FUNÇÃO: renderizarAlertas()
// ============================================================
// Renderiza seção de alertas de manutenção (atrasadas, urgentes, em breve)
function renderizarAlertas() {
    const veiculo = getVeiculoById(veiculoId);
    const alertasSection = document.getElementById('alertasSection');
    const alertasLista = document.getElementById('alertasLista');

    if (!veiculo.intervalosManutencoesPreventivas || Object.keys(veiculo.intervalosManutencoesPreventivas).length === 0) {
        alertasSection.style.display = 'none';
        return;
    }

    const proximasManutencoes = calcularProximasManutencoes(veiculo);
    const alertas = proximasManutencoes.filter(m => m.status !== 'ok');

    if (alertas.length === 0) {
        alertasSection.style.display = 'none';
        return;
    }

    alertasSection.style.display = 'block';

    alertasLista.innerHTML = alertas.map(alerta => {
        const statusColor = getStatusColor(alerta.status);
        const statusText = getStatusText(alerta.status);
        
        let mensagem = '';
        if (alerta.kmRestantes <= 0) {
            mensagem = `⚠️ Esta manutenção está <strong>atrasada em ${Math.abs(alerta.kmRestantes)} km</strong>!`;
        } else {
            mensagem = `Faltam <strong>${alerta.kmRestantes} km</strong> para esta manutenção.`;
        }

        return `
            <div class="alerta__card alerta__card--${alerta.status}">
                <div class="alerta__header">
                    <h3 class="alerta__titulo">${alerta.nome}</h3>
                    <span class="alerta__badge" style="background: ${statusColor}; color: oklch(0.96 0.01 140);">
                        ${statusText}
                    </span>
                </div>
                <p class="alerta__info">${mensagem}</p>
                <p class="alerta__info" style="font-size: 0.75rem; margin-top: 4px;">
                    ${alerta.descricao} • Intervalo: ${alerta.intervaloKm.toLocaleString('pt-BR')} km
                </p>
                <div class="alerta__barra__container">
                    <div class="alerta__barra__fundo">
                        <div class="alerta__barra__progresso" style="width: ${alerta.percentualCompleto}%; background: ${statusColor};"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderizarManutencoes() {
    const veiculo = getVeiculoById(veiculoId);
    const manutencoesVazio = document.getElementById('manutencoesVazio');
    const manutencoesLista = document.getElementById('manutencoesLista');

    if (!veiculo.manutencoes || veiculo.manutencoes.length === 0) {
        manutencoesVazio.style.display = 'block';
        manutencoesLista.innerHTML = '';
        return;
    }

    manutencoesVazio.style.display = 'none';

    const manutencoesOrdenadas = [...veiculo.manutencoes].sort((a, b) => {
        return new Date(b.data) - new Date(a.data);
    });

    manutencoesLista.innerHTML = manutencoesOrdenadas.map(manutencao => {
        let notaHTML = '';
        if (manutencao.notaFiscal) {
            notaHTML = `
                <div class="manutencao__card__nota">
                    <a href="${manutencao.notaFiscal}" target="_blank" class="btn__nota">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                        Ver nota fiscal
                    </a>
                </div>
            `;
        }

        return `
            <div class="manutencao__card">
                <div class="manutencao__card__header">
                    <h3 class="manutencao__card__tipo">${manutencao.tipo}</h3>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        ${manutencao.custo ? `<span class="manutencao__card__custo">${formatarMoeda(manutencao.custo)}</span>` : ''}
                        <button class="btn__excluir__manutencao" data-id="${manutencao.id}">Excluir</button>
                    </div>
                </div>
                <div class="manutencao__card__info">
                    <div class="manutencao__card__info__item">
                        <span class="manutencao__card__info__label">Data:</span>
                        ${formatarData(manutencao.data)}
                    </div>
                    <div class="manutencao__card__info__item">
                        <span class="manutencao__card__info__label">KM:</span>
                        ${manutencao.km || '-'}
                    </div>
                </div>
                ${manutencao.descricao ? `<div class="manutencao__card__descricao">${manutencao.descricao}</div>` : ''}
                ${notaHTML}
            </div>
        `;
    }).join('');

    manutencoesLista.querySelectorAll('.btn__excluir__manutencao').forEach(botao => {
        botao.addEventListener('click', () => {
            const confirmar = window.confirm('Tem certeza que deseja excluir esta manutenção?');
            if (confirmar) {
                excluirManutencao(veiculoId, botao.dataset.id);
            }
        });
    });
}

renderizarAlertas();
renderizarManutencoes();
