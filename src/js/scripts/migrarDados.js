// ============================================================
// ARQUIVO: scripts/migrarDados.js
// DESCRIÇÃO: Migração de dados legados para o novo modelo com ownerId
// ============================================================
// PROPÓSITO:
//   - Identificar veículos sem ownerId (dados legados)
//   - Criar um usuário ADMIN inicial (se não existir)
//   - Vincular veículos órfãos ao usuário ADMIN (ou a um usuário legado)
//   - Criar índices necessários nas coleções
// ============================================================
// USO: node src/js/scripts/migrarDados.js
// ============================================================

import { conectarBanco, desconectarBanco, getBanco } from '../config/database.js';
import { hashSenha } from '../utils/password.js';
import { ObjectId } from 'mongodb';

// ============================================================
// FUNÇÃO: criarIndices()
// PROPÓSITO: Cria índices essenciais para performance e unicidade
// ============================================================
async function criarIndices() {
    const db = getBanco();
    console.log('🔧 Criando índices...');

    // Índice único em email (usuarios)
    await db.collection('usuarios').createIndex({ email: 1 }, { unique: true });
    console.log('  ✅ usuarios.email (único)');

    // Índice em ownerId (veiculos) para consultas por proprietário
    await db.collection('veiculos').createIndex({ ownerId: 1 });
    console.log('  ✅ veiculos.ownerId');

    // Índice composto para busca de veículo por proprietário
    await db.collection('veiculos').createIndex({ _id: 1, ownerId: 1 });
    console.log('  ✅ veiculos._id + ownerId');

    // Índice em mechanicId + vehicleId (atendimentos)
    await db.collection('atendimentos').createIndex({ mechanicId: 1, vehicleId: 1 });
    console.log('  ✅ atendimentos.mechanicId + vehicleId');

    // Índice em vehicleId (atendimentos)
    await db.collection('atendimentos').createIndex({ vehicleId: 1 });
    console.log('  ✅ atendimentos.vehicleId');

    // Índice em userId (audit_logs)
    await db.collection('audit_logs').createIndex({ userId: 1 });
    console.log('  ✅ audit_logs.userId');

    // Índice em timestamp (audit_logs) para ordenação
    await db.collection('audit_logs').createIndex({ timestamp: -1 });
    console.log('  ✅ audit_logs.timestamp');

    // Índice em expires (sessoes) para limpeza automática
    await db.collection('sessoes').createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
    console.log('  ✅ sessoes.expires (TTL)');

    console.log('✅ Índices criados com sucesso.');
}

// ============================================================
// FUNÇÃO: migrarVeiculosOrfaos()
// PROPÓSITO: Vincula veículos sem ownerId a um usuário legado
// ============================================================
async function migrarVeiculosOrfaos() {
    const db = getBanco();
    console.log('🔍 Verificando veículos sem ownerId...');

    // Busca veículos sem ownerId
    const orfaos = await db.collection('veiculos')
        .find({ $or: [{ ownerId: { $exists: false } }, { ownerId: null }] })
        .toArray();

    if (orfaos.length === 0) {
        console.log('  ✅ Nenhum veículo órfão encontrado.');
        return;
    }

    console.log(`  ⚠️  Encontrados ${orfaos.length} veículos sem proprietário.`);

    // Busca ou cria o usuário ADMIN inicial
    let admin = await db.collection('usuarios').findOne({ role: 'ADMIN' });

    if (!admin) {
        console.log('  🔧 Criando usuário ADMIN inicial...');
        const senhaHash = await hashSenha('Admin@12345');
        const agora = new Date();
        const resultado = await db.collection('usuarios').insertOne({
            nome: 'Administrador',
            email: 'admin@minhagaragem.com',
            senhaHash,
            role: 'ADMIN',
            ativo: true,
            createdAt: agora,
            updatedAt: agora,
            lastLoginAt: null
        });
        admin = { _id: resultado.insertedId };
        console.log(`  ✅ ADMIN criado com ID: ${admin._id}`);
        console.log('  ⚠️  Credenciais iniciais: admin@minhagaragem.com / Admin@12345');
        console.log('  ⚠️  ALTERE A SENHA APÓS O PRIMEIRO LOGIN!');
    } else {
        console.log(`  ✅ ADMIN existente: ${admin.email}`);
    }

    // Vincula todos os veículos órfãos ao ADMIN
    const resultado = await db.collection('veiculos').updateMany(
        { $or: [{ ownerId: { $exists: false } }, { ownerId: null }] },
        { $set: { ownerId: admin._id, migradoDe: 'legado', migradoEm: new Date() } }
    );

    console.log(`  ✅ ${resultado.modifiedCount} veículos vinculados ao ADMIN.`);
}

// ============================================================
// FUNÇÃO: verificarUsuarioInicial()
// PROPÓSITO: Garante que existe pelo menos um usuário no sistema
// ============================================================
async function verificarUsuarioInicial() {
    const db = getBanco();
    const total = await db.collection('usuarios').countDocuments();

    if (total === 0) {
        console.log('🔧 Nenhum usuário encontrado. Criando ADMIN inicial...');
        const senhaHash = await hashSenha('Admin@12345');
        const agora = new Date();
        await db.collection('usuarios').insertOne({
            nome: 'Administrador',
            email: 'admin@minhagaragem.com',
            senhaHash,
            role: 'ADMIN',
            ativo: true,
            createdAt: agora,
            updatedAt: agora,
            lastLoginAt: null
        });
        console.log('  ✅ ADMIN criado: admin@minhagaragem.com / Admin@12345');
        console.log('  ⚠️  ALTERE A SENHA APÓS O PRIMEIRO LOGIN!');
    } else {
        console.log(`  ✅ ${total} usuário(s) existente(s).`);
    }
}

// ============================================================
// FUNÇÃO: executarMigracao()
// PROPÓSITO: Executa toda a migração
// ============================================================
async function executarMigracao() {
    console.log('============================================');
    console.log('🚀 INICIANDO MIGRAÇÃO DE DADOS');
    console.log('============================================');

    try {
        await conectarBanco();
        await criarIndices();
        await verificarUsuarioInicial();
        await migrarVeiculosOrfaos();

        console.log('============================================');
        console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO');
        console.log('============================================');
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
        process.exit(1);
    } finally {
        await desconectarBanco();
    }
}

// Executa a migração
executarMigracao();
