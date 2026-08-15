// ============================================================
// ARQUIVO: middleware/authorization.js
// DESCRIÇÃO: Middleware de autorização por role (requireRole)
// ============================================================
// Deve ser usado APÓS requireAuth. Verifica se o role do usuário
// autenticado está entre os roles permitidos.
// Sem permissão → 403 Forbidden.
// ============================================================

// ============================================================
// MIDDLEWARE: requireRole(...roles)
// PROPÓSITO: Restringe uma rota a determinados roles
// USO: router.delete('/:id', requireAuth, requireRole('ADMIN'), handler)
// ============================================================
export function requireRole(...roles) {
    return (req, res, next) => {
        // requireAuth já deve ter anexado req.user
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Não autenticado.' });
        }

        // Verifica se o role do usuário está na lista permitida
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Acesso negado.' });
        }

        next();
    };
}
