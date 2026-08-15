// ============================================================
// ARQUIVO: middleware/validation.js
// DESCRIÇÃO: Validação de entrada (email, senha, campos obrigatórios)
// ============================================================
// Validação no servidor é obrigatória — nunca confiar apenas no frontend.
// ============================================================

// ============================================================
// FUNÇÃO: validarEmail(email)
// PROPÓSITO: Valida formato básico de e-mail
// ============================================================
export function validarEmail(email) {
    if (typeof email !== 'string') return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
}

// ============================================================
// FUNÇÃO: validarSenha(senha)
// PROPÓSITO: Valida força mínima da senha
// REGRAS: mínimo 8 caracteres, ao menos 1 letra e 1 número
// ============================================================
export function validarSenha(senha) {
    if (typeof senha !== 'string') return false;
    if (senha.length < 8) return false;
    if (!/[a-zA-Z]/.test(senha)) return false;
    if (!/[0-9]/.test(senha)) return false;
    return true;
}

// ============================================================
// MIDDLEWARE: validarCadastro
// PROPÓSITO: Valida os campos do cadastro de usuário
// ============================================================
export function validarCadastro(req, res, next) {
    const { nome, email, senha } = req.body || {};

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Informe um nome válido (mínimo 2 caracteres).' });
    }

    if (!validarEmail(email)) {
        return res.status(400).json({ success: false, message: 'Informe um e-mail válido.' });
    }

    if (!validarSenha(senha)) {
        return res.status(400).json({ success: false, message: 'A senha deve ter no mínimo 8 caracteres, com letras e números.' });
    }

    next();
}

// ============================================================
// MIDDLEWARE: validarLogin
// PROPÓSITO: Valida os campos do login
// ============================================================
export function validarLogin(req, res, next) {
    const { email, senha } = req.body || {};

    if (!validarEmail(email)) {
        return res.status(400).json({ success: false, message: 'Informe um e-mail válido.' });
    }

    if (!senha || typeof senha !== 'string' || senha.length === 0) {
        return res.status(400).json({ success: false, message: 'Informe a senha.' });
    }

    next();
}

// ============================================================
// MIDDLEWARE: validarTrocaSenha
// PROPÓSITO: Valida os campos da troca de senha
// ============================================================
export function validarTrocaSenha(req, res, next) {
    const { senhaAtual, novaSenha } = req.body || {};

    if (!senhaAtual || typeof senhaAtual !== 'string' || senhaAtual.length === 0) {
        return res.status(400).json({ success: false, message: 'Informe a senha atual.' });
    }

    if (!validarSenha(novaSenha)) {
        return res.status(400).json({ success: false, message: 'A nova senha deve ter no mínimo 8 caracteres, com letras e números.' });
    }

    next();
}
