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
import { ObjectId } from 'mongodb';

// ============================================================
// SUITE DE TESTES: Autorização de Vínculo
// ============================================================

describe('Autorização de Vínculo', () => {

    let cliente, mecanica, veiculo, vinculo;

    // ========================================================
    // SETUP: Criar dados de teste
    // ========================================================
    beforeAll(async () => {
        // Criar cliente
        cliente = await Usuario.criar({
            nome: 'Cliente Teste',
            email: `cliente-${Date.now()}@test.com`,
            senhaHash: 'hash123',
            role: 'USER'
        });

        // Criar mecânica
        mecanica = await Usuario.criar({
            nome: 'Mecânica Teste',
            email: `mecanica-${Date.now()}@test.com`,
            senhaHash: 'hash123',
            role: 'MECANICA'
        });

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
    });

    // ========================================================
    // TESTE 1: Acesso Permitido (Vínculo ATIVO)
    // ========================================================
    describe('Acesso Permitido (Vínculo ATIVO)', () => {

        beforeAll(async () => {
            // Criar vínculo ATIVO
            const resultado = await Vinculo.criar({
                usuarioId: cliente._id,
                mecanicaId: mecanica._id,
                criadoPor: mecanica._id,
                tipo: TIPOS_VINCULO.CONVITE
            });

            vinculo = await Vinculo.buscarPorId(resultado.insertedId);

            // Aceitar vínculo
            await Vinculo.aceitar(vinculo._id);
        });

        test('canMechanicAccessClient deve retornar true', async () => {
            const temAcesso = await canMechanicAccessClient(mecanica._id, cliente._id);
            expect(temAcesso).toBe(true);
        });

        test('canMechanicAccessVehicle deve retornar true', async () => {
            const temAcesso = await canMechanicAccessVehicle(mecanica._id, veiculo.insertedId);
            expect(temAcesso).toBe(true);
        });

        test('verificarVinculoAtivo deve retornar documento do vínculo', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(cliente._id, mecanica._id);
            expect(vinculoAtivo).not.toBeNull();
            expect(vinculoAtivo.status).toBe(ESTADOS_VINCULO.ATIVO);
        });

        test('obterClientesAtivos deve incluir este cliente', async () => {
            const clientes = await obterClientesAtivos(mecanica._id);
            const clienteEncontrado = clientes.find(c => c.cliente._id.toString() === cliente._id.toString());
            expect(clienteEncontrado).toBeDefined();
            expect(clienteEncontrado.vinculo.status).toBe(ESTADOS_VINCULO.ATIVO);
        });

        test('obterMecanicasAtivas deve incluir esta mecânica', async () => {
            const mecanicas = await obterMecanicasAtivas(cliente._id);
            const mecanicaEncontrada = mecanicas.find(m => m.mecanica._id.toString() === mecanica._id.toString());
            expect(mecanicaEncontrada).toBeDefined();
            expect(mecanicaEncontrada.vinculo.status).toBe(ESTADOS_VINCULO.ATIVO);
        });

        test('verificarAcessoVeiculo deve retornar true', async () => {
            const temAcesso = await verificarAcessoVeiculo(mecanica._id, veiculo.insertedId);
            expect(temAcesso).toBe(true);
        });

        test('obterVeiculosDoCliente deve incluir o veículo', async () => {
            const veiculos = await obterVeiculosDoCliente(mecanica._id, cliente._id);
            expect(veiculos.length).toBeGreaterThan(0);
            const veiculoEncontrado = veiculos.find(v => v._id.toString() === veiculo.insertedId.toString());
            expect(veiculoEncontrado).toBeDefined();
        });

        test('obterVeiculosAcessiveisParaMecanica deve incluir o veículo', async () => {
            const veiculos = await obterVeiculosAcessiveisParaMecanica(mecanica._id);
            expect(veiculos.length).toBeGreaterThan(0);
            const veiculoEncontrado = veiculos.find(v => v._id.toString() === veiculo.insertedId.toString());
            expect(veiculoEncontrado).toBeDefined();
        });
    });

    // ========================================================
    // TESTE 2: Acesso Negado (Vínculo PENDENTE)
    // ========================================================
    describe('Acesso Negado (Vínculo PENDENTE)', () => {

        let clientePendente, mecanicaPendente, vinculoPendente;

        beforeAll(async () => {
            // Criar cliente
            clientePendente = await Usuario.criar({
                nome: 'Cliente Pendente',
                email: `cliente-pendente-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            });

            // Criar mecânica
            mecanicaPendente = await Usuario.criar({
                nome: 'Mecânica Pendente',
                email: `mecanica-pendente-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            });

            // Criar vínculo PENDENTE (não aceitar)
            const resultado = await Vinculo.criar({
                usuarioId: clientePendente._id,
                mecanicaId: mecanicaPendente._id,
                criadoPor: mecanicaPendente._id,
                tipo: TIPOS_VINCULO.CONVITE
            });

            vinculoPendente = await Vinculo.buscarPorId(resultado.insertedId);
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaPendente._id, clientePendente._id);
            expect(temAcesso).toBe(false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clientePendente._id, mecanicaPendente._id);
            expect(vinculoAtivo).toBeNull();
        });

        test('obterClientesAtivos não deve incluir este cliente', async () => {
            const clientes = await obterClientesAtivos(mecanicaPendente._id);
            const clienteEncontrado = clientes.find(c => c.cliente._id.toString() === clientePendente._id.toString());
            expect(clienteEncontrado).toBeUndefined();
        });
    });

    // ========================================================
    // TESTE 3: Acesso Negado (Vínculo RECUSADO)
    // ========================================================
    describe('Acesso Negado (Vínculo RECUSADO)', () => {

        let clienteRecusado, mecanicaRecusada, vinculoRecusado;

        beforeAll(async () => {
            // Criar cliente
            clienteRecusado = await Usuario.criar({
                nome: 'Cliente Recusado',
                email: `cliente-recusado-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            });

            // Criar mecânica
            mecanicaRecusada = await Usuario.criar({
                nome: 'Mecânica Recusada',
                email: `mecanica-recusada-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            });

            // Criar vínculo e recusar
            const resultado = await Vinculo.criar({
                usuarioId: clienteRecusado._id,
                mecanicaId: mecanicaRecusada._id,
                criadoPor: mecanicaRecusada._id,
                tipo: TIPOS_VINCULO.CONVITE
            });

            vinculoRecusado = await Vinculo.buscarPorId(resultado.insertedId);
            await Vinculo.recusar(vinculoRecusado._id);
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaRecusada._id, clienteRecusado._id);
            expect(temAcesso).toBe(false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clienteRecusado._id, mecanicaRecusada._id);
            expect(vinculoAtivo).toBeNull();
        });
    });

    // ========================================================
    // TESTE 4: Acesso Negado (Vínculo INATIVO)
    // ========================================================
    describe('Acesso Negado (Vínculo INATIVO)', () => {

        let clienteInativo, mecanicaInativa, vinculoInativo;

        beforeAll(async () => {
            // Criar cliente
            clienteInativo = await Usuario.criar({
                nome: 'Cliente Inativo',
                email: `cliente-inativo-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            });

            // Criar mecânica
            mecanicaInativa = await Usuario.criar({
                nome: 'Mecânica Inativa',
                email: `mecanica-inativa-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            });

            // Criar vínculo ATIVO e depois desativar
            const resultado = await Vinculo.criar({
                usuarioId: clienteInativo._id,
                mecanicaId: mecanicaInativa._id,
                criadoPor: mecanicaInativa._id,
                tipo: TIPOS_VINCULO.CONVITE
            });

            vinculoInativo = await Vinculo.buscarPorId(resultado.insertedId);
            await Vinculo.aceitar(vinculoInativo._id);
            await Vinculo.desativar(vinculoInativo._id);
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaInativa._id, clienteInativo._id);
            expect(temAcesso).toBe(false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clienteInativo._id, mecanicaInativa._id);
            expect(vinculoAtivo).toBeNull();
        });
    });

    // ========================================================
    // TESTE 5: Acesso Negado (Vínculo BLOQUEADO)
    // ========================================================
    describe('Acesso Negado (Vínculo BLOQUEADO)', () => {

        let clienteBloqueado, mecanicaBloqueada, vinculoBloqueado;

        beforeAll(async () => {
            // Criar cliente
            clienteBloqueado = await Usuario.criar({
                nome: 'Cliente Bloqueado',
                email: `cliente-bloqueado-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            });

            // Criar mecânica
            mecanicaBloqueada = await Usuario.criar({
                nome: 'Mecânica Bloqueada',
                email: `mecanica-bloqueada-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            });

            // Criar vínculo ATIVO e depois bloquear
            const resultado = await Vinculo.criar({
                usuarioId: clienteBloqueado._id,
                mecanicaId: mecanicaBloqueada._id,
                criadoPor: mecanicaBloqueada._id,
                tipo: TIPOS_VINCULO.CONVITE
            });

            vinculoBloqueado = await Vinculo.buscarPorId(resultado.insertedId);
            await Vinculo.aceitar(vinculoBloqueado._id);
            await Vinculo.bloquear(vinculoBloqueado._id);
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaBloqueada._id, clienteBloqueado._id);
            expect(temAcesso).toBe(false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clienteBloqueado._id, mecanicaBloqueada._id);
            expect(vinculoAtivo).toBeNull();
        });
    });

    // ========================================================
    // TESTE 6: Acesso Negado (Sem Vínculo)
    // ========================================================
    describe('Acesso Negado (Sem Vínculo)', () => {

        let clienteSemVinculo, mecanicaSemVinculo;

        beforeAll(async () => {
            // Criar cliente
            clienteSemVinculo = await Usuario.criar({
                nome: 'Cliente Sem Vínculo',
                email: `cliente-sem-vinculo-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'USER'
            });

            // Criar mecânica
            mecanicaSemVinculo = await Usuario.criar({
                nome: 'Mecânica Sem Vínculo',
                email: `mecanica-sem-vinculo-${Date.now()}@test.com`,
                senhaHash: 'hash123',
                role: 'MECANICA'
            });

            // Não criar vínculo
        });

        test('canMechanicAccessClient deve retornar false', async () => {
            const temAcesso = await canMechanicAccessClient(mecanicaSemVinculo._id, clienteSemVinculo._id);
            expect(temAcesso).toBe(false);
        });

        test('verificarVinculoAtivo deve retornar null', async () => {
            const vinculoAtivo = await verificarVinculoAtivo(clienteSemVinculo._id, mecanicaSemVinculo._id);
            expect(vinculoAtivo).toBeNull();
        });

        test('obterClientesAtivos deve retornar array vazio', async () => {
            const clientes = await obterClientesAtivos(mecanicaSemVinculo._id);
            expect(clientes.length).toBe(0);
        });
    });

    // ========================================================
    // TESTE 7: Validação de Transição de Status
    // ========================================================
    describe('Validação de Transição de Status', () => {

        test('PENDENTE → ATIVO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.PENDENTE, ESTADOS_VINCULO.ATIVO);
            expect(resultado.valido).toBe(true);
        });

        test('PENDENTE → RECUSADO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.PENDENTE, ESTADOS_VINCULO.RECUSADO);
            expect(resultado.valido).toBe(true);
        });

        test('ATIVO → INATIVO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.ATIVO, ESTADOS_VINCULO.INATIVO);
            expect(resultado.valido).toBe(true);
        });

        test('ATIVO → BLOQUEADO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.ATIVO, ESTADOS_VINCULO.BLOQUEADO);
            expect(resultado.valido).toBe(true);
        });

        test('BLOQUEADO → ATIVO deve ser válido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.BLOQUEADO, ESTADOS_VINCULO.ATIVO);
            expect(resultado.valido).toBe(true);
        });

        test('INATIVO → ATIVO deve ser inválido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.INATIVO, ESTADOS_VINCULO.ATIVO);
            expect(resultado.valido).toBe(false);
        });

        test('RECUSADO → ATIVO deve ser inválido', () => {
            const resultado = validarTransicaoStatus(ESTADOS_VINCULO.RECUSADO, ESTADOS_VINCULO.ATIVO);
            expect(resultado.valido).toBe(false);
        });
    });
});
