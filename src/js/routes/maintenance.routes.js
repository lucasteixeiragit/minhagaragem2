// ============================================================
// ARQUIVO: routes/maintenance.routes.js
// DESCRIÇÃO: Rotas de manutenções com controle de propriedade
// ============================================================
// PREFIXO: /api/vehicles/:id/maintenance
// SEGURANÇA: todas as operações filtram por ownerId (req.user)
// ============================================================

import express from 'express';
import Veiculo from '../models/Veiculo.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import { requireActiveVehicleAccess } from '../middleware/vinculos.js';
import { registrarAuditoria } from '../utils/audit.js';

const router = express.Router({ mergeParams: true });

// ============================================================
// CAMPOS PERMITIDOS de uma manutenção
// ============================================================
const CAMPOS_MANUTENCAO = ['data', 'km', 'tipo', 'custo', 'descricao', 'notaFiscal', 'notaFiscalNome'];

function extrairCamposManutencao(body) {
    const dados = {};
    CAMPOS_MANUTENCAO.forEach(campo => {
        if (body[campo] !== undefined) {
            dados[campo] = body[campo];
        }
    });
    return dados;
}

// ============================================================
// POST /api/vehicles/:id/maintenance
// PROPÓSITO: Adiciona manutenção a um veículo do usuário
// SEGURANÇA:
//   - Se USER: adiciona manutenção ao seu próprio veículo
//   - Se MECANICA: verifica vínculo ATIVO com proprietário do veículo
//   - Whitelist de campos no body
// ============================================================
router.post('/', requireAuth, async (req, res) => {
    try {
        const dados = extrairCamposManutencao(req.body);

        if (!dados.data || !dados.tipo) {
            return res.status(400).json({ success: false, message: 'Data e tipo são obrigatórios.' });
        }

        // Se é mecânica, verificar vínculo ATIVO
        if (req.user.role === 'MECANICA') {
            // Buscar veículo para obter ownerId
            const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
            if (!veiculo) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }

            // Verificar vínculo ATIVO entre mecânica e proprietário
            const { verificarVinculoAtivo } = await import('../utils/authorization.js');
            const vinculo = await verificarVinculoAtivo(veiculo.ownerId, req.user._id);
            if (!vinculo) {
                return res.status(403).json({ success: false, message: 'Você não tem acesso a este veículo.' });
            }

            // Adicionar manutenção com ownerId do proprietário
            const resultado = await Veiculo.adicionarManutencaoDoProprietario(req.params.id, veiculo.ownerId, dados);

            if (resultado.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
        } else {
            // Se é USER, adiciona ao seu próprio veículo
            const resultado = await Veiculo.adicionarManutencaoDoProprietario(req.params.id, req.user._id, dados);

            if (resultado.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
        }

        await registrarAuditoria({
            userId: req.user._id,
            action: 'CREATE_MAINTENANCE',
            resource: 'veiculo',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(201).json({ success: true, message: 'Manutenção adicionada.' });
    } catch (error) {
        console.error('Erro ao adicionar manutenção:', error);
        res.status(500).json({ success: false, message: 'Erro ao adicionar manutenção.' });
    }
});

// ============================================================
// DELETE /api/vehicles/:id/maintenance/:manutencaoId
// PROPÓSITO: Remove uma manutenção de um veículo do usuário
// ============================================================
router.delete('/:manutencaoId', requireAuth, async (req, res) => {
    try {
        const resultado = await Veiculo.excluirManutencaoDoProprietario(
            req.params.id,
            req.user._id,
            req.params.manutencaoId
        );

        if (resultado.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
        }

        await registrarAuditoria({
            userId: req.user._id,
            action: 'DELETE_MAINTENANCE',
            resource: 'veiculo',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, message: 'Manutenção excluída.' });
    } catch (error) {
        console.error('Erro ao excluir manutenção:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir manutenção.' });
    }
});

// ============================================================
// PATCH /api/vehicles/:id/maintenance/km
// PROPÓSITO: Atualiza a quilometragem atual do veículo
// BODY: { kmAtual, dataLeitura }
// ============================================================
router.patch('/km', requireAuth, async (req, res) => {
    try {
        const { kmAtual, dataLeitura } = req.body || {};

        if (kmAtual === undefined) {
            return res.status(400).json({ success: false, message: 'Informe o kmAtual.' });
        }

        const resultado = await Veiculo.atualizarKmDoProprietario(
            req.params.id,
            req.user._id,
            kmAtual,
            dataLeitura || null
        );

        if (resultado.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
        }

        res.json({ success: true, message: 'KM atualizado.' });
    } catch (error) {
        console.error('Erro ao atualizar KM:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar KM.' });
    }
});

export default router;
