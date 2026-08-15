// ============================================================
// ARQUIVO: utils/password.js
// DESCRIÇÃO: Hash e verificação segura de senhas (bcrypt)
// ============================================================
// NUNCA armazenar senha em texto puro. Sempre usar hash.
// bcrypt adiciona salt automático e é resistente a brute force.
// ============================================================

import bcrypt from 'bcrypt';

// Custo do algoritmo (quanto maior, mais lento e mais seguro)
// 12 é um bom equilíbrio entre segurança e performance
const SALT_ROUNDS = 12;

// ============================================================
// FUNÇÃO: hashSenha(senha)
// PROPÓSITO: Gera o hash bcrypt de uma senha em texto puro
// RETORNA: String com o hash (ex: "$2b$12$...")
// ============================================================
export async function hashSenha(senha) {
    return await bcrypt.hash(senha, SALT_ROUNDS);
}

// ============================================================
// FUNÇÃO: verificarSenha(senha, hash)
// PROPÓSITO: Compara uma senha em texto puro com um hash armazenado
// RETORNA: true se a senha corresponde ao hash, false caso contrário
// ============================================================
export async function verificarSenha(senha, hash) {
    return await bcrypt.compare(senha, hash);
}
