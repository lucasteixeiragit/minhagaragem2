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
import { registrarAuditoria } from '../utils/audit.js';
import { verificarAcessoManutencao, verificarAcessoVeiculo } from '../utils/authorization.js';

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
// PROPÓSITO: Adiciona manutenção a um veículo
// REGRAS DE ACESSO (Fase 6 - Vínculos):
//   - USER dono: adiciona manutenção ao seu próprio veículo
//   - MECANICA: apenas se houver vínculo ATIVO com o proprietário do veículo
//   - ADMIN: acesso total
//   - Whitelist de campos no body
// ============================================================
router.post('/', requireAuth, async (req, res) => {
    try {
        const dados = extrairCamposManutencao(req.body);

        if (!dados.data || !dados.tipo) {
            return res.status(400).json({ success: false, message: 'Data e tipo são obrigatórios.' });
        }

        let ownerId;

        if (req.user.role === 'ADMIN') {
            const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
            if (!veiculo) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
            ownerId = veiculo.ownerId;
        } else if (req.user.role === 'MECANICA') {
            // Verifica vínculo ATIVO entre a mecânica e o proprietário do veículo
            const temAcesso = await verificarAcessoManutencao(req.user._id, req.params.id);
            if (!temAcesso) {
                return res.status(403).json({ success: false, message: 'Você não tem acesso a este veículo.' });
            }
            const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
            ownerId = veiculo.ownerId;
        } else {
            // USER: adiciona ao seu próprio veículo
            ownerId = req.user._id;
        }

        const resultado = await Veiculo.adicionarManutencaoDoProprietario(req.params.id, ownerId, dados);

        if (resultado.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
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
// PROPÓSITO: Remove uma manutenção de um veículo
// REGRAS DE ACESSO (Fase 6 - Vínculos):
//   - USER dono: pode excluir manutenção do seu próprio veículo
//   - MECANICA: apenas se houver vínculo ATIVO com o proprietário do veículo
//   - ADMIN: acesso total
// ============================================================
router.delete('/:manutencaoId', requireAuth, async (req, res) => {
    try {
        if (req.user.role === 'ADMIN') {
            const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
            if (!veiculo) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
        } else if (req.user.role === 'MECANICA') {
            const temAcesso = await verificarAcessoManutencao(req.user._id, req.params.id);
            if (!temAcesso) {
                return res.status(403).json({ success: false, message: 'Você não tem acesso a este veículo.' });
            }
        } else {
            const veiculo = await Veiculo.buscarPorIdEProprietario(req.params.id, req.user._id);
            if (!veiculo) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
        }

        const resultado = await Veiculo.excluirManutencao(req.params.id, req.params.manutencaoId);

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
// PUT /api/vehicles/:id/maintenance/:manutencaoId
// PROPÓSITO: Atualiza uma manutenção específica do veículo
// REGRAS DE ACESSO (Fase 6 - Vínculos):
//   - USER dono: pode editar manutenção do seu próprio veículo
//   - MECANICA: apenas se houver vínculo ATIVO com o proprietário do veículo
//   - ADMIN: acesso total
//   - Whitelist de campos no body
// ============================================================
router.put('/:manutencaoId', requireAuth, async (req, res) => {
    try {
        const dados = extrairCamposManutencao(req.body);

        if (Object.keys(dados).length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar.' });
        }

        if (req.user.role === 'ADMIN') {
            const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
            if (!veiculo) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
            await Veiculo.atualizarManutencao(req.params.id, req.params.manutencaoId, dados);
        } else if (req.user.role === 'MECANICA') {
            const temAcesso = await verificarAcessoManutencao(req.user._id, req.params.id);
            if (!temAcesso) {
                return res.status(403).json({ success: false, message: 'Você não tem acesso a este veículo.' });
            }
            await Veiculo.atualizarManutencao(req.params.id, req.params.manutencaoId, dados);
        } else {
            const resultado = await Veiculo.atualizarManutencaoDoProprietario(
                req.params.id,
                req.user._id,
                req.params.manutencaoId,
                dados
            );
            if (resultado.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Veículo ou manutenção não encontrado.' });
            }
        }

        await registrarAuditoria({
            userId: req.user._id,
            action: 'UPDATE_MAINTENANCE',
            resource: 'veiculo',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, message: 'Manutenção atualizada.' });
    } catch (error) {
        console.error('Erro ao atualizar manutenção:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar manutenção.' });
    }
});

// ============================================================
// PATCH /api/vehicles/:id/maintenance/km
// PROPÓSITO: Atualiza a quilometragem atual do veículo
// REGRAS DE ACESSO (Fase 6 - Vínculos):
//   - USER dono: pode atualizar o KM do seu próprio veículo
//   - MECANICA: apenas se houver vínculo ATIVO com o proprietário do veículo
//   - ADMIN: acesso total
// BODY: { kmAtual, dataLeitura }
// ============================================================
router.patch('/km', requireAuth, async (req, res) => {
    try {
        const { kmAtual, dataLeitura } = req.body || {};

        if (kmAtual === undefined) {
            return res.status(400).json({ success: false, message: 'Informe o kmAtual.' });
        }

        if (req.user.role === 'ADMIN') {
            const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
            if (!veiculo) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
            await Veiculo.atualizarKmAtual(req.params.id, kmAtual, dataLeitura || null);
        } else if (req.user.role === 'MECANICA') {
            const temAcesso = await verificarAcessoVeiculo(req.user._id, req.params.id);
            if (!temAcesso) {
                return res.status(403).json({ success: false, message: 'Você não tem acesso a este veículo.' });
            }
            await Veiculo.atualizarKmAtual(req.params.id, kmAtual, dataLeitura || null);
        } else {
            const resultado = await Veiculo.atualizarKmDoProprietario(
                req.params.id,
                req.user._id,
                kmAtual,
                dataLeitura || null
            );
            if (resultado.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
            }
        }

        res.json({ success: true, message: 'KM atualizado.' });
    } catch (error) {
        console.error('Erro ao atualizar KM:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar KM.' });
    }
});

export default router;
