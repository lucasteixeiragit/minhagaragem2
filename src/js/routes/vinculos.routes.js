// ============================================================
// ARQUIVO: routes/vinculos.routes.js
// DESCRIÇÃO: Rotas de vínculo entre CLIENTE (USER) e MECÂNICA
// ============================================================
// PREFIXO: /api/vinculos
// RESPONSABILIDADES:
//   - POST /api/vinculos - Criar vínculo (PENDENTE)
//   - GET /api/vinculos - Listar vínculos do usuário autenticado
//   - GET /api/vinculos/meus-clientes - Listar clientes da mecânica (MECANICA)
//   - GET /api/vinculos/minhas-mecanicas - Listar mecânicas do cliente (USER)
//   - POST /api/vinculos/:id/aceitar - Aceitar vínculo (USER)
//   - POST /api/vinculos/:id/recusar - Recusar vínculo (USER)
//   - PATCH /api/vinculos/:id/desativar - Desativar vínculo (USER ou MECANICA)
//   - PATCH /api/vinculos/:id/bloquear - Bloquear vínculo (ADMIN)
//   - PATCH /api/vinculos/:id/desbloquear - Desbloquear vínculo (ADMIN)
// ============================================================
// REGRA CRÍTICA DE SEGURANÇA:
// - Autenticação obrigatória em todas as rotas
// - Autorização por role onde necessário
// - Proteção contra IDOR (verificar que o vínculo pertence ao usuário)
// - Validar transições de status
// - Whitelist de campos no body
// ============================================================

import express from 'express';
import Vinculo, { ESTADOS_VINCULO, TIPOS_VINCULO } from '../models/Vinculo.js';
import Usuario from '../models/Usuario.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import { registrarAuditoria } from '../utils/audit.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// ============================================================
// HELPER: Validar se o vínculo pertence ao usuário
// ============================================================
async function validarPropriedadeVinculo(vinculoId, usuarioId, mecanicaId = null) {
    const vinculo = await Vinculo.buscarPorId(vinculoId);
    
    if (!vinculo) {
        return { valido: false, erro: 'Vínculo não encontrado', status: 404 };
    }

    // Se mecanicaId foi fornecido, verificar se é mecânica
    if (mecanicaId) {
        if (vinculo.mecanicaId.toString() !== mecanicaId.toString()) {
            return { valido: false, erro: 'Acesso negado', status: 403 };
        }
    } else {
        // Caso contrário, verificar se é usuário (cliente)
        if (vinculo.usuarioId.toString() !== usuarioId.toString()) {
            return { valido: false, erro: 'Acesso negado', status: 403 };
        }
    }

    return { valido: true, vinculo };
}

// ============================================================
// POST /api/vinculos
// PROPÓSITO: Criar vínculo (PENDENTE)
// BODY: { usuarioId, mecanicaId, tipo } ou { usuarioId, tipo } (se mecânica convida)
// VALIDAÇÕES:
//   - usuarioId ≠ mecanicaId
//   - tipo é CONVITE ou SOLICITACAO
//   - Não permitir vínculo duplicado
// RETORNA: 201 Created com dados do vínculo
// ============================================================
router.post('/', requireAuth, async (req, res) => {
    try {
        const { usuarioId, mecanicaId, tipo } = req.body;
        const usuarioAutenticado = req.user._id;
        const roleAutenticado = req.user.role;

        // Validação: tipo deve ser válido
        if (!tipo || !Object.values(TIPOS_VINCULO).includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de vínculo inválido. Use CONVITE ou SOLICITACAO.'
            });
        }

        let usuarioIdObj, mecanicaIdObj, criadoPor;

        // Fluxo 1: Mecânica convida cliente (tipo = CONVITE)
        if (tipo === TIPOS_VINCULO.CONVITE) {
            // Mecânica deve estar autenticada
            if (roleAutenticado !== 'MECANICA' && roleAutenticado !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas mecânicas podem enviar convites.'
                });
            }

            // Validar que usuarioId foi fornecido
            if (!usuarioId) {
                return res.status(400).json({
                    success: false,
                    message: 'Informe o ID do cliente (usuarioId).'
                });
            }

            usuarioIdObj = new ObjectId(usuarioId);
            mecanicaIdObj = new ObjectId(usuarioAutenticado);
            criadoPor = usuarioAutenticado;
        }
        // Fluxo 2: Cliente solicita mecânica (tipo = SOLICITACAO)
        else if (tipo === TIPOS_VINCULO.SOLICITACAO) {
            // Cliente deve estar autenticado
            if (roleAutenticado !== 'USER' && roleAutenticado !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas clientes podem solicitar mecânicas.'
                });
            }

            // Validar que mecanicaId foi fornecido
            if (!mecanicaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Informe o ID da mecânica (mecanicaId).'
                });
            }

            usuarioIdObj = new ObjectId(usuarioAutenticado);
            mecanicaIdObj = new ObjectId(mecanicaId);
            criadoPor = usuarioAutenticado;
        }

        // Validação: usuário e mecânica devem ser diferentes
        if (usuarioIdObj.toString() === mecanicaIdObj.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Um usuário não pode ser vinculado a si mesmo.'
            });
        }

        // Validar que o usuário existe
        const usuario = await Usuario.buscarPorId(usuarioIdObj);
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário (cliente) não encontrado.'
            });
        }

        // Validar que a mecânica existe
        const mecanica = await Usuario.buscarPorId(mecanicaIdObj);
        if (!mecanica) {
            return res.status(404).json({
                success: false,
                message: 'Mecânica não encontrada.'
            });
        }

        // Criar vínculo
        const resultado = await Vinculo.criar({
            usuarioId: usuarioIdObj,
            mecanicaId: mecanicaIdObj,
            criadoPor,
            tipo
        });

        // Registrar auditoria
        await registrarAuditoria({
            userId: usuarioAutenticado,
            action: 'CREATE_VINCULO',
            resource: 'vinculo',
            resourceId: resultado.insertedId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            detalhes: { tipo, usuarioId: usuarioIdObj.toString(), mecanicaId: mecanicaIdObj.toString() }
        });

        // Buscar o vínculo criado para retornar
        const vinculoCriado = await Vinculo.buscarPorId(resultado.insertedId);

        return res.status(201).json({
            success: true,
            message: 'Vínculo criado com sucesso.',
            vinculo: vinculoCriado
        });
    } catch (error) {
        console.error('Erro ao criar vínculo:', error);

        // Verificar se é erro de duplicação
        if (error.message.includes('Já existe um vínculo')) {
            return res.status(409).json({
                success: false,
                message: 'Já existe um vínculo entre este usuário e esta mecânica.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erro ao criar vínculo.'
        });
    }
});

// ============================================================
// GET /api/vinculos
// PROPÓSITO: Listar vínculos do usuário autenticado
// COMPORTAMENTO:
//   - Se USER: listar suas mecânicas
//   - Se MECANICA: listar seus clientes
//   - Se ADMIN: listar todos
// RETORNA: 200 OK com array de vínculos
// ============================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const usuarioAutenticado = req.user._id;
        const roleAutenticado = req.user.role;
        let vinculos;

        if (roleAutenticado === 'USER') {
            // Cliente vê suas mecânicas
            vinculos = await Vinculo.listarDoUsuario(usuarioAutenticado);
        } else if (roleAutenticado === 'MECANICA') {
            // Mecânica vê seus clientes
            vinculos = await Vinculo.listarDaMecanica(usuarioAutenticado);
        } else if (roleAutenticado === 'ADMIN') {
            // Admin vê todos
            vinculos = await Vinculo.listarTodos();
        } else {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado.'
            });
        }

        return res.status(200).json({
            success: true,
            vinculos
        });
    } catch (error) {
        console.error('Erro ao listar vínculos:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao listar vínculos.'
        });
    }
});

// ============================================================
// GET /api/vinculos/meus-clientes
// PROPÓSITO: Listar clientes ATIVOS da mecânica
// RESTRIÇÃO: Apenas MECANICA
// RETORNA: 200 OK com array de vínculos ATIVOS + dados do cliente
// ============================================================
router.get('/meus-clientes', requireAuth, requireRole('MECANICA'), async (req, res) => {
    try {
        const mecanicaAutenticada = req.user._id;

        // Buscar vínculos ATIVOS
        const vinculos = await Vinculo.listarAtivosDaMecanica(mecanicaAutenticada);

        // Enriquecer com dados do cliente
        const clientesComDados = await Promise.all(
            vinculos.map(async (vinculo) => {
                const cliente = await Usuario.buscarPorId(vinculo.usuarioId);
                return {
                    vinculoId: vinculo._id,
                    status: vinculo.status,
                    criadoEm: vinculo.criadoEm,
                    atualizadoEm: vinculo.atualizadoEm,
                    cliente: cliente ? {
                        id: cliente._id,
                        nome: cliente.nome,
                        email: cliente.email
                    } : null
                };
            })
        );

        return res.status(200).json({
            success: true,
            clientes: clientesComDados
        });
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao listar clientes.'
        });
    }
});

// ============================================================
// GET /api/vinculos/minhas-mecanicas
// PROPÓSITO: Listar mecânicas ATIVAS do cliente
// RESTRIÇÃO: Apenas USER
// RETORNA: 200 OK com array de vínculos ATIVOS + dados da mecânica
// ============================================================
router.get('/minhas-mecanicas', requireAuth, requireRole('USER'), async (req, res) => {
    try {
        const clienteAutenticado = req.user._id;

        // Buscar vínculos ATIVOS
        const vinculos = await Vinculo.listarAtivosDoUsuario(clienteAutenticado);

        // Enriquecer com dados da mecânica
        const mecanicasComDados = await Promise.all(
            vinculos.map(async (vinculo) => {
                const mecanica = await Usuario.buscarPorId(vinculo.mecanicaId);
                return {
                    vinculoId: vinculo._id,
                    status: vinculo.status,
                    criadoEm: vinculo.criadoEm,
                    atualizadoEm: vinculo.atualizadoEm,
                    mecanica: mecanica ? {
                        id: mecanica._id,
                        nome: mecanica.nome,
                        email: mecanica.email
                    } : null
                };
            })
        );

        return res.status(200).json({
            success: true,
            mecanicas: mecanicasComDados
        });
    } catch (error) {
        console.error('Erro ao listar mecânicas:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao listar mecânicas.'
        });
    }
});

// ============================================================
// POST /api/vinculos/:id/aceitar
// PROPÓSITO: Aceitar vínculo (muda status para ATIVO)
// RESTRIÇÃO:
//   - CONVITE (mecânica convida cliente): o cliente (USER) aceita
//   - SOLICITACAO (cliente solicita mecânica): a mecânica (MECANICA) aceita
// VALIDAÇÕES:
//   - Vínculo deve pertencer ao usuário autenticado
//   - Status deve ser PENDENTE
// RETORNA: 200 OK com vínculo atualizado
// ============================================================
router.post('/:id/aceitar', requireAuth, async (req, res) => {
    try {
        const vinculoId = req.params.id;
        const usuarioAutenticado = req.user._id;
        const roleAutenticado = req.user.role;

        // Buscar vínculo para determinar quem pode aceitar
        const vinculo = await Vinculo.buscarPorId(vinculoId);
        if (!vinculo) {
            return res.status(404).json({
                success: false,
                message: 'Vínculo não encontrado.'
            });
        }

        // Determinar quem pode aceitar conforme o tipo
        let validacao;
        if (vinculo.tipo === TIPOS_VINCULO.SOLICITACAO) {
            // SOLICITACAO: apenas a mecânica aceita
            if (roleAutenticado !== 'MECANICA' && roleAutenticado !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas a mecânica pode aceitar esta solicitação.'
                });
            }
            validacao = await validarPropriedadeVinculo(vinculoId, usuarioAutenticado, usuarioAutenticado);
        } else {
            // CONVITE: apenas o cliente (USER) aceita
            if (roleAutenticado !== 'USER' && roleAutenticado !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas o cliente pode aceitar este convite.'
                });
            }
            validacao = await validarPropriedadeVinculo(vinculoId, usuarioAutenticado);
        }

        if (!validacao.valido) {
            return res.status(validacao.status).json({
                success: false,
                message: validacao.erro
            });
        }

        // Validar status
        if (vinculo.status !== ESTADOS_VINCULO.PENDENTE) {
            return res.status(400).json({
                success: false,
                message: `Vínculo não está em status PENDENTE. Status atual: ${vinculo.status}`
            });
        }

        // Aceitar vínculo
        await Vinculo.aceitar(vinculoId);

        // Registrar auditoria
        await registrarAuditoria({
            userId: usuarioAutenticado,
            action: 'ACCEPT_VINCULO',
            resource: 'vinculo',
            resourceId: vinculoId,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Buscar vínculo atualizado
        const vinculoAtualizado = await Vinculo.buscarPorId(vinculoId);

        return res.status(200).json({
            success: true,
            message: 'Vínculo aceito com sucesso.',
            vinculo: vinculoAtualizado
        });
    } catch (error) {
        console.error('Erro ao aceitar vínculo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao aceitar vínculo.'
        });
    }
});

// ============================================================
// POST /api/vinculos/:id/recusar
// PROPÓSITO: Recusar vínculo (muda status para RECUSADO)
// RESTRIÇÃO:
//   - CONVITE (mecânica convida cliente): o cliente (USER) recusa
//   - SOLICITACAO (cliente solicita mecânica): a mecânica (MECANICA) recusa
// VALIDAÇÕES:
//   - Vínculo deve pertencer ao usuário autenticado
//   - Status deve ser PENDENTE
// RETORNA: 200 OK com vínculo atualizado
// ============================================================
router.post('/:id/recusar', requireAuth, async (req, res) => {
    try {
        const vinculoId = req.params.id;
        const usuarioAutenticado = req.user._id;
        const roleAutenticado = req.user.role;

        // Buscar vínculo para determinar quem pode recusar
        const vinculo = await Vinculo.buscarPorId(vinculoId);
        if (!vinculo) {
            return res.status(404).json({
                success: false,
                message: 'Vínculo não encontrado.'
            });
        }

        // Determinar quem pode recusar conforme o tipo
        let validacao;
        if (vinculo.tipo === TIPOS_VINCULO.SOLICITACAO) {
            // SOLICITACAO: apenas a mecânica recusa
            if (roleAutenticado !== 'MECANICA' && roleAutenticado !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas a mecânica pode recusar esta solicitação.'
                });
            }
            validacao = await validarPropriedadeVinculo(vinculoId, usuarioAutenticado, usuarioAutenticado);
        } else {
            // CONVITE: apenas o cliente (USER) recusa
            if (roleAutenticado !== 'USER' && roleAutenticado !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas o cliente pode recusar este convite.'
                });
            }
            validacao = await validarPropriedadeVinculo(vinculoId, usuarioAutenticado);
        }

        if (!validacao.valido) {
            return res.status(validacao.status).json({
                success: false,
                message: validacao.erro
            });
        }

        // Validar status
        if (vinculo.status !== ESTADOS_VINCULO.PENDENTE) {
            return res.status(400).json({
                success: false,
                message: `Vínculo não está em status PENDENTE. Status atual: ${vinculo.status}`
            });
        }

        // Recusar vínculo
        await Vinculo.recusar(vinculoId);

        // Registrar auditoria
        await registrarAuditoria({
            userId: usuarioAutenticado,
            action: 'REJECT_VINCULO',
            resource: 'vinculo',
            resourceId: vinculoId,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Buscar vínculo atualizado
        const vinculoAtualizado = await Vinculo.buscarPorId(vinculoId);

        return res.status(200).json({
            success: true,
            message: 'Vínculo recusado com sucesso.',
            vinculo: vinculoAtualizado
        });
    } catch (error) {
        console.error('Erro ao recusar vínculo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao recusar vínculo.'
        });
    }
});

// ============================================================
// PATCH /api/vinculos/:id/desativar
// PROPÓSITO: Desativar vínculo (muda status para INATIVO)
// RESTRIÇÃO: USER ou MECANICA (quem criou ou é parte do vínculo)
// VALIDAÇÕES:
//   - Vínculo deve pertencer ao usuário autenticado
//   - Status deve ser ATIVO
// RETORNA: 200 OK com vínculo atualizado
// ============================================================
router.patch('/:id/desativar', requireAuth, async (req, res) => {
    try {
        const vinculoId = req.params.id;
        const usuarioAutenticado = req.user._id;
        const roleAutenticado = req.user.role;

        // Buscar vínculo
        const vinculo = await Vinculo.buscarPorId(vinculoId);
        if (!vinculo) {
            return res.status(404).json({
                success: false,
                message: 'Vínculo não encontrado.'
            });
        }

        // Validar propriedade: USER ou MECANICA que faz parte do vínculo
        const ehCliente = vinculo.usuarioId.toString() === usuarioAutenticado.toString();
        const ehMecanica = vinculo.mecanicaId.toString() === usuarioAutenticado.toString();

        if (!ehCliente && !ehMecanica) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado.'
            });
        }

        // Validar role
        if (roleAutenticado === 'USER' && !ehCliente) {
            return res.status(403).json({
                success: false,
                message: 'Apenas o cliente pode desativar este vínculo.'
            });
        }

        if (roleAutenticado === 'MECANICA' && !ehMecanica) {
            return res.status(403).json({
                success: false,
                message: 'Apenas a mecânica pode desativar este vínculo.'
            });
        }

        // Validar status
        if (vinculo.status !== ESTADOS_VINCULO.ATIVO) {
            return res.status(400).json({
                success: false,
                message: `Vínculo não está em status ATIVO. Status atual: ${vinculo.status}`
            });
        }

        // Desativar vínculo
        await Vinculo.desativar(vinculoId);

        // Registrar auditoria
        await registrarAuditoria({
            userId: usuarioAutenticado,
            action: 'DEACTIVATE_VINCULO',
            resource: 'vinculo',
            resourceId: vinculoId,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Buscar vínculo atualizado
        const vinculoAtualizado = await Vinculo.buscarPorId(vinculoId);

        return res.status(200).json({
            success: true,
            message: 'Vínculo desativado com sucesso.',
            vinculo: vinculoAtualizado
        });
    } catch (error) {
        console.error('Erro ao desativar vínculo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao desativar vínculo.'
        });
    }
});

// ============================================================
// PATCH /api/vinculos/:id/bloquear
// PROPÓSITO: Bloquear vínculo (muda status para BLOQUEADO)
// RESTRIÇÃO: Apenas ADMIN
// VALIDAÇÕES:
//   - Status não deve ser BLOQUEADO
// RETORNA: 200 OK com vínculo atualizado
// ============================================================
router.patch('/:id/bloquear', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
        const vinculoId = req.params.id;
        const usuarioAutenticado = req.user._id;

        // Buscar vínculo
        const vinculo = await Vinculo.buscarPorId(vinculoId);
        if (!vinculo) {
            return res.status(404).json({
                success: false,
                message: 'Vínculo não encontrado.'
            });
        }

        // Validar status
        if (vinculo.status === ESTADOS_VINCULO.BLOQUEADO) {
            return res.status(400).json({
                success: false,
                message: 'Vínculo já está bloqueado.'
            });
        }

        // Bloquear vínculo
        await Vinculo.bloquear(vinculoId);

        // Registrar auditoria
        await registrarAuditoria({
            userId: usuarioAutenticado,
            action: 'BLOCK_VINCULO',
            resource: 'vinculo',
            resourceId: vinculoId,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Buscar vínculo atualizado
        const vinculoAtualizado = await Vinculo.buscarPorId(vinculoId);

        return res.status(200).json({
            success: true,
            message: 'Vínculo bloqueado com sucesso.',
            vinculo: vinculoAtualizado
        });
    } catch (error) {
        console.error('Erro ao bloquear vínculo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao bloquear vínculo.'
        });
    }
});

// ============================================================
// PATCH /api/vinculos/:id/desbloquear
// PROPÓSITO: Desbloquear vínculo (volta para ATIVO)
// RESTRIÇÃO: Apenas ADMIN
// VALIDAÇÕES:
//   - Status deve ser BLOQUEADO
// RETORNA: 200 OK com vínculo atualizado
// ============================================================
router.patch('/:id/desbloquear', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
        const vinculoId = req.params.id;
        const usuarioAutenticado = req.user._id;

        // Buscar vínculo
        const vinculo = await Vinculo.buscarPorId(vinculoId);
        if (!vinculo) {
            return res.status(404).json({
                success: false,
                message: 'Vínculo não encontrado.'
            });
        }

        // Validar status
        if (vinculo.status !== ESTADOS_VINCULO.BLOQUEADO) {
            return res.status(400).json({
                success: false,
                message: `Vínculo não está em status BLOQUEADO. Status atual: ${vinculo.status}`
            });
        }

        // Desbloquear vínculo
        await Vinculo.desbloquear(vinculoId);

        // Registrar auditoria
        await registrarAuditoria({
            userId: usuarioAutenticado,
            action: 'UNBLOCK_VINCULO',
            resource: 'vinculo',
            resourceId: vinculoId,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Buscar vínculo atualizado
        const vinculoAtualizado = await Vinculo.buscarPorId(vinculoId);

        return res.status(200).json({
            success: true,
            message: 'Vínculo desbloqueado com sucesso.',
            vinculo: vinculoAtualizado
        });
    } catch (error) {
        console.error('Erro ao desbloquear vínculo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao desbloquear vínculo.'
        });
    }
});

export default router;
