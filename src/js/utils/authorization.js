// ============================================================
// ARQUIVO: utils/authorization.js
// DESCRIÇÃO: Funções reutilizáveis de autorização de vínculo
// ============================================================
// RESPONSABILIDADES:
//   - Verificar vínculo ATIVO entre usuário e mecânica
//   - Listar clientes ATIVOS de uma mecânica
//   - Listar mecânicas ATIVAS de um cliente
//   - Verificar acesso a veículos
//   - Verificar acesso a manutenções
// ============================================================
// REGRA CRÍTICA:
// Todas as funções retornam dados apenas se vínculo está ATIVO.
// ============================================================

import Vinculo, { ESTADOS_VINCULO } from '../models/Vinculo.js';
import Usuario from '../models/Usuario.js';
import Veiculo from '../models/Veiculo.js';
import { getBanco } from '../config/database.js';
import { ObjectId } from 'mongodb';

// ============================================================
// FUNÇÃO: verificarVinculoAtivo(usuarioId, mecanicaId)
// PROPÓSITO: Verifica se existe vínculo ATIVO entre usuário e mecânica
// PARÂMETROS:
//   - usuarioId: ObjectId ou string do usuário (cliente)
//   - mecanicaId: ObjectId ou string da mecânica
// RETORNA: Documento do vínculo se ATIVO, null caso contrário
// ============================================================
export async function verificarVinculoAtivo(usuarioId, mecanicaId) {
    try {
        const userIdObj = usuarioId instanceof ObjectId ? usuarioId : new ObjectId(usuarioId);
        const mechIdObj = mecanicaId instanceof ObjectId ? mecanicaId : new ObjectId(mecanicaId);

        const vinculo = await Vinculo.buscarAtivoEntre(userIdObj, mechIdObj);
        return vinculo || null;
    } catch (error) {
        console.error('Erro ao verificar vínculo ativo:', error);
        return null;
    }
}

// ============================================================
// FUNÇÃO: obterClientesAtivos(mecanicaId)
// PROPÓSITO: Lista clientes ATIVOS da mecânica com seus dados
// PARÂMETROS:
//   - mecanicaId: ObjectId ou string da mecânica
// RETORNA: Array de objetos { vinculo, cliente }
// IMPORTANTE: Retorna APENAS vínculos com status = "ATIVO"
// ============================================================
export async function obterClientesAtivos(mecanicaId) {
    try {
        const mechIdObj = mecanicaId instanceof ObjectId ? mecanicaId : new ObjectId(mecanicaId);

        // Buscar vínculos ATIVOS da mecânica
        const vinculos = await Vinculo.listarAtivosDaMecanica(mechIdObj);

        // Buscar dados dos clientes
        const clientesAtivos = [];
        for (const vinculo of vinculos) {
            const cliente = await Usuario.buscarPorId(vinculo.usuarioId);
            if (cliente) {
                clientesAtivos.push({
                    vinculo,
                    cliente: Usuario.sanitizar(cliente)
                });
            }
        }

        return clientesAtivos;
    } catch (error) {
        console.error('Erro ao obter clientes ativos:', error);
        return [];
    }
}

// ============================================================
// FUNÇÃO: obterMecanicasAtivas(usuarioId)
// PROPÓSITO: Lista mecânicas ATIVAS do cliente com seus dados
// PARÂMETROS:
//   - usuarioId: ObjectId ou string do usuário (cliente)
// RETORNA: Array de objetos { vinculo, mecanica }
// IMPORTANTE: Retorna APENAS vínculos com status = "ATIVO"
// ============================================================
export async function obterMecanicasAtivas(usuarioId) {
    try {
        const userIdObj = usuarioId instanceof ObjectId ? usuarioId : new ObjectId(usuarioId);

        // Buscar vínculos ATIVOS do usuário
        const vinculos = await Vinculo.listarAtivosDoUsuario(userIdObj);

        // Buscar dados das mecânicas
        const mecanicasAtivas = [];
        for (const vinculo of vinculos) {
            const mecanica = await Usuario.buscarPorId(vinculo.mecanicaId);
            if (mecanica) {
                mecanicasAtivas.push({
                    vinculo,
                    mecanica: Usuario.sanitizar(mecanica)
                });
            }
        }

        return mecanicasAtivas;
    } catch (error) {
        console.error('Erro ao obter mecânicas ativas:', error);
        return [];
    }
}

// ============================================================
// FUNÇÃO: verificarAcessoVeiculo(mechanicId, vehicleId)
// PROPÓSITO: Verifica se mecânica pode acessar veículo
// FLUXO:
//   1. Buscar veículo
//   2. Obter ownerId do veículo
//   3. Verificar vínculo ATIVO entre mecânica e proprietário
// PARÂMETROS:
//   - mechanicId: ObjectId ou string da mecânica
//   - vehicleId: ObjectId ou string do veículo
// RETORNA: true se acesso permitido, false caso contrário
// ============================================================
export async function verificarAcessoVeiculo(mechanicId, vehicleId) {
    try {
        const mechIdObj = mechanicId instanceof ObjectId ? mechanicId : new ObjectId(mechanicId);
        const vehicleIdObj = vehicleId instanceof ObjectId ? vehicleId : new ObjectId(vehicleId);

        // 1. Buscar veículo
        const veiculo = await Veiculo.buscarPorIdAdmin(vehicleIdObj);
        if (!veiculo) {
            return false;
        }

        // 2. Obter ownerId do veículo
        const ownerId = veiculo.ownerId;

        // 3. Verificar vínculo ATIVO
        const vinculo = await verificarVinculoAtivo(ownerId, mechIdObj);

        return !!vinculo;
    } catch (error) {
        console.error('Erro ao verificar acesso ao veículo:', error);
        return false;
    }
}

// ============================================================
// FUNÇÃO: verificarAcessoManutencao(mechanicId, vehicleId)
// PROPÓSITO: Verifica se mecânica pode acessar manutenção de um veículo
// FLUXO:
//   1. Buscar veículo
//   2. Obter ownerId do veículo
//   3. Verificar vínculo ATIVO entre mecânica e proprietário
// PARÂMETROS:
//   - mechanicId: ObjectId ou string da mecânica
//   - vehicleId: ObjectId ou string do veículo
// RETORNA: true se acesso permitido, false caso contrário
// NOTA: Manutenção pertence ao veículo, então verificamos acesso ao veículo
// ============================================================
export async function verificarAcessoManutencao(mechanicId, vehicleId) {
    try {
        // Usar a mesma lógica de acesso ao veículo
        return await verificarAcessoVeiculo(mechanicId, vehicleId);
    } catch (error) {
        console.error('Erro ao verificar acesso à manutenção:', error);
        return false;
    }
}

// ============================================================
// FUNÇÃO: obterVeiculosDoCliente(mechanicId, clientId)
// PROPÓSITO: Lista veículos de um cliente que a mecânica pode acessar
// FLUXO:
//   1. Verificar vínculo ATIVO entre mecânica e cliente
//   2. Se vínculo existe, buscar veículos do cliente
// PARÂMETROS:
//   - mechanicId: ObjectId ou string da mecânica
//   - clientId: ObjectId ou string do cliente
// RETORNA: Array de veículos do cliente, ou [] se sem acesso
// ============================================================
export async function obterVeiculosDoCliente(mechanicId, clientId) {
    try {
        const mechIdObj = mechanicId instanceof ObjectId ? mechanicId : new ObjectId(mechanicId);
        const clientIdObj = clientId instanceof ObjectId ? clientId : new ObjectId(clientId);

        // 1. Verificar vínculo ATIVO
        const vinculo = await verificarVinculoAtivo(clientIdObj, mechIdObj);
        if (!vinculo) {
            return [];
        }

        // 2. Buscar veículos do cliente
        const veiculos = await Veiculo.buscarTodosDoProprietario(clientIdObj);

        return veiculos || [];
    } catch (error) {
        console.error('Erro ao obter veículos do cliente:', error);
        return [];
    }
}

// ============================================================
// FUNÇÃO: obterVeiculosAcessiveisParaMecanica(mechanicId)
// PROPÓSITO: Lista TODOS os veículos que a mecânica pode acessar
// FLUXO:
//   1. Buscar todos os vínculos ATIVOS da mecânica
//   2. Para cada cliente, buscar seus veículos
//   3. Retornar lista consolidada
// PARÂMETROS:
//   - mechanicId: ObjectId ou string da mecânica
// RETORNA: Array de veículos acessíveis
// ============================================================
export async function obterVeiculosAcessiveisParaMecanica(mechanicId) {
    try {
        const mechIdObj = mechanicId instanceof ObjectId ? mechanicId : new ObjectId(mechanicId);

        // 1. Buscar clientes ATIVOS
        const clientesAtivos = await obterClientesAtivos(mechIdObj);

        // 2. Buscar veículos de cada cliente
        const veiculosAcessiveis = [];
        for (const { cliente } of clientesAtivos) {
            const veiculos = await Veiculo.buscarTodosDoProprietario(cliente._id);
            if (veiculos && veiculos.length > 0) {
                veiculosAcessiveis.push(...veiculos);
            }
        }

        return veiculosAcessiveis;
    } catch (error) {
        console.error('Erro ao obter veículos acessíveis:', error);
        return [];
    }
}

// ============================================================
// FUNÇÃO: obterManutencoesAcessiveisParaMecanica(mechanicId)
// PROPÓSITO: Lista TODAS as manutenções que a mecânica pode acessar
// FLUXO:
//   1. Buscar todos os veículos acessíveis
//   2. Para cada veículo, buscar suas manutenções
//   3. Retornar lista consolidada
// PARÂMETROS:
//   - mechanicId: ObjectId ou string da mecânica
// RETORNA: Array de manutenções acessíveis
// ============================================================
export async function obterManutencoesAcessiveisParaMecanica(mechanicId) {
    try {
        const mechIdObj = mechanicId instanceof ObjectId ? mechanicId : new ObjectId(mechanicId);

        // 1. Buscar veículos acessíveis
        const veiculosAcessiveis = await obterVeiculosAcessiveisParaMecanica(mechIdObj);

        // 2. Buscar manutenções de cada veículo
        const manutencoesAcessiveis = [];
        for (const veiculo of veiculosAcessiveis) {
            if (veiculo.manutencoes && veiculo.manutencoes.length > 0) {
                manutencoesAcessiveis.push(...veiculo.manutencoes);
            }
        }

        return manutencoesAcessiveis;
    } catch (error) {
        console.error('Erro ao obter manutenções acessíveis:', error);
        return [];
    }
}

// ============================================================
// FUNÇÃO: validarTransicaoStatus(statusAtual, novoStatus)
// PROPÓSITO: Valida se a transição de status é permitida
// TRANSIÇÕES PERMITIDAS:
//   - PENDENTE → ATIVO (aceitar)
//   - PENDENTE → RECUSADO (recusar)
//   - ATIVO → INATIVO (desativar)
//   - ATIVO → BLOQUEADO (bloquear - admin)
//   - BLOQUEADO → ATIVO (desbloquear - admin)
//   - RECUSADO → PENDENTE (reabrir - admin)
// PARÂMETROS:
//   - statusAtual: Status atual do vínculo
//   - novoStatus: Status desejado
// RETORNA: { valido: boolean, erro?: string }
// ============================================================
export function validarTransicaoStatus(statusAtual, novoStatus) {
    const transicoes = {
        [ESTADOS_VINCULO.PENDENTE]: [ESTADOS_VINCULO.ATIVO, ESTADOS_VINCULO.RECUSADO],
        [ESTADOS_VINCULO.ATIVO]: [ESTADOS_VINCULO.INATIVO, ESTADOS_VINCULO.BLOQUEADO],
        [ESTADOS_VINCULO.BLOQUEADO]: [ESTADOS_VINCULO.ATIVO],
        [ESTADOS_VINCULO.RECUSADO]: [ESTADOS_VINCULO.PENDENTE],
        [ESTADOS_VINCULO.INATIVO]: []
    };

    const transicoesPossiveis = transicoes[statusAtual] || [];

    if (!transicoesPossiveis.includes(novoStatus)) {
        return {
            valido: false,
            erro: `Transição de ${statusAtual} para ${novoStatus} não é permitida.`
        };
    }

    return { valido: true };
}

// ============================================================
// FUNÇÃO: obterStatusVinculo(usuarioId, mecanicaId)
// PROPÓSITO: Obtém o status do vínculo entre usuário e mecânica
// PARÂMETROS:
//   - usuarioId: ObjectId ou string do usuário
//   - mecanicaId: ObjectId ou string da mecânica
// RETORNA: Status do vínculo ou null se não existe
// ============================================================
export async function obterStatusVinculo(usuarioId, mecanicaId) {
    try {
        const userIdObj = usuarioId instanceof ObjectId ? usuarioId : new ObjectId(usuarioId);
        const mechIdObj = mecanicaId instanceof ObjectId ? mecanicaId : new ObjectId(mecanicaId);

        const vinculo = await Vinculo.buscarPorUsuarioEMecanica(userIdObj, mechIdObj);

        return vinculo ? vinculo.status : null;
    } catch (error) {
        console.error('Erro ao obter status do vínculo:', error);
        return null;
    }
}

export default {
    verificarVinculoAtivo,
    obterClientesAtivos,
    obterMecanicasAtivas,
    verificarAcessoVeiculo,
    verificarAcessoManutencao,
    obterVeiculosDoCliente,
    obterVeiculosAcessiveisParaMecanica,
    obterManutencoesAcessiveisParaMecanica,
    validarTransicaoStatus,
    obterStatusVinculo
};
