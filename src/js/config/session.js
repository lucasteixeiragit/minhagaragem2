// ============================================================
// ARQUIVO: config/session.js
// DESCRIÇÃO: Configuração de sessão baseada em cookie com store no MongoDB
// ============================================================
// ESCOLHA TÉCNICA:
//   - Sessão em cookie HttpOnly (não acessível via JS) em vez de JWT no
//     localStorage, para reduzir o impacto de vulnerabilidades XSS.
//   - Store das sessões em coleção MongoDB ('sessoes') para que as sessões
//     sobrevivam a reinícios do servidor (nodemon) e possam ser invalidadas
//     no logout e na troca de senha.
//   - Cookie: httpOnly, sameSite 'lax', secure apenas em produção (HTTPS).
//   - NUNCA colocar senha dentro do cookie.
// ============================================================

import session from 'express-session';
import { getBanco } from './database.js';

// ============================================================
// STORE PERSONALIZADO (MongoDB)
// ============================================================
// Implementa a interface Store do express-session usando a coleção 'sessoes'.
// Evita dependência extra (connect-mongo) e reutiliza a conexão existente.
// ============================================================
class MongoSessionStore extends session.Store {
    constructor() {
        super();
        this.collection = () => getBanco().collection('sessoes');
    }

    async get(sid, callback) {
        try {
            const doc = await this.collection().findOne({ _id: sid });
            if (!doc) return callback(null, null);
            // Sessão expirada: remove e trata como inexistente
            if (doc.expires && doc.expires < new Date()) {
                await this.collection().deleteOne({ _id: sid });
                return callback(null, null);
            }
            callback(null, doc.data);
        } catch (error) {
            callback(error);
        }
    }

    async set(sid, sessao, callback) {
        try {
            const expires = sessao.cookie && sessao.cookie.expires
                ? new Date(sessao.cookie.expires)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await this.collection().updateOne(
                { _id: sid },
                { $set: { data: sessao, expires, updatedAt: new Date() } },
                { upsert: true }
            );
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    async destroy(sid, callback) {
        try {
            await this.collection().deleteOne({ _id: sid });
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    async touch(sid, sessao, callback) {
        try {
            const expires = sessao.cookie && sessao.cookie.expires
                ? new Date(sessao.cookie.expires)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await this.collection().updateOne(
                { _id: sid },
                { $set: { expires, updatedAt: new Date() } }
            );
            callback(null);
        } catch (error) {
            callback(error);
        }
    }
}

// ============================================================
// CONFIGURAÇÃO DO MIDDLEWARE DE SESSÃO
// ============================================================
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-nao-utilizar-em-producao';
const isProducao = process.env.NODE_ENV === 'production';

export function configurarSessao() {
    return session({
        store: new MongoSessionStore(),
        name: 'minhagaragem.sid',
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            httpOnly: true,
            secure: isProducao, // true apenas em HTTPS/produção
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000 // 15 dias inatividade usuario é deslogado
        }
    });
}
