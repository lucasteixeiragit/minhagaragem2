// ============================================================
// ARQUIVO: routes/mechanics.routes.js
// DESCRIÇÃO: Rotas públicas (para usuários autenticados) de mecânicas
// ============================================================
// PREFIXO: /api/mechanics
// RESPONSABILIDADES:
//   - GET /api/mechanics/public - Lista mecânicas ativas (id/nome/email)
// ============================================================
// REGRA CRÍTICA DE SEGURANÇA:
// - Autenticação obrigatória (qualquer role)
// - Retorna apenas campos mínimos (id, nome, email), nunca senhaHash
// - Usado pelo CLIENTE (USER) para escolher uma mecânica e enviar SOLICITACAO
// ============================================================

import express from 'express';
import Usuario from '../models/Usuario.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// GET /api/mechanics/public
// PROPÓSITO: Lista mecânicas ativas disponíveis para vínculo
// RESTRIÇÃO: Qualquer usuário autenticado
// RETORNA: 200 OK com array de { id, nome, email }
// ============================================================
router.get('/public', requireAuth, async (req, res) => {
    try {
        const mecanicas = await Usuario.listarPorRole('MECANICA');

        const lista = mecanicas
            .filter((m) => m.ativo !== false)
            .map((m) => ({ id: m._id, nome: m.nome, email: m.email }));

        return res.status(200).json({
            success: true,
            mecanicas: lista
        });
    } catch (error) {
        console.error('Erro ao listar mecânicas públicas:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao listar mecânicas.'
        });
    }
});

export default router;
