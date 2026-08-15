// ============================================================
// ARQUIVO: middleware/errorHandler.js
// DESCRIÇÃO: Tratamento centralizado de erros
// ============================================================
// Captura erros não tratados e retorna resposta JSON padronizada.
// Em produção, não expõe detalhes internos do erro.
// ============================================================

// ============================================================
// MIDDLEWARE: notFound
// PROPÓSITO: Responde 404 para rotas inexistentes
// ============================================================
export function notFound(req, res) {
    res.status(404).json({ success: false, message: 'Rota não encontrada.' });
}

// ============================================================
// MIDDLEWARE: errorHandler
// PROPÓSITO: Trata erros lançados nas rotas
// ============================================================
export function errorHandler(err, req, res, next) {
    console.error('Erro não tratado:', err);

    const isProducao = process.env.NODE_ENV === 'production';

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Erro interno do servidor.',
        // Em desenvolvimento, inclui stack para facilitar debug
        ...(isProducao ? {} : { stack: err.stack })
    });
}
