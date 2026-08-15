// ============================================================
// ARQUIVO: routes/user.routes.js
// DESCRIÇÃO: Rotas de perfil do usuário autenticado
// ============================================================
// PREFIXO: /api/user
// RESPONSABILIDADES:
//   - GET / → dados do perfil
//   - PUT / → atualizar nome
// ============================================================

import express from 'express';
import Usuario from '../models/Usuario.js';
import Vinculo from '../models/Vinculo.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import { registrarAuditoria } from '../utils/audit.js';

const router = express.Router();

// ============================================================
// GET /api/user
// PROPÓSITO: Retorna o perfil do usuário autenticado
// ============================================================
router.get('/', requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

// ============================================================
// PUT /api/user
// PROPÓSITO: Atualiza o nome do usuário autenticado
// BODY: { nome }
// IMPORTANTE: Só aceita campos permitidos (whitelist) — evita mass assignment
// ============================================================
router.put('/', requireAuth, async (req, res) => {
    try {
        const { nome } = req.body || {};

        if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Informe um nome válido (mínimo 2 caracteres).' });
        }

        // Whitelist: apenas 'nome' pode ser alterado aqui
        await Usuario.atualizar(req.user._id, { nome: nome.trim() });

        await registrarAuditoria({
            userId: req.user._id,
            action: 'UPDATE_PROFILE',
            resource: 'usuario',
            resourceId: req.user._id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        const atualizado = await Usuario.buscarPorId(req.user._id);
        res.json({ success: true, message: 'Perfil atualizado.', user: Usuario.sanitizar(atualizado) });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar perfil.' });
    }
});

// ============================================================
// GET /api/user/buscar-por-email
// PROPÓSITO: Localiza um cliente (role USER) pelo e-mail
// RESTRIÇÃO: Apenas MECANICA ou ADMIN (usado para enviar CONVITE)
// QUERY: ?email=cliente@exemplo.com
// RETORNA: Apenas id/nome/email (sem dados sensíveis)
// SEGURANÇA: Não vaza senha/hash; não permite listar todos os usuários
// ============================================================
router.get('/buscar-por-email', requireAuth, requireRole('MECANICA', 'ADMIN'), async (req, res) => {
    try {
        const { email } = req.query;

        if (!email || typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Informe o e-mail para busca.' });
        }

        const usuario = await Usuario.buscarPorEmail(email);

        // Só retorna se for cliente (role USER) — mecânica convida clientes, não outras mecânicas
        if (!usuario || usuario.role !== 'USER') {
            return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
        }

        return res.json({
            success: true,
            usuario: { id: usuario._id, nome: usuario.nome, email: usuario.email }
        });
    } catch (error) {
        console.error('Erro ao buscar usuário por e-mail:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar usuário.' });
    }
});

// ============================================================
// GET /api/user/:id
// PROPÓSITO: Retorna dados básicos (id/nome/email) de um usuário
//            com o qual o solicitante (MECANICA) já possui vínculo
//            (qualquer status) — usado para exibir nome/e-mail do
//            cliente em listas de vínculos pendentes/ativos
// RESTRIÇÃO: Apenas MECANICA ou ADMIN
// SEGURANÇA: Protegido contra IDOR — só retorna dados se existir
//            vínculo (Vinculo) entre a mecânica autenticada e o :id
// ============================================================
router.get('/:id', requireAuth, requireRole('MECANICA', 'ADMIN'), async (req, res) => {
    try {
        const clienteId = req.params.id;

        // ADMIN pode consultar qualquer usuário; MECANICA só quem tem vínculo com ela
        if (req.user.role !== 'ADMIN') {
            const vinculo = await Vinculo.buscarPorUsuarioEMecanica(clienteId, req.user._id);
            if (!vinculo) {
                return res.status(403).json({ success: false, message: 'Acesso negado.' });
            }
        }

        const usuario = await Usuario.buscarPorId(clienteId);
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        return res.json({
            success: true,
            usuario: { id: usuario._id, nome: usuario.nome, email: usuario.email }
        });
    } catch (error) {
        console.error('Erro ao buscar usuário por id:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar usuário.' });
    }
});

export default router;
