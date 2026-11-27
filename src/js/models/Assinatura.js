// ============================================================
// ARQUIVO: models/Assinatura.js
// DESCRIÇÃO: Histórico de cobranças do plano Pro
// ============================================================
// POR QUE UMA COLEÇÃO SEPARADA: o documento do usuário guarda o estado
// atual (plano e planoExpiraEm); esta coleção guarda a trilha de cada
// cobrança. Nunca sobrescreva o histórico para "corrigir" o plano.
//
// ESTRUTURA DO DOCUMENTO:
// {
//   _id: ObjectId,
//   userId: ObjectId,
//   gateway: "infinitepay",
//   orderNsu: String (único),
//   transactionNsu: String | null,
//   slug: String | null,
//   status: "pendente" | "pago" | "cancelado",
//   valorCentavos: Number,
//   criadoEm: Date,
//   pagoEm: Date | null
// }
//
// USADO POR: routes/pagamento.routes.js
// ============================================================

import { getBanco } from '../config/database.js';
import { ObjectId } from 'mongodb';

const COLECAO = 'assinaturas';

class Assinatura {

    // ========================================================
    // MÉTODO: garantirIndices()
    // PROPÓSITO: Cria o índice único em orderNsu
    // POR QUE IMPORTA: o webhook pode chegar duas vezes para o mesmo
    // pedido. O índice único transforma a duplicata em erro de escrita,
    // que a rota trata como sucesso silencioso (idempotência).
    // CHAMADO POR: server.js na inicialização
    // ========================================================
    static async garantirIndices() {
        const db = getBanco();
        await db.collection(COLECAO).createIndex({ orderNsu: 1 }, { unique: true });
        await db.collection(COLECAO).createIndex({ userId: 1, criadoEm: -1 });
    }

    // Registra uma cobrança recém-criada no gateway
    static async criar({ userId, orderNsu, valorCentavos }) {
        const db = getBanco();
        return await db.collection(COLECAO).insertOne({
            userId: new ObjectId(userId),
            gateway: 'infinitepay',
            orderNsu,
            transactionNsu: null,
            slug: null,
            status: 'pendente',
            valorCentavos,
            criadoEm: new Date(),
            pagoEm: null
        });
    }

    // Busca a cobrança pelo identificador do pedido
    static async buscarPorOrderNsu(orderNsu) {
        const db = getBanco();
        return await db.collection(COLECAO).findOne({ orderNsu });
    }

    // ========================================================
    // MÉTODO: marcarPaga(orderNsu, { transactionNsu, slug })
    // PROPÓSITO: Marca a cobrança como paga
    // RETORNO: resultado do updateOne; modifiedCount 0 significa que já
    // estava paga, e a rota usa isso para não estender o prazo duas vezes.
    // ========================================================
    static async marcarPaga(orderNsu, { transactionNsu, slug }) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { orderNsu, status: { $ne: 'pago' } },
            {
                $set: {
                    status: 'pago',
                    transactionNsu: transactionNsu || null,
                    slug: slug || null,
                    pagoEm: new Date()
                }
            }
        );
    }

    // Lista o histórico do usuário, mais recente primeiro
    static async listarDoUsuario(userId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({ userId: new ObjectId(userId) })
            .sort({ criadoEm: -1 })
            .limit(20)
            .toArray();
    }
}

export default Assinatura;
