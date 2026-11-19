// ============================================================
// ARQUIVO: routes/notificacao.routes.js
// DESCRIÇÃO: Rotas de notificações de manutenção
// ============================================================
// PREFIXO: /api/notificacoes
// ============================================================
// ENDPOINTS:
//   - GET   /api/notificacoes      → Lista notificações pendentes do usuário
//   - POST  /api/notificacoes      → Cria/atualiza pendente para adiar alerta
//   - PATCH /api/notificacoes/:id  → Conclui ou adia uma notificação
// ============================================================
// SEGURANÇA:
//   - Todas as rotas exigem autenticação (requireAuth)
//   - usuarioId é SEMPRE derivado de req.user (nunca do body/URL)
//   - A notificação é buscada e comparada com req.user antes de alterar
//     → proteção contra IDOR
//   - Whitelist de ações no PATCH (concluir | adiar)
// ============================================================

import express from 'express';
import Notificacao from '../models/Notificacao.js';
import Veiculo from '../models/Veiculo.js';
import { requireAuth } from '../middleware/auth.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// ============================================================
// GET /api/notificacoes
// PROPÓSITO: Lista as notificações pendentes do usuário autenticado
// RETORNA: 200 com { success: true, notificacoes: [...] }
// ============================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const notificacoes = await Notificacao.listarPendentes(req.user._id);

        return res.status(200).json({
            success: true,
            notificacoes
        });
    } catch (error) {
        console.error('Erro ao listar notificações:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao listar notificações.'
        });
    }
});

// ============================================================
// POST /api/notificacoes
// PROPÓSITO: Cria (ou atualiza) uma notificação pendente para adiar um alerta
// BODY: { veiculoId, tipo, dataVencimento }
// ============================================================
// Usado quando o alerta existe no veículo mas o cron ainda não gerou
// a notificação correspondente. Sem isso, o botão Adiar falharia.
// VALIDAÇÕES:
//   - veiculoId deve ser ObjectId válido (400)
//   - tipo é obrigatório (400)
//   - dataVencimento deve ser data válida (400)
//   - veículo deve pertencer ao usuário autenticado (403)
// RETORNA: 201 com { success: true, notificacao }
// ============================================================
router.post('/', requireAuth, async (req, res) => {
    try {
        const { veiculoId, tipo, dataVencimento } = req.body;

        if (!ObjectId.isValid(veiculoId)) {
            return res.status(400).json({ success: false, message: 'ID de veículo inválido.' });
        }

        if (!tipo || typeof tipo !== 'string') {
            return res.status(400).json({ success: false, message: 'Informe o tipo da manutenção.' });
        }

        const dataAdiada = new Date(dataVencimento);
        if (!dataVencimento || Number.isNaN(dataAdiada.getTime())) {
            return res.status(400).json({ success: false, message: 'Informe uma data válida para adiar.' });
        }

        // Confere a posse do veículo antes de criar qualquer notificação
        const veiculo = await Veiculo.buscarPorId(veiculoId);
        if (!veiculo) {
            return res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
        }
        if (String(veiculo.ownerId) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Acesso negado.' });
        }

        // Reaproveita a pendente existente, se houver, para não duplicar
        const existente = await Notificacao.buscarPendentePorTipo({
            usuarioId: req.user._id,
            veiculoId,
            tipo
        });

        if (existente) {
            await Notificacao.adiarNotificacao(existente._id, dataAdiada);
            return res.status(200).json({ success: true, message: 'Notificação adiada.' });
        }

        const { insertedId } = await Notificacao.criarNotificacao({
            usuarioId: req.user._id,
            veiculoId,
            tipo,
            mensagem: `A manutenção ${tipo} do veículo ${veiculo.apelido || veiculo.modelo} está próxima.`,
            dataVencimento: dataAdiada
        });

        return res.status(201).json({
            success: true,
            notificacao: { _id: insertedId, tipo, dataVencimento: dataAdiada }
        });
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        return res.status(500).json({ success: false, message: 'Erro ao criar notificação.' });
    }
});

// ============================================================
// PATCH /api/notificacoes/:id
// PROPÓSITO: Conclui ou adia uma notificação do usuário autenticado
// BODY: { acao: 'concluir' } ou { acao: 'adiar', novaData: '2026-12-01' }
// VALIDAÇÕES:
//   - id deve ser um ObjectId válido
//   - notificação deve existir (404)
//   - notificação deve pertencer ao usuário autenticado (403)
//   - acao deve ser 'concluir' ou 'adiar' (400)
//   - novaData deve ser uma data válida quando acao = 'adiar' (400)
// RETORNA: 200 com { success: true, message }
// ============================================================
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { acao, novaData } = req.body;

        // Valida o formato do ID antes de consultar o banco
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de notificação inválido.'
            });
        }

        // Valida a ação antes de qualquer alteração
        if (acao !== 'concluir' && acao !== 'adiar') {
            return res.status(400).json({
                success: false,
                message: 'Ação inválida. Use concluir ou adiar.'
            });
        }

        // Busca a notificação e confere a propriedade
        const notificacao = await Notificacao.buscarPorId(id);
        if (!notificacao) {
            return res.status(404).json({
                success: false,
                message: 'Notificação não encontrada.'
            });
        }

        if (notificacao.usuarioId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado.'
            });
        }

        if (acao === 'concluir') {
            await Notificacao.marcarComoConcluida(id);
            return res.status(200).json({
                success: true,
                message: 'Notificação concluída.'
            });
        }

        // acao === 'adiar': exige uma data válida
        const dataAdiada = new Date(novaData);
        if (!novaData || Number.isNaN(dataAdiada.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Informe uma data válida para adiar.'
            });
        }

        await Notificacao.adiarNotificacao(id, dataAdiada);
        return res.status(200).json({
            success: true,
            message: 'Notificação adiada.'
        });
    } catch (error) {
        console.error('Erro ao atualizar notificação:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar notificação.'
        });
    }
});

export default router;
