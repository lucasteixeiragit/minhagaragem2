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
import crypto from 'crypto'; // rypto é um módulo embutido do Node (não precisa instalar nada). Ele fornece o randomBytes para gerar o token
import {enviarEmail} from '../services/emailService.js';

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

// ============================================================
// POST /api/auth/forgot-password
// PROPÓSITO: Envia link de redefinição de senha por email
// BODY: { email }
// ============================================================
router.post('/forgot-password', limitadorLogin, async (req, res) => { // rota POST com o limitador como porteiro. Não usa requireAuth porque o usuário está deslogado (esqueceu a senha).
    try {
        const {email} = req.body; //extrai o campo email do corpo da requisição. O { email } é desestruturação: pega a propriedade email do objeto req.body e cria uma variável com o mesmo nome.

        //Busca o usuario por email
        const usuario = await Usuario.buscarPorEmail(email);

        //Resposta Genérica, nao revela se o email existe.
        if (!usuario) {
            return res.json({success: true, message: 'Se o e-mail estiver cadastrado, você receberá em breve um link de recuperação de senha.'});
        } //se o email não existe, respondemos a MESMA mensagem de sucesso. O atacante não consegue descobrir se um email está cadastrado, porque a resposta é idêntica nos dois casos (existe ou não).

        //Gera token aleatorio de 32 bytes (64 caracteres hex)
        const token = crypto.randomBytes(32).toString('hex');

        //Validade do token
        const expiraEm = new Date(Date.now() + 60 * 60 * 1000);

        //Salva token no usuario
        await Usuario.salvarTokenRedefinicao(usuario._id, token, expiraEm);

        // Monta link que vai no email
        const link = `https://minhagaragem.duckdns.org/resetPass.html?token=${token}`;

        //Envia o email
        await enviarEmail({
            para: usuario.email,
            assunto: 'Redefinição de senha - Minha Garagem',
            texto: `Olá ${usuario.nome}, recebemos um pedido de redefinição de senha. Acesse o link abaixo para definir uma nova senha (válido por 1 hora):\n\n${link}\n\nSe você não solicitou, ignore este email.`
        });

        //Auditoria
        await registrarAuditoria({
            userId: usuario._id,
            action: 'FORGOT_PASSWORD',
            resource: 'usuario',
            resourceId: usuario._id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({success: true, message: 'Se o e-mail estiver cadastrado, você receberá em breve um link de recuperação de senha.'});
    } catch (error) {
        console.error('Erro no forgot-password:', error);
        res.status(500).json({success: false, message: 'Erro ao processar solicitação.'});     
    }
});

// ============================================================
// POST /api/auth/reset-password
// PROPÓSITO: Define nova senha usando o token do email
// BODY: { token, novaSenha }
// ============================================================
router.post('/reset-password', limitadorLogin, async (req, res) => {
    try{
        const {token, novaSenha} = req.body; //extrai os 2 campos do body.

        //busca usuario pelo token (e confere validade no banco)
        const usuario = await Usuario.buscarPorTokenRedefinicao(token); //chama o método de POST /api/auth/forgot-password.  esse método já verifica a validade dentro do banco ($gt: new Date()). Se o token expirou, retorna null.

        if(!usuario) {
            return res.status(400).json({success: false, message: 'Link inválido ou expirado.'}); // token inválido ou expirado. Código 400 = "requisição ruim".
        }

        //valida tamanho minimo da senha
        if(!novaSenha || novaSenha.length < 8){
            return res.status(400).json({success: false, message: 'A senha deve ter no mínimo 8 caracteres.'});
        }

        //gera o hash da nova senha
        const novoHash = await hashSenha(novaSenha);

        //atualiza senha e limpa o token de uso unico
        await Usuario.atualizarSenha(usuario._id, novoHash);
        await Usuario.limparTokenRedefinicao(usuario._id);

        await registrarAuditoria({
            userId: usuario._id,
            action: 'RESET_PASSWORD',
            resource: 'usuario',
            resourceId: usuario._id,
            ip: req.ip,
            userAgent: req.get('user-agent')  
        });

        res.json({success: true, message: 'Senha redefinida com sucesso.'});
    } catch (error) {
        console.error('Erro no reset-password:', error);
        res.status(500).json({success: false, message: 'Erro ao redefinir senha.'});
    }
})

export default router;
