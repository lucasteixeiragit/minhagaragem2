// ============================================================
// ARQUIVO: main.js (FRONTEND)
// DESCRIÇÃO: Página inicial - Lista de veículos na garagem
// ============================================================
// PÁGINA HTML: index.html
// RESPONSABILIDADES:
//   - Renderizar lista de veículos cadastrados
//   - Exibir badges de alertas (manutenções pendentes)
//   - Resumo de alertas no topo da página
//   - Botões de ação (Ver Detalhes, Excluir)
// ============================================================

// Importa função de cálculo de próximas manutenções
import { calcularKmAtualEstimado, calcularProximasManutencoes } from './manutencao-utils.js';

// ============================================================
// FUNÇÕES DE ACESSO À API
// ============================================================

// Cache em memória dos veículos (evita múltiplas requisições)
let veiculosCache = null;

// Busca veículos do usuário autenticado na API
async function getVeiculos() {
    if (veiculosCache) return veiculosCache;

    try {
        const res = await fetch('/api/vehicles');
        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/login.html';
                return [];
            }
            throw new Error('Falha ao carregar veículos');
        }
        const data = await res.json();
        veiculosCache = data.veiculos || [];
        return veiculosCache;
    } catch (e) {
        console.error('Erro ao carregar veículos:', e);
        return [];
    }
}

// Exclui veículo via API
async function excluirVeiculo(id) {
    try {
        const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json();
            alert(data.message || 'Erro ao excluir veículo.');
            return;
        }
        veiculosCache = null; // Invalida cache
        renderizarGaragem();
    } catch (e) {
        console.error('Erro ao excluir veículo:', e);
        alert('Erro de conexão ao excluir veículo.');
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

// ============================================================
// BOTÃO "ADICIONAR VEÍCULO"
// ============================================================
// Redireciona para página de cadastro de novo veículo
const btnAddVeiculo = document.getElementById("btnAddVeiculo");
if (btnAddVeiculo) {
    btnAddVeiculo.addEventListener("click", () => {
        window.location.href = "./veiculo-novo.html";
    });
}

// ============================================================
// FUNÇÃO: renderizarAlertasResumo()
// ============================================================
// Exibe seção de resumo de alertas no topo da página
// Mostra quantas manutenções pendentes cada veículo tem
async function renderizarAlertasResumo() {
    const veiculos = await getVeiculos();
    const alertasResumo = document.getElementById('alertasResumo');
    const dataReferencia = obterDataReferencia();

    // Se não há veículos, oculta seção de alertas
    if (!veiculos || veiculos.length === 0) {
        alertasResumo.style.display = 'none';
        return;
    }

    // Array para armazenar veículos que têm alertas (status != 'ok')
    const veiculosComAlertas = [];

    // Itera sobre cada veículo e calcula próximas manutenções
    veiculos.forEach(veiculo => {
        if (!veiculo.intervalosManutencoesPreventivas) return;
        
        // Calcula próximas manutenções (usando manutencao-utils.js)
        const proximasManutencoes = calcularProximasManutencoes(veiculo, dataReferencia);
        
        // Filtra apenas alertas (status: atrasada, urgente, alerta)
        const alertas = proximasManutencoes.filter(m => m.status !== 'ok');
        
        // Se tem alertas, adiciona ao array
        if (alertas.length > 0) {
            veiculosComAlertas.push({
                veiculo,
                alertas
            });
        }
    });

    if (veiculosComAlertas.length === 0) {
        alertasResumo.style.display = 'none';
        return;
    }

    alertasResumo.style.display = 'block';

    const totalAlertas = veiculosComAlertas.reduce((sum, v) => sum + v.alertas.length, 0);

    alertasResumo.innerHTML = `
        <h2 class="alertas__resumo__titulo">⚠️ ${totalAlertas} Manutenção${totalAlertas > 1 ? 'ões' : ''} Pendente${totalAlertas > 1 ? 's' : ''}</h2>
        <div class="alertas__resumo__lista">
            ${veiculosComAlertas.map(({ veiculo, alertas }) => {
                const alertasAtrasadas = alertas.filter(a => a.status === 'atrasada').length;
                const alertasUrgentes = alertas.filter(a => a.status === 'urgente').length;
                
                let mensagem = '';
                if (alertasAtrasadas > 0) {
                    mensagem = `${alertasAtrasadas} atrasada${alertasAtrasadas > 1 ? 's' : ''}`;
                } else if (alertasUrgentes > 0) {
                    mensagem = `${alertasUrgentes} urgente${alertasUrgentes > 1 ? 's' : ''}`;
                } else {
                    mensagem = `${alertas.length} em breve`;
                }

                return `
                    <div class="alerta__resumo__item" onclick="window.location.href='./veiculo-detalhes.html?id=${veiculo._id}'">
                        <span class="alerta__resumo__veiculo">${veiculo.apelido}</span> — ${mensagem}
                        <span class="alerta__resumo__contador">${alertas.length}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ============================================================
// FUNÇÃO: renderizarGaragem()
// ============================================================
// Renderiza lista de veículos em cards na home
// Exibe badges de alertas em cada card
async function renderizarGaragem() {
    const veiculos = await getVeiculos();
    const garagemVazia = document.getElementById("garagemVazia");
    const listaVeiculos = document.getElementById("listaVeiculos");
    const dataReferencia = obterDataReferencia();
    const garagemCabecalho = document.getElementById("garagemCabecalho");
    const contadorVeiculos = document.getElementById("contadorVeiculos");

    // Validação: se elementos não existem no DOM, retorna
    if (!garagemVazia || !listaVeiculos) {
        return;
    }

    // Se não há veículos, exibe mensagem de garagem vazia
    if (veiculos.length === 0) {
        garagemVazia.style.display = "block";
        listaVeiculos.style.display = "none";

        if(garagemCabecalho){
            garagemCabecalho.style.display = "none";
        }

        renderizarAlertasResumo();
        return;
    }

    // Oculta mensagem de vazio e exibe grid de veículos
    garagemVazia.style.display = "none";
    listaVeiculos.style.display = "grid";

    // Se há veiculos cadastrados, habilita o cabecalho de garagem
    if (garagemCabecalho) {
        garagemCabecalho.style.display = "flex";
    }

    // Se há veiculos cadastrados, mostra a quantidade de veiculos
    if (contadorVeiculos){
        const quantidade = veiculos.length;
        const textoVeiculos = quantidade === 1 ? "veículo" : "veículos";

        contadorVeiculos.textContent = `${quantidade} ${textoVeiculos} sob controle`;
    }

    // Renderiza cada veículo como um card HTML
    listaVeiculos.innerHTML = veiculos.map(function (veiculo) {
        // Conta quantas manutenções já foram feitas
        const totalManutencoes = veiculo.manutencoes ? veiculo.manutencoes.length : 0;
        
        // Calcula badge de alerta (número de manutenções pendentes)
        let alertaBadge = '';
        if (veiculo.intervalosManutencoesPreventivas && Object.keys(veiculo.intervalosManutencoesPreventivas).length > 0) {
            const proximasManutencoes = calcularProximasManutencoes(veiculo, dataReferencia);
            const alertas = proximasManutencoes.filter(m => m.status !== 'ok');
            
            if (alertas.length > 0) {
                // Conta quantas estão atrasadas/urgentes para definir cor
                const atrasadas = alertas.filter(a => a.status === 'atrasada').length;
                const urgentes = alertas.filter(a => a.status === 'urgente').length;
                
                // Define cor do badge baseado na urgência
                let corBadge = 'oklch(0.65 0.20 80)';  // Amarelo (padrão)
                let textoBadge = alertas.length;
                
                if (atrasadas > 0) {
                    corBadge = 'oklch(0.55 0.15 25)';  // Vermelho (atrasadas)
                } else if (urgentes > 0) {
                    corBadge = 'oklch(0.62 0.22 25)';  // Laranja (urgentes)
                }
                
                // Cria HTML do badge
                alertaBadge = `<span class="veiculo__card__badge" style="background: ${corBadge};">${textoBadge}</span>`;
            }
        }

        return `
            <div class="veiculo__card" data-id="${veiculo._id}" tabindex="0" role="link">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h2 class="veiculo__card__titulo">${veiculo.apelido}</h2>
                    ${alertaBadge}
                </div>
                <p class="veiculo__card__info">${veiculo.marca || ''} ${veiculo.modelo || ''}</p>
                <p class="veiculo__card__info">
                    Ano: ${veiculo.ano || '-'} | Placa: ${veiculo.placa || '-'}
                </p>
                <div class="veiculo__card__km">
                    <span class="veiculo__card__km__label">KM ESTIMADO</span>
                    <strong class="veiculo__card__km__valor">
                        ${calcularKmAtualEstimado(veiculo, dataReferencia)} KM
                    </strong>
                </div>
                <p class="veiculo__card__manutencoes">
                    Manutenções: ${totalManutencoes}
                </p>
            </div>
        `;
    }).join("");

    // // excluir veiculo do array (notificacao)
    // listaVeiculos.querySelectorAll(".veiculo__card__button_excluir").forEach(function (botao) {
    //     botao.addEventListener("click", function () {
    //         const confirmar = window.confirm("Tem certeza que deseja excluir este veículo?");
    //         if (confirmar) {
    //             excluirVeiculo(botao.dataset.id);
    //         }
    //     });
    // });

    listaVeiculos.querySelectorAll(".veiculo__card").forEach(function (card) {
        const abrirDetalhes = () => {
            window.location.href = "./veiculo-detalhes.html?id=" + card.dataset.id;
        };

        card.addEventListener("click", abrirDetalhes);

        card.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") { // tecla enter ou espaco
                event.preventDefault();
                abrirDetalhes();
            }
        });

    });

    // listaVeiculos.querySelectorAll(".veiculo__card__button_detalhes").forEach(function (botao) {
    //     botao.addEventListener("click", function () {
    //         window.location.href = "./veiculo-detalhes.html?id=" + botao.dataset.id;
    //     });
    // });

    renderizarAlertasResumo();
}

renderizarGaragem();
