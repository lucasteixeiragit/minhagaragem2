// ============================================================
// ARQUIVO: routes/admin.routes.js
// DESCRIÇÃO: Rotas administrativas (somente ADMIN)
// ============================================================
// PREFIXO: /api/admin
// SEGURANÇA:
//   - Todas as rotas exigem requireAuth + requireRole('ADMIN')
//   - Nunca retorna senhaHash
//   - Whitelist de campos em todas as operações
// ============================================================

import express from 'express';
import Usuario from '../models/Usuario.js';
import Veiculo from '../models/Veiculo.js';
import Atendimento from '../models/Atendimento.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import { registrarAuditoria } from '../utils/audit.js';
import { hashSenha } from '../utils/password.js';
import { getBanco } from '../config/database.js';
import { ROLES } from '../models/Usuario.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Aplica autenticação e role ADMIN em TODAS as rotas deste router
router.use(requireAuth, requireRole('ADMIN'));

// ============================================================
// GET /api/admin/users
// PROPÓSITO: Lista todos os usuários (sem senhaHash)
// ============================================================
router.get('/users', async (req, res) => {
    try {
        const usuarios = await Usuario.listarTodos();
        res.json({ success: true, usuarios: usuarios.map(Usuario.sanitizar) });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar usuários.' });
    }
});

// ============================================================
// POST /api/admin/users
// PROPÓSITO: Cria um usuário (ADMIN pode criar qualquer role)
// BODY: { nome, email, senha, role }
// ============================================================
router.post('/users', async (req, res) => {
    try {
        const { nome, email, senha, role } = req.body || {};

        if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Informe um nome válido (mínimo 2 caracteres).' });
        }
        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'Informe um e-mail válido.' });
        }
        if (!senha || typeof senha !== 'string' || senha.length < 8) {
            return res.status(400).json({ success: false, message: 'A senha deve ter no mínimo 8 caracteres.' });
        }

        // Valida role (whitelist)
        const roleValida = ROLES.includes(role) ? role : 'USER';

        // Verifica se o e-mail já existe
        const existente = await Usuario.buscarPorEmail(email);
        if (existente) {
            return res.status(409).json({ success: false, message: 'Este e-mail já está cadastrado.' });
        }

        const senhaHash = await hashSenha(senha);
        const resultado = await Usuario.criar({ nome, email, senhaHash, role: roleValida });

        await registrarAuditoria({
            userId: req.user._id,
            action: 'ADMIN_CREATE_USER',
            resource: 'usuario',
            resourceId: resultado.insertedId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            detalhes: { role: roleValida }
        });

        res.status(201).json({ success: true, message: 'Usuário criado.', id: resultado.insertedId });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar usuário.' });
    }
});

// ============================================================
// PUT /api/admin/users/:id/role
// PROPÓSITO: Altera a role de um usuário
// BODY: { role }
// ============================================================
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body || {};

        if (!ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: 'Role inválida.' });
        }

        // Impede que o ADMIN se rebaixe (evita perder o último admin)
        if (req.params.id === req.user._id.toString() && role !== 'ADMIN') {
            return res.status(400).json({ success: false, message: 'Você não pode rebaixar a si mesmo.' });
        }

        const resultado = await Usuario.alterarRole(req.params.id, role);

        if (resultado.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        await registrarAuditoria({
            userId: req.user._id,
            action: 'ADMIN_CHANGE_ROLE',
            resource: 'usuario',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            detalhes: { novaRole: role }
        });

        res.json({ success: true, message: 'Role atualizada.' });
    } catch (error) {
        console.error('Erro ao alterar role:', error);
        res.status(500).json({ success: false, message: 'Erro ao alterar role.' });
    }
});

// ============================================================
// PUT /api/admin/users/:id/status
// PROPÓSITO: Bloqueia/desbloqueia um usuário
// BODY: { ativo: boolean }
// ============================================================
router.put('/users/:id/status', async (req, res) => {
    try {
        const { ativo } = req.body || {};

        if (typeof ativo !== 'boolean') {
            return res.status(400).json({ success: false, message: 'Informe ativo (true/false).' });
        }

        // Impede que o ADMIN se bloqueie
        if (req.params.id === req.user._id.toString() && !ativo) {
            return res.status(400).json({ success: false, message: 'Você não pode bloquear a si mesmo.' });
        }

        const resultado = await Usuario.setAtivo(req.params.id, ativo);

        if (resultado.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        await registrarAuditoria({
            userId: req.user._id,
            action: ativo ? 'ADMIN_ACTIVATE_USER' : 'ADMIN_DEACTIVATE_USER',
            resource: 'usuario',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, message: ativo ? 'Usuário ativado.' : 'Usuário bloqueado.' });
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        res.status(500).json({ success: false, message: 'Erro ao alterar status.' });
    }
});

// ============================================================
// DELETE /api/admin/users/:id
// PROPÓSITO: Exclui um usuário
// ============================================================
router.delete('/users/:id', async (req, res) => {
    try {
        // Impede que o ADMIN se exclua
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Você não pode excluir a si mesmo.' });
        }

        const resultado = await Usuario.excluir(req.params.id);

        if (resultado.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        await registrarAuditoria({
            userId: req.user._id,
            action: 'ADMIN_DELETE_USER',
            resource: 'usuario',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, message: 'Usuário excluído.' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir usuário.' });
    }
});

// ============================================================
// GET /api/admin/vehicles
// PROPÓSITO: Lista todos os veículos (uso administrativo)
// ============================================================
router.get('/vehicles', async (req, res) => {
    try {
        const veiculos = await Veiculo.listarTodosAdmin();
        res.json({ success: true, veiculos });
    } catch (error) {
        console.error('Erro ao listar veículos:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar veículos.' });
    }
});

// ============================================================
// GET /api/admin/audit-logs
// PROPÓSITO: Lista os logs de auditoria
// QUERY: ?limit=50&page=1
// ============================================================
router.get('/audit-logs', async (req, res) => {
    try {
        const db = getBanco();
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const skip = (page - 1) * limit;

        const logs = await db.collection('audit_logs')
            .find()
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('audit_logs').countDocuments();

        res.json({ success: true, logs, total, page, limit });
    } catch (error) {
        console.error('Erro ao listar logs:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar logs.' });
    }
});

// ============================================================
// GET /api/admin/appointments
// PROPÓSITO: Lista todos os atendimentos
// ============================================================
router.get('/appointments', async (req, res) => {
    try {
        const atendimentos = await Atendimento.listarTodos();
        res.json({ success: true, atendimentos });
    } catch (error) {
        console.error('Erro ao listar atendimentos:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar atendimentos.' });
    }
});

// ============================================================
// POST /api/admin/appointments
// PROPÓSITO: Cria um atendimento (vínculo mecânica-veículo)
// BODY: { mechanicId, vehicleId }
// ============================================================
router.post('/appointments', async (req, res) => {
    try {
        const { mechanicId, vehicleId } = req.body || {};

        if (!mechanicId || !vehicleId) {
            return res.status(400).json({ success: false, message: 'mechanicId e vehicleId são obrigatórios.' });
        }

        // Valida se a mecânica existe e tem role MECANICA
        const mecanica = await Usuario.buscarPorId(mechanicId);
        if (!mecanica || mecanica.role !== 'MECANICA') {
            return res.status(400).json({ success: false, message: 'Usuário não é uma mecânica válida.' });
        }

        // Valida se o veículo existe
        const veiculo = await Veiculo.buscarPorIdAdmin(vehicleId);
        if (!veiculo) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
        }

        // Verifica se já existe atendimento ativo
        const existente = await Atendimento.buscarPorMecanicaEVeiculo(mechanicId, vehicleId);
        if (existente) {
            return res.status(409).json({ success: false, message: 'Atendimento já existe para esta mecânica e veículo.' });
        }

        const resultado = await Atendimento.criar({
            mechanicId,
            vehicleId,
            ownerId: veiculo.ownerId
        });

        await registrarAuditoria({
            userId: req.user._id,
            action: 'ADMIN_CREATE_APPOINTMENT',
            resource: 'atendimento',
            resourceId: resultado.insertedId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            detalhes: { mechanicId, vehicleId }
        });

        res.status(201).json({ success: true, message: 'Atendimento criado.', id: resultado.insertedId });
    } catch (error) {
        console.error('Erro ao criar atendimento:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar atendimento.' });
    }
});

// ============================================================
// PUT /api/admin/appointments/:id/status
// PROPÓSITO: Atualiza o status de um atendimento
// BODY: { status: "aberto" | "concluido" | "cancelado" }
// ============================================================
router.put('/appointments/:id/status', async (req, res) => {
    try {
        const { status } = req.body || {};
        const statusValidos = ['aberto', 'concluido', 'cancelado'];

        if (!statusValidos.includes(status)) {
            return res.status(400).json({ success: false, message: 'Status inválido.' });
        }

        const db = getBanco();
        const resultado = await db.collection('atendimentos').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status, updatedAt: new Date() } }
        );

        if (resultado.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Atendimento não encontrado.' });
        }

        await registrarAuditoria({
            userId: req.user._id,
            action: 'ADMIN_UPDATE_APPOINTMENT',
            resource: 'atendimento',
            resourceId: req.params.id,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            detalhes: { status }
        });

        res.json({ success: true, message: 'Atendimento atualizado.' });
    } catch (error) {
        console.error('Erro ao atualizar atendimento:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar atendimento.' });
    }
});

export default router;
