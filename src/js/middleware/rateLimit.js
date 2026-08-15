// ============================================================
// ARQUIVO: middleware/rateLimit.js
// DESCRIÇÃO: Limitação de taxa de requisições (anti brute-force)
// ============================================================
// Protege rotas sensíveis (login, cadastro, troca de senha) contra
// ataques de força bruta e abuso.
// ============================================================

import rateLimit from 'express-rate-limit';

// ============================================================
// LIMITER: limitadorLogin
// PROPÓSITO: Limita tentativas de login por IP
// REGRA: máximo 10 tentativas a cada 15 minutos
// ============================================================
export const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// ============================================================
// LIMITER: limitadorCadastro
// PROPÓSITO: Limita cadastros por IP
// REGRA: máximo 5 cadastros por hora
// ============================================================
export const limitadorCadastro = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Muitos cadastros a partir deste IP. Tente novamente mais tarde.' }
});

// ============================================================
// LIMITER: limitadorGeral
// PROPÓSITO: Limite geral de requisições por IP
// REGRA: máximo 300 requisições a cada 15 minutos
// ============================================================
export const limitadorGeral = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Muitas requisições. Tente novamente mais tarde.' }
});
