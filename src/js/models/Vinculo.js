// ============================================================
// ARQUIVO: models/Vinculo.js
// DESCRIÇÃO: Model para a relação Cliente (USER) ↔ Mecânica
// ============================================================
// ESTRUTURA DO DOCUMENTO:
// {
//   _id: ObjectId,
//   usuarioId: ObjectId,      // cliente (USER)
//   mecanicaId: ObjectId,     // mecânica
//   status: "PENDENTE" | "ATIVO" | "RECUSADO" | "INATIVO" | "BLOQUEADO",
//   criadoEm: Date,
//   atualizadoEm: Date,
//   criadoPor: ObjectId,      // quem criou o vínculo (usuarioId ou mecanicaId)
//   dataAceite: Date,         // quando foi aceito (null se ainda PENDENTE)
//   dataRecusa: Date,         // quando foi recusado
//   dataDesativacao: Date,    // quando foi desativado
//   tipo: "CONVITE" | "SOLICITACAO"  // quem iniciou
// }
//
// ESTADOS:
// - PENDENTE: Convite/solicitação ainda não foi aceito
// - ATIVO: Relacionamento válido e com acesso permitido
// - RECUSADO: Uma das partes recusou a solicitação
// - INATIVO: O vínculo existiu, mas foi encerrado
// - BLOQUEADO: O vínculo foi bloqueado por ação administrativa
//
// REGRA CRÍTICA DE SEGURANÇA:
// Somente vínculos com status = "ATIVO" concedem acesso aos veículos/manutenções.
// ============================================================

import { getBanco } from '../config/database.js';
import { ObjectId } from 'mongodb';

const COLECAO = 'vinculos';

// Estados válidos do vínculo
export const ESTADOS_VINCULO = {
    PENDENTE: 'PENDENTE',
    ATIVO: 'ATIVO',
    RECUSADO: 'RECUSADO',
    INATIVO: 'INATIVO',
    BLOQUEADO: 'BLOQUEADO'
};

// Tipos de vínculo (quem iniciou)
export const TIPOS_VINCULO = {
    CONVITE: 'CONVITE',           // Mecânica convida cliente
    SOLICITACAO: 'SOLICITACAO'    // Cliente solicita mecânica
};

class Vinculo {

    // ========================================================
    // MÉTODO: criar({ usuarioId, mecanicaId, criadoPor, tipo })
    // PROPÓSITO: Cria um novo vínculo (PENDENTE)
    // PARÂMETROS:
    //   - usuarioId: ObjectId do cliente (USER)
    //   - mecanicaId: ObjectId da mecânica
    //   - criadoPor: ObjectId de quem criou (usuarioId ou mecanicaId)
    //   - tipo: "CONVITE" ou "SOLICITACAO"
    // RETORNA: Resultado { insertedId }
    // VALIDAÇÕES:
    //   - usuarioId !== mecanicaId
    //   - Não permitir vínculo duplicado (mesmo usuarioId + mecanicaId)
    // ========================================================
    static async criar({ usuarioId, mecanicaId, criadoPor, tipo = TIPOS_VINCULO.CONVITE }) {
        const db = getBanco();

        // Validação: usuário e mecânica devem ser diferentes
        if (usuarioId === mecanicaId) {
            throw new Error('Um usuário não pode ser vinculado a si mesmo');
        }

        // Validação: tipo deve ser válido
        if (!Object.values(TIPOS_VINCULO).includes(tipo)) {
            throw new Error('Tipo de vínculo inválido');
        }

        // Conversão para ObjectId
        const usuarioIdObj = new ObjectId(usuarioId);
        const mecanicaIdObj = new ObjectId(mecanicaId);
        const criadoPorObj = new ObjectId(criadoPor);

        // Verificar se já existe vínculo entre este usuário e mecânica
        const vinculoExistente = await db.collection(COLECAO).findOne({
            usuarioId: usuarioIdObj,
            mecanicaId: mecanicaIdObj
        });

        // Se já existe um vínculo ATIVO, PENDENTE ou BLOQUEADO, não permitir duplicar
        if (vinculoExistente && [ESTADOS_VINCULO.ATIVO, ESTADOS_VINCULO.PENDENTE, ESTADOS_VINCULO.BLOQUEADO].includes(vinculoExistente.status)) {
            throw new Error('Já existe um vínculo entre este usuário e esta mecânica');
        }

        const agora = new Date();

        // Se existe um vínculo INATIVO ou RECUSADO, reativá-lo (volta para PENDENTE)
        if (vinculoExistente) {
            const resultado = await db.collection(COLECAO).updateOne(
                { _id: vinculoExistente._id },
                {
                    $set: {
                        status: ESTADOS_VINCULO.PENDENTE,
                        atualizadoEm: agora,
                        criadoPor: criadoPorObj,
                        dataAceite: null,
                        dataRecusa: null,
                        dataDesativacao: null,
                        tipo
                    }
                }
            );
            return { ...resultado, insertedId: vinculoExistente._id, reativado: true };
        }

        const resultado = await db.collection(COLECAO).insertOne({
            usuarioId: usuarioIdObj,
            mecanicaId: mecanicaIdObj,
            status: ESTADOS_VINCULO.PENDENTE,
            criadoEm: agora,
            atualizadoEm: agora,
            criadoPor: criadoPorObj,
            dataAceite: null,
            dataRecusa: null,
            dataDesativacao: null,
            tipo
        });

        return resultado;
    }

    // ========================================================
    // MÉTODO: buscarPorId(id)
    // PROPÓSITO: Busca um vínculo pelo ID
    // PARÂMETROS:
    //   - id: String com ID do vínculo
    // RETORNA: Documento do vínculo ou null
    // ========================================================
    static async buscarPorId(id) {
        const db = getBanco();
        try {
            return await db.collection(COLECAO).findOne({ _id: new ObjectId(id) });
        } catch {
            return null;
        }
    }

    // ========================================================
    // MÉTODO: buscarPorUsuarioEMecanica(usuarioId, mecanicaId)
    // PROPÓSITO: Verifica se existe vínculo entre usuário e mecânica
    // PARÂMETROS:
    //   - usuarioId: ObjectId do cliente
    //   - mecanicaId: ObjectId da mecânica
    // RETORNA: Documento do vínculo ou null
    // IMPORTANTE: Retorna qualquer status (PENDENTE, ATIVO, RECUSADO, etc)
    // ========================================================
    static async buscarPorUsuarioEMecanica(usuarioId, mecanicaId) {
        const db = getBanco();
        try {
            return await db.collection(COLECAO).findOne({
                usuarioId: new ObjectId(usuarioId),
                mecanicaId: new ObjectId(mecanicaId)
            });
        } catch {
            return null;
        }
    }

    // ========================================================
    // MÉTODO: buscarAtivoEntre(usuarioId, mecanicaId)
    // PROPÓSITO: Verifica se existe vínculo ATIVO entre usuário e mecânica
    // PARÂMETROS:
    //   - usuarioId: ObjectId do cliente
    //   - mecanicaId: ObjectId da mecânica
    // RETORNA: Documento do vínculo ou null
    // IMPORTANTE: Retorna APENAS se status = "ATIVO"
    // USADO PARA: Autorização de acesso a veículos/manutenções
    // ========================================================
    static async buscarAtivoEntre(usuarioId, mecanicaId) {
        const db = getBanco();
        try {
            return await db.collection(COLECAO).findOne({
                usuarioId: new ObjectId(usuarioId),
                mecanicaId: new ObjectId(mecanicaId),
                status: ESTADOS_VINCULO.ATIVO
            });
        } catch {
            return null;
        }
    }

    // ========================================================
    // MÉTODO: listarDoUsuario(usuarioId)
    // PROPÓSITO: Lista todos os vínculos de um cliente
    // PARÂMETROS:
    //   - usuarioId: ObjectId do cliente
    // RETORNA: Array de vínculos
    // USADO EM: Frontend do cliente (ver suas mecânicas)
    // ========================================================
    static async listarDoUsuario(usuarioId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({ usuarioId: new ObjectId(usuarioId) })
            .sort({ atualizadoEm: -1 })
            .toArray();
    }

    // ========================================================
    // MÉTODO: listarDaMecanica(mecanicaId)
    // PROPÓSITO: Lista todos os vínculos de uma mecânica
    // PARÂMETROS:
    //   - mecanicaId: ObjectId da mecânica
    // RETORNA: Array de vínculos
    // USADO EM: Frontend da mecânica (ver seus clientes)
    // ========================================================
    static async listarDaMecanica(mecanicaId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({ mecanicaId: new ObjectId(mecanicaId) })
            .sort({ atualizadoEm: -1 })
            .toArray();
    }

    // ========================================================
    // MÉTODO: listarAtivosDoUsuario(usuarioId)
    // PROPÓSITO: Lista apenas os vínculos ATIVOS de um cliente
    // PARÂMETROS:
    //   - usuarioId: ObjectId do cliente
    // RETORNA: Array de vínculos com status = "ATIVO"
    // ========================================================
    static async listarAtivosDoUsuario(usuarioId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({
                usuarioId: new ObjectId(usuarioId),
                status: ESTADOS_VINCULO.ATIVO
            })
            .sort({ atualizadoEm: -1 })
            .toArray();
    }

    // ========================================================
    // MÉTODO: listarAtivosDaMecanica(mecanicaId)
    // PROPÓSITO: Lista apenas os vínculos ATIVOS de uma mecânica
    // PARÂMETROS:
    //   - mecanicaId: ObjectId da mecânica
    // RETORNA: Array de vínculos com status = "ATIVO"
    // IMPORTANTE: Mecânica só acessa clientes com vínculo ATIVO
    // ========================================================
    static async listarAtivosDaMecanica(mecanicaId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({
                mecanicaId: new ObjectId(mecanicaId),
                status: ESTADOS_VINCULO.ATIVO
            })
            .sort({ atualizadoEm: -1 })
            .toArray();
    }

    // ========================================================
    // MÉTODO: listarPendentesDoUsuario(usuarioId)
    // PROPÓSITO: Lista solicitações/convites PENDENTES para um cliente
    // PARÂMETROS:
    //   - usuarioId: ObjectId do cliente
    // RETORNA: Array de vínculos com status = "PENDENTE"
    // USADO EM: Frontend do cliente (ver convites para aceitar/recusar)
    // ========================================================
    static async listarPendentesDoUsuario(usuarioId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({
                usuarioId: new ObjectId(usuarioId),
                status: ESTADOS_VINCULO.PENDENTE
            })
            .sort({ criadoEm: -1 })
            .toArray();
    }

    // ========================================================
    // MÉTODO: listarPendentesDaMecanica(mecanicaId)
    // PROPÓSITO: Lista solicitações/convites PENDENTES para uma mecânica
    // PARÂMETROS:
    //   - mecanicaId: ObjectId da mecânica
    // RETORNA: Array de vínculos com status = "PENDENTE"
    // USADO EM: Frontend da mecânica (ver solicitações de clientes)
    // ========================================================
    static async listarPendentesDaMecanica(mecanicaId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({
                mecanicaId: new ObjectId(mecanicaId),
                status: ESTADOS_VINCULO.PENDENTE
            })
            .sort({ criadoEm: -1 })
            .toArray();
    }

    // ========================================================
    // MÉTODO: aceitar(id)
    // PROPÓSITO: Aceita um vínculo (muda status para ATIVO)
    // PARÂMETROS:
    //   - id: String com ID do vínculo
    // RETORNA: Resultado da atualização
    // VALIDAÇÕES:
    //   - Vínculo deve estar em status PENDENTE
    // ========================================================
    static async aceitar(id) {
        const db = getBanco();
        const agora = new Date();

        const resultado = await db.collection(COLECAO).updateOne(
            {
                _id: new ObjectId(id),
                status: ESTADOS_VINCULO.PENDENTE
            },
            {
                $set: {
                    status: ESTADOS_VINCULO.ATIVO,
                    dataAceite: agora,
                    atualizadoEm: agora
                }
            }
        );

        if (resultado.matchedCount === 0) {
            throw new Error('Vínculo não encontrado ou não está em status PENDENTE');
        }

        return resultado;
    }

    // ========================================================
    // MÉTODO: recusar(id)
    // PROPÓSITO: Recusa um vínculo (muda status para RECUSADO)
    // PARÂMETROS:
    //   - id: String com ID do vínculo
    // RETORNA: Resultado da atualização
    // VALIDAÇÕES:
    //   - Vínculo deve estar em status PENDENTE
    // ========================================================
    static async recusar(id) {
        const db = getBanco();
        const agora = new Date();

        const resultado = await db.collection(COLECAO).updateOne(
            {
                _id: new ObjectId(id),
                status: ESTADOS_VINCULO.PENDENTE
            },
            {
                $set: {
                    status: ESTADOS_VINCULO.RECUSADO,
                    dataRecusa: agora,
                    atualizadoEm: agora
                }
            }
        );

        if (resultado.matchedCount === 0) {
            throw new Error('Vínculo não encontrado ou não está em status PENDENTE');
        }

        return resultado;
    }

    // ========================================================
    // MÉTODO: desativar(id)
    // PROPÓSITO: Desativa um vínculo (muda status para INATIVO)
    // PARÂMETROS:
    //   - id: String com ID do vínculo
    // RETORNA: Resultado da atualização
    // VALIDAÇÕES:
    //   - Vínculo deve estar em status ATIVO
    // IMPORTANTE: Preserva histórico (não apaga o documento)
    // ========================================================
    static async desativar(id) {
        const db = getBanco();
        const agora = new Date();

        const resultado = await db.collection(COLECAO).updateOne(
            {
                _id: new ObjectId(id),
                status: ESTADOS_VINCULO.ATIVO
            },
            {
                $set: {
                    status: ESTADOS_VINCULO.INATIVO,
                    dataDesativacao: agora,
                    atualizadoEm: agora
                }
            }
        );

        if (resultado.matchedCount === 0) {
            throw new Error('Vínculo não encontrado ou não está em status ATIVO');
        }

        return resultado;
    }

    // ========================================================
    // MÉTODO: bloquear(id)
    // PROPÓSITO: Bloqueia um vínculo (muda status para BLOQUEADO)
    // PARÂMETROS:
    //   - id: String com ID do vínculo
    // RETORNA: Resultado da atualização
    // IMPORTANTE: Somente ADMIN pode bloquear
    // IMPORTANTE: Preserva histórico (não apaga o documento)
    // ========================================================
    static async bloquear(id) {
        const db = getBanco();
        const agora = new Date();

        const resultado = await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: ESTADOS_VINCULO.BLOQUEADO,
                    atualizadoEm: agora
                }
            }
        );

        if (resultado.matchedCount === 0) {
            throw new Error('Vínculo não encontrado');
        }

        return resultado;
    }

    // ========================================================
    // MÉTODO: desbloquear(id)
    // PROPÓSITO: Desbloqueia um vínculo (volta para ATIVO)
    // PARÂMETROS:
    //   - id: String com ID do vínculo
    // RETORNA: Resultado da atualização
    // IMPORTANTE: Somente ADMIN pode desbloquear
    // ========================================================
    static async desbloquear(id) {
        const db = getBanco();
        const agora = new Date();

        const resultado = await db.collection(COLECAO).updateOne(
            {
                _id: new ObjectId(id),
                status: ESTADOS_VINCULO.BLOQUEADO
            },
            {
                $set: {
                    status: ESTADOS_VINCULO.ATIVO,
                    atualizadoEm: agora
                }
            }
        );

        if (resultado.matchedCount === 0) {
            throw new Error('Vínculo não encontrado ou não está em status BLOQUEADO');
        }

        return resultado;
    }

    // ========================================================
    // MÉTODO: listarAtivos()
    // PROPÓSITO: Lista todos os vínculos ATIVOS (uso administrativo)
    // RETORNA: Array de vínculos com status = "ATIVO"
    // ========================================================
    static async listarAtivos() {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({ status: ESTADOS_VINCULO.ATIVO })
            .sort({ atualizadoEm: -1 })
            .toArray();
    }

    // ========================================================
    // MÉTODO: listarTodos()
    // PROPÓSITO: Lista todos os vínculos (uso administrativo)
    // RETORNA: Array de todos os vínculos
    // ========================================================
    static async listarTodos() {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find()
            .sort({ atualizadoEm: -1 })
            .toArray();
    }

    // ========================================================
    // MÉTODO: listarPorStatus(status)
    // PROPÓSITO: Lista vínculos por status específico
    // PARÂMETROS:
    //   - status: Um dos ESTADOS_VINCULO
    // RETORNA: Array de vínculos com aquele status
    // ========================================================
    static async listarPorStatus(status) {
        const db = getBanco();
        if (!Object.values(ESTADOS_VINCULO).includes(status)) {
            throw new Error('Status inválido');
        }
        return await db.collection(COLECAO)
            .find({ status })
            .sort({ atualizadoEm: -1 })
            .toArray();
    }

    // ========================================================
    // MÉTODO: contarAtivosDaMecanica(mecanicaId)
    // PROPÓSITO: Conta quantos clientes ativos uma mecânica tem
    // PARÂMETROS:
    //   - mecanicaId: ObjectId da mecânica
    // RETORNA: Número de vínculos ativos
    // ========================================================
    static async contarAtivosDaMecanica(mecanicaId) {
        const db = getBanco();
        return await db.collection(COLECAO).countDocuments({
            mecanicaId: new ObjectId(mecanicaId),
            status: ESTADOS_VINCULO.ATIVO
        });
    }

    // ========================================================
    // MÉTODO: contarAtivosDoUsuario(usuarioId)
    // PROPÓSITO: Conta quantas mecânicas ativas um cliente tem
    // PARÂMETROS:
    //   - usuarioId: ObjectId do cliente
    // RETORNA: Número de vínculos ativos
    // ========================================================
    static async contarAtivosDoUsuario(usuarioId) {
        const db = getBanco();
        return await db.collection(COLECAO).countDocuments({
            usuarioId: new ObjectId(usuarioId),
            status: ESTADOS_VINCULO.ATIVO
        });
    }

    // ========================================================
    // MÉTODO: criarIndices()
    // PROPÓSITO: Cria índices MongoDB para otimizar queries
    // IMPORTANTE: Deve ser chamado uma única vez na inicialização
    // ========================================================
    static async criarIndices() {
        const db = getBanco();
        const colecao = db.collection(COLECAO);

        try {
            // Índice simples em usuarioId
            await colecao.createIndex({ usuarioId: 1 });

            // Índice simples em mecanicaId
            await colecao.createIndex({ mecanicaId: 1 });

            // Índice simples em status
            await colecao.createIndex({ status: 1 });

            // Índice composto: usuarioId + mecanicaId (ÚNICO para evitar duplicatas)
            await colecao.createIndex(
                { usuarioId: 1, mecanicaId: 1 },
                { unique: true }
            );

            // Índice composto: mecanicaId + status (para queries frequentes)
            await colecao.createIndex({ mecanicaId: 1, status: 1 });

            // Índice composto: usuarioId + status (para queries frequentes)
            await colecao.createIndex({ usuarioId: 1, status: 1 });

            // Índice em criadoEm (para ordenação)
            await colecao.createIndex({ criadoEm: -1 });

            // Índice em atualizadoEm (para ordenação)
            await colecao.createIndex({ atualizadoEm: -1 });

            console.log('Índices da coleção "vinculos" criados com sucesso');
        } catch (erro) {
            console.error('Erro ao criar índices:', erro.message);
            // Não lançar erro se índices já existem
            if (!erro.message.includes('already exists')) {
                throw erro;
            }
        }
    }
}

export default Vinculo;
