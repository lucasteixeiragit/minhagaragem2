// ============================================================
// ARQUIVO: __tests__/vinculos.authorization.test.js
// DESCRIÇÃO: Testes de autorização de vínculo
// ============================================================
// TESTES:
//   - Acesso permitido (vínculo ATIVO)
//   - Acesso negado (vínculo PENDENTE)
//   - Acesso negado (vínculo RECUSADO)
//   - Acesso negado (vínculo INATIVO)
//   - Acesso negado (vínculo BLOQUEADO)
//   - Acesso negado (sem vínculo)
// ============================================================

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
    canMechanicAccessClient,
    canMechanicAccessVehicle,
    verificarVinculoAtivo
} from '../middleware/vinculos.js';

import {
    obterClientesAtivos,
    obterMecanicasAtivas,
    verificarAcessoVeiculo,
    obterVeiculosDoCliente,
    obterVeiculosAcessiveisParaMecanica,
    validarTransicaoStatus
} from '../utils/authorization.js';

import Usuario from '../models/Usuario.js';
import Vinculo, { ESTADOS_VINCULO, TIPOS_VINCULO } from '../models/Vinculo.js';
import Veiculo from '../models/Veiculo.js';
import { conectarBanco, desconectarBanco, getBanco } from '../config/database.js';
import { ObjectId } from 'mongodb';

// ============================================================
// SUITE DE TESTES: Autorização de Vínculo
// ============================================================
// Este arquivo executa contra um MongoDB real (mesma URI usada pelo
// servidor). Todos os dados criados durante os testes (usuários,
// vínculos e veículos) são removidos ao final via `after` global.
// ============================================================

const usuariosCriados = [];
const vinculosCriados = [];
const veiculosCriados = [];

describe('Autorização de Vínculo', () => {

    let cliente, mecanica, veiculo, vinculo;

    // ========================================================
    // SETUP GERAL: Conectar ao banco e criar dados de teste
    // ========================================================
    before(async () => {
        await conectarBanco();

        // Criar cliente
        cliente = { _id: (await Usuario.criar({
            nome: 'Cliente Teste',
            email: `cliente-${Date.now()}@test.com`,
            senhaHash: 'hash123',
            role: 'USER'
        })).insertedId };
        usuariosCriados.push(cliente._id);

        // Criar mecânica
        mecanica = { _id: (await Usuario.criar({
            nome: 'Mecânica Teste',
            email: `mecanica-${Date.now()}@test.com`,
            senhaHash: 'hash123',
            role: 'MECANICA'
        })).insertedId };
        usuariosCriados.push(mecanica._id);

        // Criar veículo do cliente
        veiculo = await Veiculo.criarDoProprietario(
            {
                apelido: 'Carro Teste',
                marca: 'Toyota',
                modelo: 'Corolla',
                versao: '2020',
                ano: 2020,
                cambio: 'Automático',
                placa: 'ABC1234'
            },
            cliente._id
        );
        veiculosCriados.push(veiculo.insertedId);
    });

    // ========================================================
    // TEARDOWN GERAL: Remover dados de teste e desconectar
    // ========================================================
    after(async () => {
        const db = getBanco();

        if (vinculosCriados.length > 0) {
            await db.collection('vinculos').deleteMany({ _id: { $in: vinculosCriados } });
        }
        if (veiculosCriados.length > 0) {
            await db.collection('veiculos').deleteMany({ _id: { $in: veiculosCriados } });
        }
        if (usuariosCriados.length > 0) {
            await db.collection('usuarios').deleteMany({ _id: { $in: usuariosCriados } });
        }

        await desconectarBanco();
    });

    // ========================================================
    // TESTE 1: Acesso Permitido (Vínculo ATIVO)
    // ========================================================
    describe('Acesso Permitido (Vínculo ATIVO)', () => {

        before(async () => {
            // Criar vínculo ATIVO
            const resultado = await Vinculo.criar({
                usuarioId: cliente._id,
                mecanicaId: mecanica._id,
                criadoPor: mecanica._id,
                tipo: TIPOS_VINCULO.CONVITE
            });
            vinculosCriados.push(resultado.insertedId);

            vinculo = await Vinculo.buscarPorId(resultado.insertedId);

            // Aceitar vínculo
            await Vinculo.aceitar(vinculo._id);
        });

        test('canMechanicAccessClient deve retornar true', async () => {
            const temAcesso = await canMechanicAccessClient(mecanica._id, cliente._id);
            assert.equal(temAcesso, true);
        });

        test('canMechanicAccessVehicle deve retornar true', async () => {
            const temAcesso = await canMechanicAccessVehicle(mecanica._id, veiculo.insertedId);
            assert.equal(temAcesso, true);
        });

        test('verificarVinculoAtivo deve retornar documento do vínculo', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(cliente._id, mecanica._id);
            assert.notEqual(vinculoAtivo, null);
            assert.equal(vinculoAtivo.status, ESTADOS_VINCULO.ATIVO);
        });

        test('obterClientesAtivos deve incluir este cliente', async () => {
            const clientes = await obterClientesAtivos(mecanica._id);
            const clienteEncontrado = clientes.find(c => c.cliente._id.toString() === cliente._id.toString());
            assert.notEqual(clienteEncontrado, undefined);
            assert.equal(clienteEncontrado.vinculo.status, ESTADOS_VINCULO.ATIVO);
        });

        test('obterMecanicasAtivas deve incluir esta mecânica', async () => {
            const mecanicas = await obterMecanicasAtivas(cliente._id);
            const mecanicaEncontrada = mecanicas.find(m => m.mecanica._id.toString() === mecanica._id.toString());
            assert.notEqual(mecanicaEncontrada, undefined);
            assert.equal(mecanicaEncontrada.vinculo.status, ESTADOS_VINCULO.ATIVO);
        });

        test('verificarAcessoVeiculo deve retornar true', async () => {
            const temAcesso = await verificarAcessoVeiculo(mecanica._id, veiculo.insertedId);
            assert.equal(temAcesso, true);
        });

        test('obterVeiculosDoCliente deve incluir o veículo', async () => {
            const veiculos = await obterVeiculosDoCliente(mecanica._id, cliente._id);
            assert.ok(veiculos.length > 0);
            const veiculoEncontrado = veiculos.find(v => v._id.toString() === veiculo.insertedId.toString());
            assert.notEqual(veiculoEncontrado, undefined);
        });

        test('obterVeiculosAcessiveisParaMecanica deve incluir o veículo', async () => {
            const veiculos = await obterVeiculosAcessiveisParaMecanica(mecanica._id);
            assert.ok(veiculos.length > 0);
            const veiculoEncontrado = veiculos.find(v => v._id.toString() === veiculo.insertedId.toString());
            assert.notEqual(veiculoEncontrado, undefined);
        });
    });

    // ========================================================
    // TESTE 2: Acesso Negado (Vínculo PENDENTE)
    // ========================================================
    describe('Acesso Negado (Vínculo PENDENTE)', () => {

        let clientePendente, mecanicaPendente, vinculoPendente;

        before(async () => {
            // Criar cliente
            clientePendente = { _id: (await Usuario.criar({
                nome: 'Cliente Pendente',
                email: `cliente-pendente-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            })).insertedId };
            usuariosCriados.push(clientePendente._id);

            // Criar mecânica
            mecanicaPendente = { _id: (await Usuario.criar({
                nome: 'Mecânica Pendente',
                email: `mecanica-pendente-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            })).insertedId };
            usuariosCriados.push(mecanicaPendente._id);

            // Criar vínculo PENDENTE (não aceitar)
            const resultado = await Vinculo.criar({
                usuarioId: clientePendente._id,
                mecanicaId: mecanicaPendente._id,
                criadoPor: mecanicaPendente._id,
                tipo: TIPOS_VINCULO.CONVITE
            });
            vinculosCriados.push(resultado.insertedId);

            vinculoPendente = await Vinculo.buscarPorId(resultado.insertedId);
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaPendente._id, clientePendente._id);
            assert.equal(temAcesso, false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clientePendente._id, mecanicaPendente._id);
            assert.equal(vinculoAtivo, null);
        });

        test('obterClientesAtivos não deve incluir este cliente', async () => {
            const clientes = await obterClientesAtivos(mecanicaPendente._id);
            const clienteEncontrado = clientes.find(c => c.cliente._id.toString() === clientePendente._id.toString());
            assert.equal(clienteEncontrado, undefined);
        });
    });

    // ========================================================
    // TESTE 3: Acesso Negado (Vínculo RECUSADO)
    // ========================================================
    describe('Acesso Negado (Vínculo RECUSADO)', () => {

        let clienteRecusado, mecanicaRecusada, vinculoRecusado;

        before(async () => {
            // Criar cliente
            clienteRecusado = { _id: (await Usuario.criar({
                nome: 'Cliente Recusado',
                email: `cliente-recusado-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            })).insertedId };
            usuariosCriados.push(clienteRecusado._id);

            // Criar mecânica
            mecanicaRecusada = { _id: (await Usuario.criar({
                nome: 'Mecânica Recusada',
                email: `mecanica-recusada-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            })).insertedId };
            usuariosCriados.push(mecanicaRecusada._id);

            // Criar vínculo e recusar
            const resultado = await Vinculo.criar({
                usuarioId: clienteRecusado._id,
                mecanicaId: mecanicaRecusada._id,
                criadoPor: mecanicaRecusada._id,
                tipo: TIPOS_VINCULO.CONVITE
            });
            vinculosCriados.push(resultado.insertedId);

            vinculoRecusado = await Vinculo.buscarPorId(resultado.insertedId);
            await Vinculo.recusar(vinculoRecusado._id);
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaRecusada._id, clienteRecusado._id);
            assert.equal(temAcesso, false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clienteRecusado._id, mecanicaRecusada._id);
            assert.equal(vinculoAtivo, null);
        });
    });

    // ========================================================
    // TESTE 4: Acesso Negado (Vínculo INATIVO)
    // ========================================================
    describe('Acesso Negado (Vínculo INATIVO)', () => {

        let clienteInativo, mecanicaInativa, vinculoInativo;

        before(async () => {
            // Criar cliente
            clienteInativo = { _id: (await Usuario.criar({
                nome: 'Cliente Inativo',
                email: `cliente-inativo-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            })).insertedId };
            usuariosCriados.push(clienteInativo._id);

            // Criar mecânica
            mecanicaInativa = { _id: (await Usuario.criar({
                nome: 'Mecânica Inativa',
                email: `mecanica-inativa-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            })).insertedId };
            usuariosCriados.push(mecanicaInativa._id);

            // Criar vínculo ATIVO e depois desativar
            const resultado = await Vinculo.criar({
                usuarioId: clienteInativo._id,
                mecanicaId: mecanicaInativa._id,
                criadoPor: mecanicaInativa._id,
                tipo: TIPOS_VINCULO.CONVITE
            });
            vinculosCriados.push(resultado.insertedId);

            vinculoInativo = await Vinculo.buscarPorId(resultado.insertedId);
            await Vinculo.aceitar(vinculoInativo._id);
            await Vinculo.desativar(vinculoInativo._id);
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaInativa._id, clienteInativo._id);
            assert.equal(temAcesso, false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clienteInativo._id, mecanicaInativa._id);
            assert.equal(vinculoAtivo, null);
        });
    });

    // ========================================================
    // TESTE 5: Acesso Negado (Vínculo BLOQUEADO)
    // ========================================================
    describe('Acesso Negado (Vínculo BLOQUEADO)', () => {

        let clienteBloqueado, mecanicaBloqueada, vinculoBloqueado;

        before(async () => {
            // Criar cliente
            clienteBloqueado = { _id: (await Usuario.criar({
                nome: 'Cliente Bloqueado',
                email: `cliente-bloqueado-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            })).insertedId };
            usuariosCriados.push(clienteBloqueado._id);

            // Criar mecânica
            mecanicaBloqueada = { _id: (await Usuario.criar({
                nome: 'Mecânica Bloqueada',
                email: `mecanica-bloqueada-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            })).insertedId };
            usuariosCriados.push(mecanicaBloqueada._id);

            // Criar vínculo ATIVO e depois bloquear
            const resultado = await Vinculo.criar({
                usuarioId: clienteBloqueado._id,
                mecanicaId: mecanicaBloqueada._id,
                criadoPor: mecanicaBloqueada._id,
                tipo: TIPOS_VINCULO.CONVITE
            });
            vinculosCriados.push(resultado.insertedId);

            vinculoBloqueado = await Vinculo.buscarPorId(resultado.insertedId);
            await Vinculo.aceitar(vinculoBloqueado._id);
            await Vinculo.bloquear(vinculoBloqueado._id);
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaBloqueada._id, clienteBloqueado._id);
            assert.equal(temAcesso, false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clienteBloqueado._id, mecanicaBloqueada._id);
            assert.equal(vinculoAtivo, null);
        });
    });

    // ========================================================
    // TESTE 6: Acesso Negado (Sem Vínculo)
    // ========================================================
    describe('Acesso Negado (Sem Vínculo)', () => {

        let clienteSemVinculo, mecanicaSemVinculo;

        before(async () => {
            // Criar cliente
            clienteSemVinculo = { _id: (await Usuario.criar({
                nome: 'Cliente Sem Vínculo',
                email: `cliente-sem-vinculo-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            })).insertedId };
            usuariosCriados.push(clienteSemVinculo._id);

            // Criar mecânica
            mecanicaSemVinculo = { _id: (await Usuario.criar({
                nome: 'Mecânica Sem Vínculo',
                email: `mecanica-sem-vinculo-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            })).insertedId };
            usuariosCriados.push(mecanicaSemVinculo._id);

            // Não criar vínculo
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaSemVinculo._id, clienteSemVinculo._id);
            assert.equal(temAcesso, false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clienteSemVinculo._id, mecanicaSemVinculo._id);
            assert.equal(vinculoAtivo, null);
        });

        test('obterClientesAtivos deve retornar array vazio', async () => {
            const clientes = await obterClientesAtivos(mecanicaSemVinculo._id);
            assert.equal(clientes.length, 0);
        });
    });

    // ========================================================
    // TESTE 7: Validação de Transição de Status
    // ========================================================
    describe('Validação de Transição de Status', () => {

        test('PENDENTE → ATIVO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.PENDENTE, ESTADOS_VINCULO.ATIVO);
            assert.equal(resultado.valido, true);
        });

        test('PENDENTE → RECUSADO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.PENDENTE, ESTADOS_VINCULO.RECUSADO);
            assert.equal(resultado.valido, true);
        });

        test('ATIVO → INATIVO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.ATIVO, ESTADOS_VINCULO.INATIVO);
            assert.equal(resultado.valido, true);
        });

        test('ATIVO → BLOQUEADO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.ATIVO, ESTADOS_VINCULO.BLOQUEADO);
            assert.equal(resultado.valido, true);
        });

        test('BLOQUEADO → ATIVO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.BLOQUEADO, ESTADOS_VINCULO.ATIVO);
            assert.equal(resultado.valido, true);
        });

        test('INATIVO → ATIVO deve ser inválido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.INATIVO, ESTADOS_VINCULO.ATIVO);
            assert.equal(resultado.valido, false);
        });

        test('RECUSADO → ATIVO deve ser inválido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.RECUSADO, ESTADOS_VINCULO.ATIVO);
            assert.equal(resultado.valido, false);
        });
    });
});
