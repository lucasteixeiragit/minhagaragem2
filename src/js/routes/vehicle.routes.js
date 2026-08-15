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
// PROPÓSITO: Lista os veículos do usuário autenticado
// ============================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const veiculos = await Veiculo.buscarTodosDoProprietario(req.user._id);
        res.json({ success: true, veiculos });
    } catch (error) {
        console.error('Erro ao listar veículos:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar veículos.' });
    }
});

// ============================================================
// GET /api/vehicles/:id
// PROPÓSITO: Retorna um veículo do usuário autenticado
// ============================================================
router.get('/:id', requireAuth, async (req, res) => {
    try {
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
// PROPÓSITO: Atualiza um veículo do usuário autenticado
// ============================================================
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const dados = extrairCamposVeiculo(req.body);

        const resultado = await Veiculo.atualizarDoProprietario(req.params.id, req.user._id, dados);

        if (resultado.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
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
// PROPÓSITO: Exclui um veículo do usuário autenticado
// ============================================================
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const resultado = await Veiculo.excluirDoProprietario(req.params.id, req.user._id);

        if (resultado.deletedCount === 0) {
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
