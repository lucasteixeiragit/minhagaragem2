// ============================================================
// ARQUIVO: models/Atendimento.js
// DESCRIÇÃO: Model para a relação Mecânica ↔ Veículo ↔ Proprietário
// ============================================================
// ESTRUTURA DO DOCUMENTO:
// {
//   _id: ObjectId,
//   mechanicId: ObjectId,   // usuário MECANICA
//   vehicleId: ObjectId,    // veículo atendido
//   ownerId: ObjectId,      // proprietário do veículo
//   status: "aberto" | "concluido" | "cancelado",
//   createdAt: Date,
//   updatedAt: Date
// }
// A mecânica só acessa um veículo se existir um atendimento válido
// que a relacione a ele. Isso impede acesso arbitrário por ID.
// ============================================================

import { getBanco } from '../config/database.js';
import { ObjectId } from 'mongodb';

const COLECAO = 'atendimentos';

class Atendimento {

    // ========================================================
    // MÉTODO: criar({ mechanicId, vehicleId, ownerId })
    // PROPÓSITO: Cria um atendimento (vínculo mecânica-veículo)
    // ========================================================
    static async criar({ mechanicId, vehicleId, ownerId }) {
        const db = getBanco();
        const agora = new Date();
        return await db.collection(COLECAO).insertOne({
            mechanicId: new ObjectId(mechanicId),
            vehicleId: new ObjectId(vehicleId),
            ownerId: new ObjectId(ownerId),
            status: 'aberto',
            createdAt: agora,
            updatedAt: agora
        });
    }

    // ========================================================
    // MÉTODO: buscarPorMecanicaEVeiculo(mechanicId, vehicleId)
    // PROPÓSITO: Verifica se a mecânica tem acesso a um veículo
    // ========================================================
    static async buscarPorMecanicaEVeiculo(mechanicId, vehicleId) {
        const db = getBanco();
        return await db.collection(COLECAO).findOne({
            mechanicId: new ObjectId(mechanicId),
            vehicleId: new ObjectId(vehicleId),
            status: 'aberto'
        });
    }

    // ========================================================
    // MÉTODO: listarVeiculosDaMecanica(mechanicId)
    // PROPÓSITO: Lista os veículos que a mecânica pode atender
    // ========================================================
    static async listarVeiculosDaMecanica(mechanicId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({ mechanicId: new ObjectId(mechanicId), status: 'aberto' })
            .toArray();
    }

    // ========================================================
    // MÉTODO: listarPorVeiculo(vehicleId)
    // PROPÓSITO: Lista atendimentos de um veículo
    // ========================================================
    static async listarPorVeiculo(vehicleId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({ vehicleId: new ObjectId(vehicleId) })
            .toArray();
    }

    // ========================================================
    // MÉTODO: concluir(id)
    // PROPÓSITO: Marca um atendimento como concluído
    // ========================================================
    static async concluir(id) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'concluido', updatedAt: new Date() } }
        );
    }

    // ========================================================
    // MÉTODO: listarTodos()
    // PROPÓSITO: Lista todos os atendimentos (uso administrativo)
    // ========================================================
    static async listarTodos() {
        const db = getBanco();
        return await db.collection(COLECAO).find().toArray();
    }
}

export default Atendimento;
