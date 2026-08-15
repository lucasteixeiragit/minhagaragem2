// ============================================================
// ARQUIVO: middleware/vinculos.js
// DESCRIÇÃO: Middlewares de autorização de vínculo entre cliente e mecânica
// ============================================================
// RESPONSABILIDADES:
//   - Verificar se mecânica tem vínculo ATIVO com cliente
//   - Verificar se mecânica pode acessar veículo (via vínculo)
//   - Middleware requireActiveClientLink para proteção de rotas
// ============================================================
// REGRA CRÍTICA DE SEGURANÇA:
// Somente vínculos com status = "ATIVO" concedem acesso.
// Nunca confiar apenas em role = MECANICA.
// ============================================================

import Vinculo from '../models/Vinculo.js';
import Veiculo from '../models/Veiculo.js';
import { ObjectId } from 'mongodb';

// ============================================================
// FUNÇÃO: canMechanicAccessClient(mechanicId, clientId)
// PROPÓSITO: Verifica se mecânica tem vínculo ATIVO com cliente
// PARÂMETROS:
//   - mechanicId: ObjectId ou string da mecânica
//   - clientId: ObjectId ou string do cliente
// RETORNA: true se vínculo ATIVO existe, false caso contrário
// USADO EM: Autorização de acesso a clientes
// ============================================================
export async function canMechanicAccessClient(mechanicId, clientId) {
    try {
        // Converter para ObjectId se necessário
        const mechIdObj = mechanicId instanceof ObjectId ? mechanicId : new ObjectId(mechanicId);
        const clientIdObj = clientId instanceof ObjectId ? clientId : new ObjectId(clientId);

        // Buscar vínculo ATIVO entre mecânica e cliente
        const vinculo = await Vinculo.buscarAtivoEntre(clientIdObj, mechIdObj);

        return !!vinculo;
    } catch (error) {
        console.error('Erro ao verificar acesso do cliente:', error);
        return false;
    }
}

// ============================================================
// FUNÇÃO: canMechanicAccessVehicle(mechanicId, vehicleId)
// PROPÓSITO: Verifica se mecânica pode acessar veículo
// FLUXO:
//   1. Buscar veículo
//   2. Obter ownerId do veículo
//   3. Verificar se existe vínculo ATIVO entre mecânica e proprietário
// PARÂMETROS:
//   - mechanicId: ObjectId ou string da mecânica
//   - vehicleId: ObjectId ou string do veículo
// RETORNA: true se acesso permitido, false caso contrário
// USADO EM: Autorização de acesso a veículos
// ============================================================
export async function canMechanicAccessVehicle(mechanicId, vehicleId) {
    try {
        // Converter para ObjectId se necessário
        const mechIdObj = mechanicId instanceof ObjectId ? mechanicId : new ObjectId(mechanicId);
        const vehicleIdObj = vehicleId instanceof ObjectId ? vehicleId : new ObjectId(vehicleId);

        // 1. Buscar veículo
        const veiculo = await Veiculo.buscarPorIdAdmin(vehicleIdObj);
        if (!veiculo) {
            return false;
        }

        // 2. Obter ownerId do veículo
        const ownerId = veiculo.ownerId;

        // 3. Verificar vínculo ATIVO entre mecânica e proprietário
        const vinculo = await Vinculo.buscarAtivoEntre(ownerId, mechIdObj);

        return !!vinculo;
    } catch (error) {
        console.error('Erro ao verificar acesso ao veículo:', error);
        return false;
    }
}

// ============================================================
// FUNÇÃO: verificarVinculoAtivo(usuarioId, mecanicaId)
// PROPÓSITO: Verifica se existe vínculo ATIVO entre usuário e mecânica
// PARÂMETROS:
//   - usuarioId: ObjectId ou string do usuário (cliente)
//   - mecanicaId: ObjectId ou string da mecânica
// RETORNA: Documento do vínculo se ATIVO, null caso contrário
// USADO EM: Validações de autorização
// ============================================================
export async function verificarVinculoAtivo(usuarioId, mecanicaId) {
    try {
        // Converter para ObjectId se necessário
        const userIdObj = usuarioId instanceof ObjectId ? usuarioId : new ObjectId(usuarioId);
        const mechIdObj = mecanicaId instanceof ObjectId ? mecanicaId : new ObjectId(mecanicaId);

        // Buscar vínculo ATIVO
        const vinculo = await Vinculo.buscarAtivoEntre(userIdObj, mechIdObj);

        return vinculo || null;
    } catch (error) {
        console.error('Erro ao verificar vínculo ativo:', error);
        return null;
    }
}

// ============================================================
// MIDDLEWARE: requireActiveClientLink
// PROPÓSITO: Middleware que verifica vínculo ATIVO entre cliente e mecânica
// USO: router.get('/:clientId/veiculos', requireAuth, requireRole('MECANICA'), requireActiveClientLink, handler)
// PARÂMETROS NA ROTA:
//   - req.params.clientId: ID do cliente a ser acessado
//   - req.user._id: ID da mecânica autenticada (vem de requireAuth)
// COMPORTAMENTO:
//   - Se vínculo ATIVO existe: continua (next())
//   - Se vínculo não existe ou não está ATIVO: retorna 403 Forbidden
// RETORNA: 403 se acesso negado, ou chama next() se permitido
// ============================================================
export async function requireActiveClientLink(req, res, next) {
    try {
        // Verificar se req.user existe (requireAuth deve ter sido executado)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Não autenticado.'
            });
        }

        // Obter clientId dos parâmetros da rota
        const clientId = req.params.clientId;
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'ID do cliente não fornecido.'
            });
        }

        // Verificar se é mecânica
        if (req.user.role !== 'MECANICA' && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Apenas mecânicas podem acessar clientes.'
            });
        }

        // Verificar vínculo ATIVO
        const mecanicaId = req.user._id;
        const vinculo = await verificarVinculoAtivo(clientId, mecanicaId);

        if (!vinculo) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem acesso a este cliente. Vínculo não ativo.'
            });
        }

        // Anexar vínculo ao request para uso posterior
        req.vinculo = vinculo;

        next();
    } catch (error) {
        console.error('Erro no middleware de vínculo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao verificar vínculo.'
        });
    }
}

// ============================================================
// MIDDLEWARE: requireActiveVehicleAccess
// PROPÓSITO: Middleware que verifica se mecânica pode acessar veículo
// USO: router.get('/vehicles/:vehicleId', requireAuth, requireRole('MECANICA'), requireActiveVehicleAccess, handler)
// PARÂMETROS NA ROTA:
//   - req.params.vehicleId: ID do veículo a ser acessado
//   - req.user._id: ID da mecânica autenticada (vem de requireAuth)
// COMPORTAMENTO:
//   - Se mecânica tem vínculo ATIVO com proprietário: continua (next())
//   - Caso contrário: retorna 403 Forbidden
// RETORNA: 403 se acesso negado, ou chama next() se permitido
// ============================================================
export async function requireActiveVehicleAccess(req, res, next) {
    try {
        // Verificar se req.user existe (requireAuth deve ter sido executado)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Não autenticado.'
            });
        }

        // Obter vehicleId dos parâmetros da rota
        const vehicleId = req.params.vehicleId || req.params.id;
        if (!vehicleId) {
            return res.status(400).json({
                success: false,
                message: 'ID do veículo não fornecido.'
            });
        }

        // Verificar se é mecânica
        if (req.user.role !== 'MECANICA' && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Apenas mecânicas podem acessar veículos de clientes.'
            });
        }

        // Verificar acesso ao veículo
        const mecanicaId = req.user._id;
        const temAcesso = await canMechanicAccessVehicle(mecanicaId, vehicleId);

        if (!temAcesso) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem acesso a este veículo.'
            });
        }

        next();
    } catch (error) {
        console.error('Erro no middleware de acesso ao veículo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao verificar acesso ao veículo.'
        });
    }
}

export default {
    canMechanicAccessClient,
    canMechanicAccessVehicle,
    verificarVinculoAtivo,
    requireActiveClientLink,
    requireActiveVehicleAccess
};
