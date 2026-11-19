// Importa a função que retorna a instância do banco de dados conectado
import { getBanco } from '../config/database.js';

// Importa ObjectId do MongoDB para manipular IDs
// MongoDB usa ObjectId (12 bytes) ao invés de números sequenciais
import { ObjectId } from 'mongodb';

const COLECAO = 'notificacoes';

class Notificacao {
    // Cria uma notificação
    static async criarNotificacao({ usuarioId, veiculoId, tipo, mensagem, dataVencimento }) {
        const db = getBanco();
        return await db.collection(COLECAO).insertOne({ // retorna as infos de db na COLECAO
            usuarioId: new ObjectId(usuarioId),
            veiculoId: new ObjectId(veiculoId),
            tipo,
            mensagem,
            dataVencimento,
            status: 'pendente',
            criadaEm: new Date() 
        });
    }

    // Verifica se já existe notificação pendente para o mesmo veículo e tipo
    static async existePendente({ usuarioId, veiculoId, tipo }) {
        const db = getBanco();
        const encontrada = await db.collection(COLECAO).findOne({
            usuarioId: new ObjectId(usuarioId),
            veiculoId: new ObjectId(veiculoId),
            tipo,
            status: 'pendente'
        });
        return Boolean(encontrada);
    }

    // Busca uma notificação pelo ID
    static async buscarPorId(id) {
        const db = getBanco();
        return await db.collection(COLECAO).findOne({ _id: new ObjectId(id) });
    }

    // Conclui todas as notificações pendentes de um veículo para um tipo de manutenção.
    // Chamado quando uma manutenção é registrada: a pendência deixou de existir,
    // então a notificação não pode continuar contando no badge do header.
    static async concluirPorTipo({ veiculoId, tipo }) {
        const db = getBanco();
        return await db.collection(COLECAO).updateMany(
            { veiculoId: new ObjectId(veiculoId), tipo, status: 'pendente' },
            { $set: { status: 'concluida', concluidaEm: new Date() } }
        );
    }

    // Lista notificações pendentes de um usuário
    // Ignora notificações de veículos já excluídos, que não têm mais para onde levar
    static async listarPendentes(usuarioId) {
        const db = getBanco();
        const pendentes = await db.collection(COLECAO)
            .find({ usuarioId: new ObjectId(usuarioId), status: 'pendente' })
            .toArray();

        if (pendentes.length === 0) return pendentes;

        // Busca em uma única consulta quais veículos ainda existem
        const idsVeiculos = pendentes.map(n => n.veiculoId);
        const existentes = await db.collection('veiculos')
            .find({ _id: { $in: idsVeiculos } })
            .project({ _id: 1 })
            .toArray();

        const idsExistentes = new Set(existentes.map(v => String(v._id)));
        return pendentes.filter(n => idsExistentes.has(String(n.veiculoId)));
    }

    // Marca como concluída
    static async marcarComoConcluida(id) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'concluida', concluidaEm: new Date() } }
        );
    }

    // Adia uma notificação: mantém o status pendente e move a data de vencimento
    // (antes gravava status 'adiada', que sumia da listagem de pendentes)
    static async adiarNotificacao(id, novaData) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { dataVencimento: novaData } }
        );
    }
}

export default Notificacao;
