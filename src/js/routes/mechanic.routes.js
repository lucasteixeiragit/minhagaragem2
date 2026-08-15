// ============================================================
// ARQUIVO: routes/mechanic.routes.js
// DESCRIÇÃO: Rotas de acesso da mecânica aos veículos
// ============================================================
// PREFIXO: /api/mechanic
// SEGURANÇA:
//   - Apenas role MECANICA (e ADMIN) podem acessar
//   - A mecânica só vê veículos com os quais tem um ATENDIMENTO ativo
//   - Nunca acessa veículo por ID arbitrário sem vínculo
// ============================================================

import express from 'express';
import Atendimento from '../models/Atendimento.js';
import Veiculo from '../models/Veiculo.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import { requireActiveVehicleAccess } from '../middleware/vinculos.js';
import { verificarAcessoVeiculo } from '../utils/authorization.js';
import { registrarAuditoria } from '../utils/audit.js';

const router = express.Router();

// ============================================================
// GET /api/mechanic/vehicles
// PROPÓSITO: Lista os veículos que a mecânica pode atender
// ============================================================
router.get('/vehicles', requireAuth, requireRole('MECANICA', 'ADMIN'), async (req, res) => {
    try {
        const atendimentos = await Atendimento.listarVeiculosDaMecanica(req.user._id);

        // Busca os dados completos de cada veículo vinculado
        const veiculos = [];
        for (const atendimento of atendimentos) {
            const veiculo = await Veiculo.buscarPorIdAdmin(atendimento.vehicleId);
            if (veiculo) {
                veiculos.push({
                    ...veiculo,
                    atendimentoId: atendimento._id
                });
            }
        }

        res.json({ success: true, veiculos });
    } catch (error) {
        console.error('Erro ao listar veículos da mecânica:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar veículos.' });
    }
});

// ============================================================
// GET /api/mechanic/vehicles/:id
// PROPÓSITO: Retorna um veículo específico (somente se vinculado)
// SEGURANÇA:
//   - Verifica vínculo ATIVO entre mecânica e proprietário do veículo
//   - Verifica atendimento ativo entre mecânica e veículo
// ============================================================
router.get('/vehicles/:id', requireAuth, requireRole('MECANICA', 'ADMIN'), requireActiveVehicleAccess, async (req, res) => {
    try {
        // Verifica se existe atendimento ativo entre a mecânica e o veículo
        const atendimento = await Atendimento.buscarPorMecanicaEVeiculo(req.user._id, req.params.id);
        if (!atendimento) {
            return res.status(403).json({ success: false, message: 'Acesso negado a este veículo.' });
        }

        const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
        if (!veiculo) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
        }

        res.json({ success: true, veiculo });
    } catch (error) {
        console.error('Erro ao buscar veículo da mecânica:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar veículo.' });
    }
});

// ============================================================
// POST /api/mechanic/vehicles/:id/maintenance
// PROPÓSITO: Mecânica registra manutenção em veículo vinculado
// SEGURANÇA:
//   - Verifica vínculo ATIVO entre mecânica e proprietário do veículo
//   - Verifica atendimento ativo entre mecânica e veículo
//   - Whitelist de campos no body
// ============================================================
router.post('/vehicles/:id/maintenance', requireAuth, requireRole('MECANICA', 'ADMIN'), requireActiveVehicleAccess, async (req, res) => {
    try {
        const atendimento = await Atendimento.buscarPorMecanicaEVeiculo(req.user._id, req.params.id);
        if (!atendimento) {
            return res.status(403).json({ success: false, message: 'Acesso negado a este veículo.' });
        }

        const { data, km, tipo, custo, descricao, notaFiscal, notaFiscalNome } = req.body || {};

        if (!data || !tipo) {
            return res.status(400).json({ success: false, message: 'Data e tipo são obrigatórios.' });
        }

        // ownerId do veículo é usado para o vínculo (não o da mecânica)
        const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
        if (!veiculo) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
        }

        await Veiculo.adicionarManutencaoDoProprietario(
            req.params.id,
            veiculo.ownerId,
            { data, km, tipo, custo, descricao, notaFiscal, notaFiscalNome }
        );

        await registrarAuditoria({
            userId: req.user._id,
            action: 'MECHANIC_CREATE_MAINTENANCE',
            resource: 'veiculo',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(201).json({ success: true, message: 'Manutenção registrada.' });
    } catch (error) {
        console.error('Erro ao registrar manutenção da mecânica:', error);
        res.status(500).json({ success: false, message: 'Erro ao registrar manutenção.' });
    }
});

export default router;
