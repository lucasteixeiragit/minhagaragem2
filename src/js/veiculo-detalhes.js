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

import { calcularKmAtualEstimado, calcularProximasManutencoes, getStatusColor, getStatusText } from './manutencao-utils.js';

// ============================================================
// FUNÇÕES DE ACESSO À API
// ============================================================

// Busca um veículo específico por ID via API
async function getVeiculoById(id) {
    try {
        const res = await fetch(`/api/vehicles/${id}`);
        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/login.html';
                return null;
            }
            if (res.status === 404) {
                window.location.href = './index.html';
                return null;
            }
            throw new Error('Falha ao carregar veículo');
        }
        const data = await res.json();
        return data.veiculo || null;
    } catch (e) {
        console.error('Erro ao carregar veículo:', e);
        return null;
    }
}

// Exclui uma manutenção específica do veículo via API
async function excluirManutencao(veiculoId, manutencaoId) {
    try {
        const res = await fetch(`/api/vehicles/${veiculoId}/maintenance/${manutencaoId}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.message || 'Erro ao excluir manutenção.');
            return;
        }

        veiculo.manutencoes = veiculo.manutencoes.filter(m => m.id !== manutencaoId); // atualiza pagina apos exclusao
        // Re-renderiza listas
        renderizarManutencoes();
        renderizarAlertas();
    } catch (e) {
        console.error('Erro ao excluir manutenção:', e);
        alert('Erro de conexão ao excluir manutenção.');
    }
}

function obterDataReferencia() {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('dataReferencia');

    if (!dataParam) {
        return new Date();
    }

    const partes = dataParam.split('-');
    if (partes.length === 3) {
        const [dia, mes, ano] = partes.map(Number);
        const data = new Date(ano, mes - 1, dia);
        if (!Number.isNaN(data.getTime())) {
            return data;
        }
    }

    const data = new Date(`${dataParam}T00:00:00`);
    return Number.isNaN(data.getTime()) ? new Date() : data;
}

const urlParams = new URLSearchParams(window.location.search);
const veiculoId = urlParams.get('id');

if (!veiculoId) {
    window.location.href = './index.html';
}

// Variável global do veículo (preenchida assincronamente)
let veiculo = null;
const dataReferencia = obterDataReferencia();

// Carrega o veículo da API e renderiza a página
(async function carregarVeiculo() {
    veiculo = await getVeiculoById(veiculoId);

    if (!veiculo) {
        window.location.href = './index.html';
        return;
    }

    if (!veiculo.manutencoes) {
        veiculo.manutencoes = [];
    }

    document.getElementById('veiculoTitulo').textContent = veiculo.apelido;

    // Informacoes a serem exibidas
    const kmEstimado = calcularKmAtualEstimado (veiculo, dataReferencia); // KM Estimado
    const totalManutencoes = veiculo.manutencoes.length; // N de manutencoes
    // soma total investido em manutencoes
    const totalInvestido = veiculo.manutencoes.reduce((total, manutencao) => {
        return total + (Number(manutencao.custo) || 0); 
    }, 0);

    document.getElementById('veiculoMarca').textContent =
        `${veiculo.marca || ''} ${veiculo.modelo || ''}`.trim().toUpperCase(); // marca e modelo

    document.getElementById('veiculoTitulo').textContent =
        veiculo.apelido || 'Veículo'; // Apelido

    document.getElementById('veiculoDados').textContent =
        `${veiculo.ano || '-'} | ${veiculo.placa || '-'}`; // Ano e Placa

    document.getElementById('kmEstimado').textContent =
        `${kmEstimado.toLocaleString('pt-BR')} KM`; // Km estimado

    document.getElementById('kmMensal').textContent =
        `${(Number(veiculo.kmMensal) || 0).toLocaleString('pt-BR')} KM`; // Media de km mensal

    document.getElementById('totalManutencoes').textContent =
        totalManutencoes; // numero de manutencoes

    document.getElementById('totalInvestido').textContent =
        formatarMoeda(totalInvestido); // total investido



    document.getElementById('btnAdicionarManutencao').addEventListener('click', () => {
        window.location.href = `./manutencao-nova.html?veiculoId=${veiculoId}`;
    });

    document.getElementById('btnEditar').addEventListener('click', () => {
        window.location.href = `./veiculo-editar.html?id=${veiculoId}`;
    });

    document.getElementById('btnVoltar').addEventListener('click', () => {
        window.location.href = './index.html'
    })

    renderizarAlertas();
    renderizarManutencoes();
    renderizarProximaRevisao();
})();

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
    const alertasSection = document.getElementById('alertasSection');
    const alertasLista = document.getElementById('alertasLista');

    if (!veiculo.intervalosManutencoesPreventivas || Object.keys(veiculo.intervalosManutencoesPreventivas).length === 0) {
        alertasSection.style.display = 'none';
        return;
    }

    const proximasManutencoes = calcularProximasManutencoes(veiculo, dataReferencia);
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

function renderizarProximaRevisao() {
    //HTML vai puxar as informacoes a exibir dessas const
    const secao = document.getElementById('proximaRevisao');
    const status = document.getElementById('proximaRevisaoStatus'); // Em breve / atrasada
    const mensagem = document.getElementById('proximaRevisaoMensagem'); // prox revisao em .... Faltam ...
    const detalhes = document.getElementById('proximaRevisaoDetalhes'); // ultima revisao... intervalos....

    const manutencoes = calcularProximasManutencoes(veiculo,dataReferencia);
    //se nao tem manutencoes, secao nao aparece
    if(!manutencoes.length) {
        secao.style.display = 'none';
        return;
    }

    // funcao ja ordenada as manutencoes pela urgencia e depois pela menor quantidade de km restante
    const proxima = manutencoes[0];

    secao.style.display = 'block';
    secao.className = `proxima__revisao proxima__revisao--${proxima.status}`;
    status.textContent = proxima.status === 'ok' ? 'Em dia' : getStatusText(proxima.status);

    if(proxima.kmRestantes <= 0) {
        mensagem.innerHTML =
            `A revisão está atrasada em ` +
            `<strong>${Math.abs(proxima.kmRestantes).toLocaleString('pt-BR')} km</strong>.`;
    } else {
        const kmMensal = Number(veiculo.kmMensal) || 0;
        const mesesEstimados = kmMensal > 0
            ? (proxima.kmRestantes / kmMensal).toFixed(1)
            : null;

        mensagem.innerHTML =
            `Próxima revisão aos ` +
            `<strong>${proxima.kmProximaManutencao.toLocaleString('pt-BR')} km</strong>. ` +
            `Faltam ` +
            `<strong>${proxima.kmRestantes.toLocaleString('pt-BR')} km</strong>` +
            `${mesesEstimados ? ` — aproximadamente ${mesesEstimados} meses no seu ritmo.` : '.'}`;
    }

    detalhes.textContent =
        `Última revisão: ${
            proxima.ultimaManutencao
                ? `KM ${Number(proxima.ultimaManutencao.km).toLocaleString('pt-BR')}`
                : 'nenhuma registrada'
        } • Intervalo: ${Number(proxima.intervaloKm).toLocaleString('pt-BR')} km`;
};
