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

// Chave do localStorage
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
// FUNÇÃO: excluirVeiculo(id)
// ============================================================
// Remove veículo do array e re-renderiza a lista
function excluirVeiculo(id) {
    // Filtra removendo o veículo com o ID especificado
    const veiculos = getVeiculos().filter(function (veiculo) {
        return String(veiculo.id) !== String(id);
    });
    salvarVeiculos(veiculos);
    renderizarGaragem(); // Atualiza a UI
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
function renderizarAlertasResumo() {
    const veiculos = getVeiculos();
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
                    <div class="alerta__resumo__item" onclick="window.location.href='./veiculo-detalhes.html?id=${veiculo.id}'">
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
function renderizarGaragem() {
    const veiculos = getVeiculos();
    const garagemVazia = document.getElementById("garagemVazia");
    const listaVeiculos = document.getElementById("listaVeiculos");
    const dataReferencia = obterDataReferencia();

    // Validação: se elementos não existem no DOM, retorna
    if (!garagemVazia || !listaVeiculos) {
        return;
    }

    // Se não há veículos, exibe mensagem de garagem vazia
    if (veiculos.length === 0) {
        garagemVazia.style.display = "block";
        listaVeiculos.style.display = "none";
        renderizarAlertasResumo();
        return;
    }

    // Oculta mensagem de vazio e exibe grid de veículos
    garagemVazia.style.display = "none";
    listaVeiculos.style.display = "grid";

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

        return "<div class=\"veiculo__card\">" +
            "<div style=\"display: flex; justify-content: space-between; align-items: flex-start;\">" +
            "<h2 class=\"veiculo__card__titulo\">" + veiculo.apelido + "</h2>" +
            alertaBadge +
            "</div>" +
            "<p class=\"veiculo__card__info\">" + (veiculo.marca || "") + " " + (veiculo.modelo || "") + "</p>" +
            "<p class=\"veiculo__card__info\">Ano: " + (veiculo.ano || "-") + " | Placa: " + (veiculo.placa || "-") + "</p>" +
            "<p class=\"veiculo__card__info\">KM atual (Aproximadamente): " + calcularKmAtualEstimado(veiculo, dataReferencia) + "</p>" +
            "<p class=\"veiculo__card__info veiculo__card__manutencoes\">Manutenções: " + totalManutencoes + "</p>" +
            "<div class=\"veiculo__card__buttons\">" +
            "<button class=\"veiculo__card__button_detalhes\" data-id=\"" + veiculo.id + "\">Ver Detalhes</button>" +
            "<button class=\"veiculo__card__button_excluir\" data-id=\"" + veiculo.id + "\">Excluir</button>" +
            "</div>" +
            "</div>";
    }).join("");

    // excluir veiculo do array (notificacao)
    listaVeiculos.querySelectorAll(".veiculo__card__button_excluir").forEach(function (botao) {
        botao.addEventListener("click", function () {
            const confirmar = window.confirm("Tem certeza que deseja excluir este veículo?");
            if (confirmar) {
                excluirVeiculo(botao.dataset.id);
            }
        });
    });

    listaVeiculos.querySelectorAll(".veiculo__card__button_detalhes").forEach(function (botao) {
        botao.addEventListener("click", function () {
            window.location.href = "./veiculo-detalhes.html?id=" + botao.dataset.id;
        });
    });

    renderizarAlertasResumo();
}

renderizarGaragem();
