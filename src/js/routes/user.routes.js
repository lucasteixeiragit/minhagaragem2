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
import { requireAuth } from '../middleware/auth.js';
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

export default router;
