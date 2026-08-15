// ============================================================
// ARQUIVO: middleware/auth.js
// DESCRIÇÃO: Middleware de autenticação (requireAuth)
// ============================================================
// Verifica se existe sessão válida e se o usuário está ativo.
// Sem autenticação → 401 Unauthorized.
// ============================================================

import Usuario from '../models/Usuario.js';

// ============================================================
// MIDDLEWARE: requireAuth
// PROPÓSITO: Garante que a requisição vem de um usuário autenticado
// FLUXO:
//   1. Verifica se existe req.session.userId (definido no login)
//   2. Busca o usuário no banco
//   3. Verifica se o usuário existe e está ativo
//   4. Anexa o usuário sanitizado em req.user
// ============================================================
export async function requireAuth(req, res, next) {
    try {
        // 1. Verifica sessão
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ success: false, message: 'Não autenticado.' });
        }

        // 2. Busca usuário no banco
        const usuario = await Usuario.buscarPorId(req.session.userId);

        // 3. Verifica existência e status ativo
        if (!usuario) {
            // Sessão órfã: invalida
            req.session.destroy(() => {});
            return res.status(401).json({ success: false, message: 'Sessão inválida.' });
        }

        if (!usuario.ativo) {
            req.session.destroy(() => {});
            return res.status(403).json({ success: false, message: 'Conta bloqueada.' });
        }

        // 4. Anexa usuário sanitizado (sem senhaHash)
        req.user = Usuario.sanitizar(usuario);
        next();
    } catch (error) {
        console.error('Erro no middleware de autenticação:', error);
        return res.status(500).json({ success: false, message: 'Erro interno.' });
    }
}
