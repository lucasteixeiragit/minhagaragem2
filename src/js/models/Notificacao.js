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

    // Lista notificações pendentes de um usuário
    static async listarPendentes(usuarioId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({ usuarioId: new ObjectId(usuarioId), status: 'pendente' })
            .toArray();
    }

    // Marca como concluída
    static async marcarComoConcluida(id) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'concluida', concluidaEm: new Date() } }
        );
    }

    // Adia uma notificação
    static async adiarNotificacao(id, novaData) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { dataVencimento: novaData, status: 'adiada' } }
        );
    }
}

export default Notificacao;
