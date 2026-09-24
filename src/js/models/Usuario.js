// ============================================================
// ARQUIVO: models/Usuario.js
// DESCRIÇÃO: Model para manipular dados de usuários
// ============================================================
// ESTRUTURA DO DOCUMENTO:
// {
//   _id: ObjectId,
//   nome: String,
//   email: String (normalizado, único),
//   senhaHash: String (bcrypt),
//   role: "USER" | "MECANICA" | "ADMIN",
//   ativo: Boolean,
//   createdAt: Date,
//   updatedAt: Date,
//   lastLoginAt: Date
// }
// NUNCA armazenar senha em texto puro.
// ============================================================

// OPERACOES NO BANCO: findOne - InsertOne - updateOne - deleteOne

// São operadores do MongoDB para atualização:
// $set → define/atualiza um campo. Se o campo não existe, cria.
// $unset → remove um campo do documento.

import { get } from 'browser-sync';
import { getBanco } from '../config/database.js';
import { ObjectId } from 'mongodb';

const COLECAO = 'usuarios';

// Roles válidos do sistema
export const ROLES = ['USER', 'MECANICA', 'ADMIN'];

class Usuario {

    // ========================================================
    // MÉTODO: buscarPorEmail(email)
    // PROPÓSITO: Busca usuário pelo email (normalizado)
    // ========================================================
    static async buscarPorEmail(email) {
        const db = getBanco();
        return await db.collection(COLECAO).findOne({ email: email.toLowerCase().trim() });
    }

    // ========================================================
    // MÉTODO: buscarPorId(id)
    // PROPÓSITO: Busca usuário pelo ID
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
    // MÉTODO: criar({ nome, email, senhaHash, role })
    // PROPÓSITO: Cria um novo usuário
    // ========================================================
    static async criar({ nome, email, senhaHash, role = 'USER' }) {
        const db = getBanco();
        const agora = new Date();
        const resultado = await db.collection(COLECAO).insertOne({
            nome: nome.trim(),
            email: email.toLowerCase().trim(),
            senhaHash,
            role,
            ativo: true,
            createdAt: agora,
            updatedAt: agora,
            lastLoginAt: null
        });
        return resultado;
    }

    // ========================================================
    // MÉTODO: atualizar(id, dados)
    // PROPÓSITO: Atualiza campos permitidos de um usuário
    // ========================================================
    static async atualizar(id, dados) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...dados, updatedAt: new Date() } }
        );
    }

    // ========================================================
    // MÉTODO: atualizarSenha(id, senhaHash)
    // PROPÓSITO: Atualiza apenas o hash da senha
    // ========================================================
    static async atualizarSenha(id, senhaHash) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { senhaHash, updatedAt: new Date() } }
        );
    }

    // ========================================================
    // MÉTODO: registrarLogin(id)
    // PROPÓSITO: Atualiza o timestamp do último login
    // ========================================================
    static async registrarLogin(id) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { lastLoginAt: new Date() } }
        );
    }

    // ========================================================
    // MÉTODO: salvarTokenRedefinicao(id, token, expireEm)
    // PROPÓSITO: Armazena o token de redefinição de senha
    // ========================================================
    static async salvarTokenRedefinicao(id, token, expiraEm) { //recebe 3 coisas: o ID do usuário, o token gerado, e a data/hora em que ele expira.
        const db = getBanco();
        return await db.collection(COLECAO).updateOne( //"encontre o usuário com esse ID". O new ObjectId(id) é necessário porque no MongoDB o _id não é uma string comum — é um tipo especial chamado ObjectId. Por isso todos os métodos do arquivo fazem essa conversão.
            {_id: new ObjectId(id)}, 
            {$set: {resetToken: token, resetTokenExpira: expiraEm, updatedAt: new Date()}} //  "grave esses 3 campos". O updatedAt é atualizado em todo método, seguindo o padrão do arquivo.
        );
    }

    // ========================================================
    // MÉTODO: buscarPorTokenRedefinicao(token)
    // PROPÓSITO: Busca usuário por token de redefinição válido
    // ========================================================
    static async buscarPorTokenRedefinicao(token) {
        const db = getBanco();
        return await db.collection(COLECAO).findOne({ //"encontre o usuário cujo resetToken seja igual a este token".
            resetToken: token,
            resetTokenExpira: {$gt: new Date() } //$gt significa "maior que" (greater than). Ou seja: "o campo resetTokenExpira deve ser maior que agora". Se o token expirou, a data de validade é menor que agora, e o findOne não encontra ninguém → retorna null.
            }
        );
    }

    // ========================================================
    // MÉTODO: limparTokenRedefinicao(id)
    // PROPÓSITO: Remove o token após a redefinição ser concluída
    // ========================================================
    static async limparTokenRedefinicao(id) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            {_id: new ObjectId(id)},
            {$unset: {resetToken: '', resetTokenExpira: ''}, $set: {updatedAt: new Date()}} //remove os dois campos do documento. O valor '' é ignorado — o $unset só se importa com o nome do campo. / $set: { updatedAt: new Date() } → mantém o padrão de atualizar o timestamp.
        );
    }

    // ========================================================
    // MÉTODO: listarTodos()
    // PROPÓSITO: Lista todos os usuários (uso administrativo)
    // ========================================================
    static async listarTodos() {
        const db = getBanco();
        return await db.collection(COLECAO).find().toArray();
    }

    // ========================================================
    // MÉTODO: listarPorRole(role)
    // PROPÓSITO: Lista usuários de uma role específica
    // ========================================================
    static async listarPorRole(role) {
        const db = getBanco();
        return await db.collection(COLECAO).find({ role }).toArray();
    }

    // ========================================================
    // MÉTODO: alterarRole(id, role)
    // PROPÓSITO: Altera a role de um usuário (somente ADMIN)
    // ========================================================
    static async alterarRole(id, role) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { role, updatedAt: new Date() } }
        );
    }

    // ========================================================
    // MÉTODO: setAtivo(id, ativo)
    // PROPÓSITO: Bloqueia/desbloqueia um usuário
    // ========================================================
    static async setAtivo(id, ativo) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) },
            { $set: { ativo, updatedAt: new Date() } }
        );
    }

    // ========================================================
    // MÉTODO: excluir(id)
    // PROPÓSITO: Exclui um usuário (uso administrativo)
    // ========================================================
    static async excluir(id) {
        const db = getBanco();
        return await db.collection(COLECAO).deleteOne({ _id: new ObjectId(id) });
    }

    // ========================================================
    // FUNÇÃO: sanitizarUsuario(usuario)
    // PROPÓSITO: Remove campos sensíveis antes de retornar na API
    // ========================================================
    static sanitizar(usuario) {
        if (!usuario) return null;
        const { senhaHash, ...dadosSeguros } = usuario;
        return dadosSeguros;
    }
}

export default Usuario;
