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

    await carregarNotificacoes();
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

//Encontra o intervalo preventivo que corresponde o tipo da manutencao
function encontrarIntervalo(manutencao, veiculo) {
    const intervalos = veiculo.intervalosManutencoesPreventivas || {}; // transforma objeto em array pois .find procura arrays
    return Object.values(intervalos).find(i => 
        i.nome && manutencao.tipo && (i.nome.toLowerCase().includes(manutencao.tipo.toLowerCase()) || //.find procura o nome da manutencao e o tipo, //.includes pergunta se o nome do intervalo contem o tipo da manutencao
    manutencao.tipo.toLowerCase().includes(i.nome.toLowerCase())) //segunda comparacao
    ) || null;
}

//Calcula a proxima data somando intervalomeses a data da manutencao
function calcularProximaData(manutencao, intervalo){ //recebe manutencao e o intervalo dela
    if (!intervalo || !intervalo.intervaloMeses) return null; //Se não existe intervalo OU se não existe um intervalo em meses, não é possível calcular a próxima data
    const data = new Date(manutencao.data + 'T00:00:00'); //Transformando a data em um objeto Date
    data.setMonth(data.getMonth() + intervalo.intervaloMeses); //pega o mes da data e soma o intervalo
    return data.toISOString().slice(0, 10); // toISOString() transforma a data em um formato semelhante a: 2027-08-20 com .slice que limita em 10 caracteres
}

function calcularProximoKm(manutencao, intervalo) {
    if (!intervalo || !intervalo.intervaloKm) return null; //Se não existe intervalo OU se não existe um intervalo em meses, não é possível calcular a próxima data
    const km = parseInt(manutencao.km) || 0; // transforma KM em int
    return km + intervalo.intervaloKm;
};
// ============================================================
// FUNÇÃO: renderizarAlertas()
// ============================================================
// Renderiza seção de alertas de manutenção (atrasadas, urgentes, em breve)
// Escapa texto vindo do banco antes de injetar em innerHTML (evita XSS)
function escaparHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Notificações pendentes do usuário, indexadas pelo tipo da manutenção.
// Usadas para saber quais alertas foram adiados e qual notificação concluir.
let notificacoesPorTipo = {};

// Controla se os alertas adiados estão sendo exibidos na lista
let mostrarAdiados = false;

// Busca as notificações pendentes na API e monta o índice por tipo
async function carregarNotificacoes() {
    try {
        const res = await fetch('/api/notificacoes');
        if (!res.ok) return;

        const dados = await res.json();
        const lista = dados.notificacoes || [];

        notificacoesPorTipo = {};
        for (const notificacao of lista) {
            notificacoesPorTipo[notificacao.tipo] = notificacao;
        }
    } catch (erro) {
        // Sem notificações a página continua funcionando, apenas sem adiar/concluir
        console.error('Erro ao carregar notificações:', erro);
    }
}

// Converte um arquivo em string Base64 para envio junto da manutenção
function arquivoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = () => reject(new Error('Falha ao ler o arquivo'));
        leitor.readAsDataURL(arquivo);
    });
}

// Registra a manutenção concluída e encerra a notificação correspondente
async function concluirManutencao(tipo, dados) {
    const res = await fetch(`/api/vehicles/${veiculoId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dados, tipo })
    });

    const resposta = await res.json();
    if (!res.ok) {
        throw new Error(resposta.message || 'Erro ao registrar manutenção.');
    }

    // Se existir notificação pendente para este tipo, marca como concluída
    const notificacao = notificacoesPorTipo[tipo];
    if (notificacao && notificacao._id) {
        await fetch(`/api/notificacoes/${notificacao._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acao: 'concluir' })
        });
    }
}

// Adia a notificação: o card fica oculto até a data escolhida
async function adiarNotificacao(tipo, novaData) {
    const notificacao = notificacoesPorTipo[tipo];

    // Sem notificação pendente (o cron ainda não rodou), cria uma já adiada.
    // Sem esse caminho o botão Adiar falharia em alertas recém-vencidos.
    if (!notificacao || !notificacao._id) {
        const resCriacao = await fetch('/api/notificacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ veiculoId: veiculo._id, tipo, dataVencimento: novaData })
        });

        const respostaCriacao = await resCriacao.json();
        if (!resCriacao.ok) {
            throw new Error(respostaCriacao.message || 'Erro ao adiar notificação.');
        }
        return;
    }

    const res = await fetch(`/api/notificacoes/${notificacao._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'adiar', novaData })
    });

    const resposta = await res.json();
    if (!res.ok) {
        throw new Error(resposta.message || 'Erro ao adiar notificação.');
    }
}

function renderizarAlertas() {
    const alertasSection = document.getElementById('alertasSection');
    const alertasLista = document.getElementById('alertasLista');

    if (!veiculo.intervalosManutencoesPreventivas || Object.keys(veiculo.intervalosManutencoesPreventivas).length === 0) {
        alertasSection.style.display = 'none';
        return;
    }

    const proximasManutencoes = calcularProximasManutencoes(veiculo, dataReferencia);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Separa os alertas em visíveis e adiados: um alerta adiado fica oculto
    // até a data escolhida, mas precisa continuar acessível para poder voltar
    const alertasTodos = proximasManutencoes.filter(m => m.status !== 'ok');
    const estaAdiado = alerta => {
        const notificacao = notificacoesPorTipo[alerta.nome];
        if (!notificacao || !notificacao.dataVencimento) return false;

        // Compara apenas a data, ignorando a hora, senão um alerta
        // adiado para hoje seria escondido pelo horário atual
        const dataNotificacao = new Date(notificacao.dataVencimento);
        dataNotificacao.setHours(0, 0, 0, 0);
        return dataNotificacao > hoje;
    };

    const adiados = alertasTodos.filter(estaAdiado);
    const visiveis = alertasTodos.filter(a => !estaAdiado(a));
    const alertas = mostrarAdiados ? alertasTodos : visiveis;

    // Linha de resumo dos adiados, com botão para revelar ou esconder
    const alertasAdiados = document.getElementById('alertasAdiados');
    if (adiados.length > 0) {
        const proximaData = adiados
            .map(a => new Date(notificacoesPorTipo[a.nome].dataVencimento))
            .sort((a, b) => a - b)[0];
        // Formata em UTC: a data é gravada à meia-noite UTC, então o fuso local
        // (UTC-3) mostraria o dia anterior
        const dataFormatada = proximaData.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        alertasAdiados.style.display = 'block';
        alertasAdiados.innerHTML = `
            <span class="alertas__adiados__texto">${adiados.length} alerta(s) adiado(s) até ${dataFormatada}</span>
            <button type="button" class="alertas__adiados__btn" id="btnMostrarAdiados">
                ${mostrarAdiados ? 'Ocultar' : 'Mostrar'}
            </button>
        `;
        document.getElementById('btnMostrarAdiados').addEventListener('click', () => {
            mostrarAdiados = !mostrarAdiados;
            renderizarAlertas();
        });
    } else {
        alertasAdiados.style.display = 'none';
        alertasAdiados.innerHTML = '';
    }

    if (alertas.length === 0 && adiados.length === 0) {
        alertasSection.style.display = 'none';
        return;
    }

    alertasSection.style.display = 'block';

    alertasLista.innerHTML = alertas.map(alerta => {
        const statusColor = getStatusColor(alerta.status);
        const statusText = getStatusText(alerta.status);
        const tipoEscapado = escaparHTML(alerta.nome);

        let mensagem = '';
        if (alerta.kmRestantes <= 0) {
            mensagem = `⚠️ Esta manutenção está <strong>atrasada em ${Math.abs(alerta.kmRestantes)} km</strong>!`;
        } else {
            mensagem = `Faltam <strong>${alerta.kmRestantes} km</strong> para esta manutenção.`;
        }

        return `
            <div class="alerta__card alerta__card--${alerta.status}" data-tipo="${tipoEscapado}">
                <div class="alerta__header">
                    <h3 class="alerta__titulo">${tipoEscapado}</h3>
                    <span class="alerta__badge" style="background: ${statusColor}; color: oklch(0.96 0.01 140);">
                        ${statusText}
                    </span>
                </div>
                <p class="alerta__info">${mensagem}</p>
                <p class="alerta__info" style="font-size: 0.75rem; margin-top: 4px;">
                    ${escaparHTML(alerta.descricao)} • Intervalo: ${alerta.intervaloKm.toLocaleString('pt-BR')} km
                </p>
                <div class="alerta__barra__container">
                    <div class="alerta__barra__fundo">
                        <div class="alerta__barra__progresso" style="width: ${alerta.percentualCompleto}%; background: ${statusColor};"></div>
                    </div>
                </div>

                <div class="alerta__acoes">
                    <button type="button" class="alerta__btn alerta__btn--concluir" data-tipo="${tipoEscapado}">Concluir</button>
                    <button type="button" class="alerta__btn alerta__btn--adiar" data-tipo="${tipoEscapado}">Adiar</button>
                </div>

                <form class="alerta__form" data-tipo="${tipoEscapado}" style="display:none;">
                    <p class="alerta__form__titulo">Dados do serviço realizado</p>

                    <div class="alerta__form__campo">
                        <label>Data do serviço *</label>
                        <input type="date" class="alerta__form__input" name="data" required>
                    </div>

                    <div class="alerta__form__campo">
                        <label>KM</label>
                        <input type="number" class="alerta__form__input" name="km" value="${calcularKmAtualEstimado(veiculo, dataReferencia)}">
                    </div>

                    <div class="alerta__form__campo">
                        <label>Custo (R$)</label>
                        <input type="number" class="alerta__form__input" name="custo" step="0.01" placeholder="Ex.: 350,00">
                    </div>

                    <div class="alerta__form__campo">
                        <label>Observações</label>
                        <textarea class="alerta__form__input" name="descricao" rows="2" placeholder="Peças trocadas, oficina, marca do óleo..."></textarea>
                    </div>

                    <div class="alerta__form__campo">
                        <label>Nota fiscal (opcional)</label>
                        <input type="file" class="alerta__form__input" name="notaFiscal" accept="image/*,application/pdf">
                    </div>

                    <div class="alerta__form__acoes">
                        <button type="submit" class="alerta__btn alerta__btn--salvar">Salvar manutenção</button>
                        <button type="button" class="alerta__btn alerta__btn--cancelar">Cancelar</button>
                    </div>
                </form>

                <div class="alerta__adiar" style="display:none;">
                    <label class="alerta__adiar__label">Ocultar este alerta até:</label>
                    <input type="date" class="alerta__form__input alerta__adiar__data">
                    <div class="alerta__form__acoes">
                        <button type="button" class="alerta__btn alerta__btn--confirmar-adiar">Confirmar</button>
                        <button type="button" class="alerta__btn alerta__btn--cancelar-adiar">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Liga os botões Concluir: abre o formulário inline do card
    alertasLista.querySelectorAll('.alerta__btn--concluir').forEach(botao => {
        botao.addEventListener('click', () => {
            const card = botao.closest('.alerta__card');
            card.querySelector('.alerta__form').style.display = 'block';
            card.querySelector('.alerta__adiar').style.display = 'none';
            card.querySelector('.alerta__acoes').style.display = 'none';
        });
    });

    // Liga os botões Adiar: abre o seletor de data inline
    alertasLista.querySelectorAll('.alerta__btn--adiar').forEach(botao => {
        botao.addEventListener('click', () => {
            const card = botao.closest('.alerta__card');
            card.querySelector('.alerta__adiar').style.display = 'block';
            card.querySelector('.alerta__form').style.display = 'none';
            card.querySelector('.alerta__acoes').style.display = 'none';
        });
    });

    // Cancelar volta o card ao estado inicial
    alertasLista.querySelectorAll('.alerta__btn--cancelar, .alerta__btn--cancelar-adiar').forEach(botao => {
        botao.addEventListener('click', () => {
            const card = botao.closest('.alerta__card');
            card.querySelector('.alerta__form').style.display = 'none';
            card.querySelector('.alerta__adiar').style.display = 'none';
            card.querySelector('.alerta__acoes').style.display = 'flex';
        });
    });

    // Envio do formulário de conclusão
    alertasLista.querySelectorAll('.alerta__form').forEach(formulario => {
        formulario.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            const tipo = formulario.dataset.tipo;
            const dados = new FormData(formulario);
            const botaoSalvar = formulario.querySelector('.alerta__btn--salvar');

            if (!dados.get('data')) {
                alert('Informe a data do serviço.');
                return;
            }

            botaoSalvar.disabled = true;
            botaoSalvar.textContent = 'Salvando...';

            try {
                const arquivo = formulario.querySelector('input[name="notaFiscal"]').files[0];
                const notaFiscal = arquivo ? await arquivoParaBase64(arquivo) : null;

                await concluirManutencao(tipo, {
                    data: dados.get('data'),
                    km: dados.get('km') || null,
                    custo: dados.get('custo') || null,
                    descricao: dados.get('descricao') || '',
                    notaFiscal,
                    notaFiscalNome: arquivo ? arquivo.name : null
                });

                window.location.reload();
            } catch (erro) {
                alert(erro.message);
                botaoSalvar.disabled = false;
                botaoSalvar.textContent = 'Salvar manutenção';
            }
        });
    });

    // Confirmação do adiamento
    alertasLista.querySelectorAll('.alerta__btn--confirmar-adiar').forEach(botao => {
        botao.addEventListener('click', async () => {
            const card = botao.closest('.alerta__card');
            const tipo = card.dataset.tipo;
            const campoData = card.querySelector('.alerta__adiar__data');

            if (!campoData.value) {
                alert('Escolha até quando o alerta deve ficar oculto.');
                return;
            }

            botao.disabled = true;
            botao.textContent = 'Adiando...';

            try {
                await adiarNotificacao(tipo, campoData.value);
                window.location.reload();
            } catch (erro) {
                alert(erro.message);
                botao.disabled = false;
                botao.textContent = 'Confirmar';
            }
        });
    });
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
                    <a href="/api/vehicles/${veiculoId}/maintenance/${manutencao.id}/nota-fiscal" target="_blank" class="btn__nota">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                        Ver nota fiscal
                    </a>
                </div>
            `;
        }

        const intervalo = encontrarIntervalo(manutencao, veiculo);
        const proximaData = calcularProximaData(manutencao, intervalo);
        const proximoKm = calcularProximoKm(manutencao, intervalo);

        const proximaHTML = (proximaData || proximoKm) ? `
            <div class="manutencao__card__info__item">
                <span class="manutencao__card__info__label">Próxima:</span>
                ${proximaData ? formatarData(proximaData) : '—'}
                ${proximoKm ? ` / ${proximoKm.toLocaleString('pt-BR')} km` : ''}
            </div>
        ` : '';

        return `
            <div class="manutencao__card">
                <div class="manutencao__card__header">
                    <h3 class="manutencao__card__tipo">${manutencao.tipo}</h3>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        ${manutencao.custo ? `<span class="manutencao__card__custo">${formatarMoeda(manutencao.custo)}</span>` : ''}
                        <button class="btn__editar__manutencao" data-id="${manutencao.id}">Editar</button>
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
                    ${proximaHTML}
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

    manutencoesLista.querySelectorAll('.btn__editar__manutencao').forEach(botao => {
        botao.addEventListener('click', () => {
            window.location.href = `./manutencao-editar.html?veiculoId=${veiculoId}&manutencaoId=${botao.dataset.id}`;
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
            `Próxima revisão: <strong>${proxima.nome}</strong> aos ` +
            `<strong>${proxima.kmProximaManutencao.toLocaleString('pt-BR')} km</strong>. ` +
            `Faltam ` +
            `<strong>${proxima.kmRestantes.toLocaleString('pt-BR')} km</strong>` +
            `${mesesEstimados ? ` — aproximadamente ${mesesEstimados} meses no seu ritmo.` : '.'}`;
    }

    detalhes.textContent =
        `Última revisão: ${
            proxima.ultimaManutencao        
                ? `${proxima.nome} — KM ${Number(proxima.ultimaManutencao.km).toLocaleString('pt-BR')}`
                : 'nenhuma registrada'
        } • Intervalo: ${Number(proxima.intervaloKm).toLocaleString('pt-BR')} km`;
};
