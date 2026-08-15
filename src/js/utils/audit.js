// ============================================================
// ARQUIVO: utils/audit.js
// DESCRIÇÃO: Registro de auditoria de ações críticas
// ============================================================
// Registra em 'audit_logs' ações importantes para rastreabilidade.
// NUNCA registrar senha, token ou segredos.
// ============================================================

import { getBanco } from '../config/database.js';

const COLECAO = 'audit_logs';

// ============================================================
// FUNÇÃO: registrarAuditoria({ userId, action, resource, resourceId, ip, userAgent, detalhes })
// PROPÓSITO: Insere um log de auditoria no MongoDB
// ============================================================
export async function registrarAuditoria({
    userId = null,
    action,
    resource = null,
    resourceId = null,
    ip = null,
    userAgent = null,
    detalhes = null
}) {
    try {
        const db = getBanco();
        await db.collection(COLECAO).insertOne({
            userId,
            action,
            resource,
            resourceId,
            ip,
            userAgent,
            detalhes,
            timestamp: new Date()
        });
    } catch (error) {
        // Auditoria nunca deve derrubar a requisição principal
        console.error('Erro ao registrar auditoria:', error);
    }
}
