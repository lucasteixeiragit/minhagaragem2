// ============================================================
// ARQUIVO: routes/auth.routes.js
// DESCRIÇÃO: Rotas de autenticação (cadastro, login, logout, sessão)
// ============================================================
// PREFIXO: /api/auth
// RESPONSABILIDADES:
//   - POST /register → criar conta (role USER por padrão)
//   - POST /login → autenticar e criar sessão
//   - POST /logout → encerrar sessão
//   - GET /me → dados do usuário autenticado
//   - POST /change-password → trocar senha
// ============================================================

import express from 'express';
import Usuario from '../models/Usuario.js';
import { hashSenha, verificarSenha } from '../utils/password.js';
import { registrarAuditoria } from '../utils/audit.js';
import { requireAuth } from '../middleware/auth.js';
import { validarCadastro, validarLogin, validarTrocaSenha } from '../middleware/validation.js';
import { limitadorLogin, limitadorCadastro } from '../middleware/rateLimit.js';

const router = express.Router();

// ============================================================
// POST /api/auth/register
// PROPÓSITO: Cria uma nova conta (role USER)
// BODY: { nome, email, senha }
// ============================================================
router.post('/register', limitadorCadastro, validarCadastro, async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        // Verifica se o e-mail já está em uso
        const existente = await Usuario.buscarPorEmail(email);
        if (existente) {
            return res.status(409).json({ success: false, message: 'Este e-mail já está cadastrado.' });
        }

        // Gera hash da senha (nunca armazenar em texto puro)
        const senhaHash = await hashSenha(senha);

        // Cria o usuário com role USER (nunca aceitar role vinda do body)
        const resultado = await Usuario.criar({ nome, email, senhaHash, role: 'USER' });

        await registrarAuditoria({
            userId: resultado.insertedId,
            action: 'REGISTER',
            resource: 'usuario',
            resourceId: resultado.insertedId,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(201).json({ success: true, message: 'Conta criada com sucesso.' });
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar conta.' });
    }
});

// ============================================================
// POST /api/auth/login
// PROPÓSITO: Autentica o usuário e cria sessão
// BODY: { email, senha }
// ============================================================
router.post('/login', limitadorLogin, validarLogin, async (req, res) => {
    try {
        const { email, senha } = req.body;

        const usuario = await Usuario.buscarPorEmail(email);

        // Mensagem genérica para não revelar se o e-mail existe
        if (!usuario || !usuario.ativo) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
        }

        const senhaCorreta = await verificarSenha(senha, usuario.senhaHash);
        if (!senhaCorreta) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
        }

        // Regenera a sessão para evitar fixação de sessão
        req.session.regenerate(async (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erro ao iniciar sessão.' });
            }

            // Armazena apenas o ID do usuário na sessão
            req.session.userId = usuario._id.toString();

            await Usuario.registrarLogin(usuario._id);

            await registrarAuditoria({
                userId: usuario._id,
                action: 'LOGIN',
                resource: 'usuario',
                resourceId: usuario._id,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            res.json({
                success: true,
                message: 'Login realizado com sucesso.',
                user: Usuario.sanitizar(usuario)
            });
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ success: false, message: 'Erro ao fazer login.' });
    }
});

// ============================================================
// POST /api/auth/logout
// PROPÓSITO: Encerra a sessão do usuário
// ============================================================
router.post('/logout', (req, res) => {
    const userId = req.session && req.session.userId;

    req.session.destroy(async (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao encerrar sessão.' });
        }
        res.clearCookie('minhagaragem.sid');
        res.json({ success: true, message: 'Logout realizado com sucesso.' });
    });
});

// ============================================================
// GET /api/auth/me
// PROPÓSITO: Retorna os dados do usuário autenticado
// ============================================================
router.get('/me', requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

// ============================================================
// POST /api/auth/change-password
// PROPÓSITO: Troca a senha do usuário autenticado
// BODY: { senhaAtual, novaSenha }
// ============================================================
router.post('/change-password', requireAuth, validarTrocaSenha, async (req, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;

        // Busca o usuário completo (com senhaHash)
        const usuario = await Usuario.buscarPorId(req.user._id);
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        // Verifica a senha atual
        const senhaCorreta = await verificarSenha(senhaAtual, usuario.senhaHash);
        if (!senhaCorreta) {
            return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
        }

        // Gera novo hash e atualiza
        const novoHash = await hashSenha(novaSenha);
        await Usuario.atualizarSenha(usuario._id, novoHash);

        await registrarAuditoria({
            userId: usuario._id,
            action: 'CHANGE_PASSWORD',
            resource: 'usuario',
            resourceId: usuario._id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, message: 'Senha alterada com sucesso.' });
    } catch (error) {
        console.error('Erro ao trocar senha:', error);
        res.status(500).json({ success: false, message: 'Erro ao alterar senha.' });
    }
});

export default router;
