// ============================================================
// ARQUIVO: routes/vehicle.routes.js
// DESCRIÇÃO: Rotas de veículos com controle de propriedade
// ============================================================
// PREFIXO: /api/vehicles
// SEGURANÇA:
//   - Todas as rotas exigem autenticação (requireAuth)
//   - ownerId é SEMPRE derivado de req.user (nunca do body/URL)
//   - Consultas filtram por ownerId → proteção contra IDOR
//   - Whitelist de campos no create/update → proteção contra mass assignment
// ============================================================

import express from 'express';
import Veiculo from '../models/Veiculo.js';
import { requireAuth } from '../middleware/auth.js';
import { registrarAuditoria } from '../utils/audit.js';
import { verificarVinculoAtivo, obterVeiculosAcessiveisParaMecanica } from '../utils/authorization.js';

const router = express.Router();

// ============================================================
// CAMPOS PERMITIDOS (whitelist)
// ============================================================
// Apenas estes campos podem ser gravados. Qualquer outro campo
// enviado no body (ex: ownerId, role, _id) é ignorado.
// ============================================================
const CAMPOS_VEICULO = [
    'apelido', 'marca', 'modelo', 'versao', 'ano', 'cambio',
    'placa', 'kmAtual', 'dataLeitura', 'kmMensal',
    'intervalosManutencoesPreventivas'
];

// Extrai apenas os campos permitidos do body
function extrairCamposVeiculo(body) {
    const dados = {};
    CAMPOS_VEICULO.forEach(campo => {
        if (body[campo] !== undefined) {
            dados[campo] = body[campo];
        }
    });
    return dados;
}

// ============================================================
// GET /api/vehicles
// PROPÓSITO: Lista os veículos acessíveis ao usuário autenticado
// REGRAS DE ACESSO (Fase 5 - Vínculos):
//   - USER: apenas os próprios veículos (ownerId)
//   - MECANICA: veículos de clientes com vínculo ATIVO com ela
//   - ADMIN: todos os veículos
// ============================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        let veiculos;

        if (req.user.role === 'ADMIN') {
            veiculos = await Veiculo.listarTodosAdmin();
        } else if (req.user.role === 'MECANICA') {
            veiculos = await obterVeiculosAcessiveisParaMecanica(req.user._id);
        } else {
            veiculos = await Veiculo.buscarTodosDoProprietario(req.user._id);
        }

        res.json({ success: true, veiculos });
    } catch (error) {
        console.error('Erro ao listar veículos:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar veículos.' });
    }
});

// ============================================================
// GET /api/vehicles/:id
// PROPÓSITO: Retorna um veículo específico
// REGRAS DE ACESSO (Fase 5 - Vínculos):
//   - USER dono: acesso total ao próprio veículo
//   - MECANICA: apenas se houver vínculo ATIVO com o proprietário
//     (sem vínculo ativo = 403, sem vazar se o veículo existe)
//   - ADMIN: acesso total
// ============================================================
router.get('/:id', requireAuth, async (req, res) => {
    try {
        if (req.user.role === 'ADMIN') {
            const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
            if (!veiculo) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
            return res.json({ success: true, veiculo });
        }

        if (req.user.role === 'MECANICA') {
            const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
            const vinculo = veiculo ? await verificarVinculoAtivo(veiculo.ownerId, req.user._id) : null;
            if (!vinculo) {
                return res.status(403).json({ success: false, message: 'Você não tem acesso a este veículo.' });
            }
            return res.json({ success: true, veiculo });
        }

        // USER: apenas o próprio veículo (proteção contra IDOR)
        const veiculo = await Veiculo.buscarPorIdEProprietario(req.params.id, req.user._id);
        if (!veiculo) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
        }
        res.json({ success: true, veiculo });
    } catch (error) {
        console.error('Erro ao buscar veículo:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar veículo.' });
    }
});

// ============================================================
// POST /api/vehicles
// PROPÓSITO: Cria um veículo vinculado ao usuário autenticado
// ============================================================
router.post('/', requireAuth, async (req, res) => {
    try {
        const dados = extrairCamposVeiculo(req.body);

        // Validação mínima
        if (!dados.apelido || !dados.marca || !dados.modelo) {
            return res.status(400).json({ success: false, message: 'Apelido, marca e modelo são obrigatórios.' });
        }

        // ownerId vem do usuário autenticado, nunca do body
        const resultado = await Veiculo.criarDoProprietario(dados, req.user._id);

        await registrarAuditoria({
            userId: req.user._id,
            action: 'CREATE_VEHICLE',
            resource: 'veiculo',
            resourceId: resultado.insertedId,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(201).json({ success: true, message: 'Veículo criado.', id: resultado.insertedId });
    } catch (error) {
        console.error('Erro ao criar veículo:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar veículo.' });
    }
});

// ============================================================
// PUT /api/vehicles/:id
// PROPÓSITO: Atualiza um veículo
// REGRAS DE ACESSO (Fase 5 - Vínculos):
//   - USER dono: pode atualizar o próprio veículo
//   - MECANICA: pode atualizar apenas se houver vínculo ATIVO com o proprietário
//   - ADMIN: pode atualizar qualquer veículo
// ============================================================
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const dados = extrairCamposVeiculo(req.body);

        if (req.user.role === 'ADMIN') {
            const resultado = await Veiculo.atualizar(req.params.id, dados);
            if (resultado.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
        } else if (req.user.role === 'MECANICA') {
            const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
            const vinculo = veiculo ? await verificarVinculoAtivo(veiculo.ownerId, req.user._id) : null;
            if (!vinculo) {
                return res.status(403).json({ success: false, message: 'Você não tem acesso a este veículo.' });
            }
            await Veiculo.atualizar(req.params.id, dados);
        } else {
            const resultado = await Veiculo.atualizarDoProprietario(req.params.id, req.user._id, dados);
            if (resultado.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
        }

        await registrarAuditoria({
            userId: req.user._id,
            action: 'UPDATE_VEHICLE',
            resource: 'veiculo',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, message: 'Veículo atualizado.' });
    } catch (error) {
        console.error('Erro ao atualizar veículo:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar veículo.' });
    }
});

// ============================================================
// DELETE /api/vehicles/:id
// PROPÓSITO: Exclui um veículo
// REGRAS DE ACESSO (Fase 5 - Vínculos):
//   - USER dono: pode excluir o próprio veículo
//   - ADMIN: pode excluir qualquer veículo
//   - MECANICA: não tem permissão de exclusão (fora do escopo do vínculo)
// ============================================================
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        if (req.user.role === 'MECANICA') {
            return res.status(403).json({ success: false, message: 'Mecânicas não podem excluir veículos.' });
        }

        let deletedCount;
        if (req.user.role === 'ADMIN') {
            const resultado = await Veiculo.excluir(req.params.id);
            deletedCount = resultado.deletedCount;
        } else {
            const resultado = await Veiculo.excluirDoProprietario(req.params.id, req.user._id);
            deletedCount = resultado.deletedCount;
        }

        if (deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
        }

        await registrarAuditoria({
            userId: req.user._id,
            action: 'DELETE_VEHICLE',
            resource: 'veiculo',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, message: 'Veículo excluído.' });
    } catch (error) {
        console.error('Erro ao excluir veículo:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir veículo.' });
    }
});

export default router;
