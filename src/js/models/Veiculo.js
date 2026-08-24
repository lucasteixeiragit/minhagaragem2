// ============================================================
// ARQUIVO: models/Veiculo.js
// DESCRIÇÃO: Model para manipular dados de veículos
// ============================================================
// Este arquivo é responsável por:
// - Acessar a coleção 'veiculos' no MongoDB
// - Realizar operações CRUD (Create, Read, Update, Delete)
// - Gerenciar manutenções (adicionar, excluir)
// - Atualizar quilometragem atual do veículo
// - Fornecer métodos estáticos para uso nas rotas da API
// ============================================================

// Importa a função que retorna a instância do banco de dados conectado
import { getBanco } from '../config/database.js';

// Importa ObjectId do MongoDB para manipular IDs
// MongoDB usa ObjectId (12 bytes) ao invés de números sequenciais
import { ObjectId } from 'mongodb';

// ============================================================
// CONFIGURAÇÃO DA COLEÇÃO
// ============================================================

// Nome da coleção no MongoDB que armazena os veículos
// ESTRUTURA DO DOCUMENTO:
// {
//   _id: ObjectId("..."),
//   apelido: "Meu Onix",
//   marca: "Chevrolet",
//   modelo: "Onix",
//   versao: "LTZ 1.4",
//   ano: 2015,
//   cambio: "Manual",
//   placa: "ABC-1234",
//   kmAtual: 50000,
//   dataLeitura: "2026-08-05",
//   kmMensal: 1500,
//   intervalosManutencoesPreventivas: {
//     trocaOleo: { nome: "Troca de Óleo", intervaloKm: 10000, ... },
//     ...
//   },
//   manutencoes: [
//     {
//       id: "unique-id",
//       data: "2026-08-01",
//       km: 48000,
//       tipo: "Troca de Óleo",
//       custo: 350.00,
//       descricao: "...",
//       notaFiscal: "data:image/jpeg;base64,...",
//       criadaEm: Date
//     }
//   ],
//   criadoEm: Date,
//   atualizadoEm: Date
// }
const COLECAO = 'veiculos';

// ============================================================
// CLASSE VEICULO
// ============================================================
// Usa apenas métodos estáticos (static)
// Não precisa instanciar (new Veiculo()) - usa direto: Veiculo.buscarTodos()
// ============================================================
class Veiculo {
    
    // ========================================================
    // MÉTODO: buscarTodos()
    // ========================================================
    // PROPÓSITO: Retorna TODOS os veículos do usuário
    // RETORNA: Array de documentos completos
    // USADO EM: routes/vehicle.routes.js → GET /api/vehicles
    // USADO NO FRONTEND: main.js (renderiza lista na home)
    // EXEMPLO DE RETORNO:
    //   [
    //     { _id: ..., apelido: "Meu Onix", marca: "Chevrolet", ... },
    //     { _id: ..., apelido: "Minha Strada", marca: "Fiat", ... }
    //   ]
    // ========================================================
    static async buscarTodos() {
        const db = getBanco();
        
        // find() sem filtro = busca TUDO
        // toArray() converte cursor do MongoDB em array JavaScript
        return await db.collection(COLECAO).find().toArray();
    }

    // ========================================================
    // MÉTODO: buscarPorId(id)
    // ========================================================
    // PROPÓSITO: Busca um veículo específico pelo ID
    // PARÂMETROS:
    //   - id: String com ID do MongoDB (ex: "507f1f77bcf86cd799439011")
    // RETORNA: Documento completo do veículo ou null se não encontrado
    // USADO EM: routes/vehicle.routes.js → GET /api/vehicles/:id
    // USADO NO FRONTEND: veiculo-detalhes.js (carrega dados do veículo)
    // IMPORTANTE: Converte string para ObjectId antes de buscar
    // ========================================================
    static async buscarPorId(id) {
        const db = getBanco();
        
        // new ObjectId(id) converte string "507f..." para tipo ObjectId
        // Necessário porque MongoDB armazena _id como ObjectId, não string
        return await db.collection(COLECAO).findOne({ _id: new ObjectId(id) });
    }

    // ========================================================
    // MÉTODO: criar(veiculo)
    // ========================================================
    // PROPÓSITO: Cria um novo veículo no banco de dados
    // PARÂMETROS:
    //   - veiculo: Objeto com dados do veículo (apelido, marca, modelo, ...)
    // RETORNA: Resultado da operação { insertedId: ObjectId }
    // USADO EM: routes/vehicle.routes.js → POST /api/vehicles
    // USADO NO FRONTEND: veiculo-novo.js (formulário de cadastro)
    // IMPORTANTE: Adiciona automaticamente timestamps de criação e atualização
    // ========================================================
    static async criar(veiculo) {
        const db = getBanco();
        
        // insertOne() adiciona um novo documento na coleção
        // Spread operator (...veiculo) copia todos os campos do objeto
        const resultado = await db.collection(COLECAO).insertOne({
            ...veiculo,
            // Adiciona timestamp de criação (útil para ordenar, auditar)
            criadoEm: new Date(),
            // Adiciona timestamp de última atualização
            atualizadoEm: new Date()
        });
        
        // Retorna resultado com insertedId (usado para redirecionar ao veículo criado)
        return resultado;
    }

    // ========================================================
    // MÉTODO: atualizar(id, dadosAtualizados)
    // ========================================================
    // PROPÓSITO: Atualiza dados de um veículo existente
    // PARÂMETROS:
    //   - id: String com ID do veículo
    //   - dadosAtualizados: Objeto com campos a atualizar
    // RETORNA: Resultado { matchedCount, modifiedCount }
    // USADO EM: routes/vehicle.routes.js → PUT /api/vehicles/:id
    // IMPORTANTE:
    //   - Usa $set para atualizar apenas campos especificados
    //   - Atualiza automaticamente o timestamp 'atualizadoEm'
    // ========================================================
    static async atualizar(id, dadosAtualizados) {
        const db = getBanco();
        
        // updateOne() atualiza UM documento
        // Primeiro parâmetro: filtro ({ _id: ... })
        // Segundo parâmetro: operação de atualização ({ $set: ... })
        const resultado = await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id) }, // Qual documento atualizar
            { 
                $set: { // $set atualiza APENAS os campos especificados
                    ...dadosAtualizados,
                    // Atualiza timestamp sempre que houver modificação
                    atualizadoEm: new Date()
                }
            }
        );
        
        // resultado.matchedCount: quantos documentos foram encontrados (0 ou 1)
        // resultado.modifiedCount: quantos foram modificados (0 ou 1)
        return resultado;
    }

    // ========================================================
    // MÉTODO: excluir(id)
    // ========================================================
    // PROPÓSITO: Exclui um veículo do banco de dados
    // PARÂMETROS:
    //   - id: String com ID do veículo
    // RETORNA: Resultado { deletedCount }
    // USADO EM: routes/vehicle.routes.js → DELETE /api/vehicles/:id
    // USADO NO FRONTEND: main.js (botão "Excluir" nos cards)
    // IMPORTANTE: Exclui permanentemente! Não há "soft delete"
    // ========================================================
    static async excluir(id) {
        const db = getBanco();
        
        // deleteOne() remove UM documento que corresponde ao filtro
        // ATENÇÃO: Esta operação é IRREVERSÍVEL
        return await db.collection(COLECAO).deleteOne({ _id: new ObjectId(id) });
    }

    // ========================================================
    // MÉTODO: adicionarManutencao(veiculoId, manutencao)
    // ========================================================
    // PROPÓSITO: Adiciona uma nova manutenção ao array de manutenções do veículo
    // PARÂMETROS:
    //   - veiculoId: String com ID do veículo
    //   - manutencao: Objeto { data, km, tipo, custo, descricao, notaFiscal }
    // RETORNA: Resultado da atualização
    // USADO EM: routes/maintenance.routes.js → POST /api/vehicles/:id/maintenance
    // USADO NO FRONTEND: manutencao-nova.js (formulário de registro)
    // OPERADOR $push: Adiciona elemento ao final do array
    // IMPORTANTE: Gera ID único para a manutenção (para poder excluir depois)
    // ========================================================
    static async adicionarManutencao(veiculoId, manutencao) {
        const db = getBanco();
        
        // updateOne() com $push adiciona item ao array
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(veiculoId) }, // Qual veículo
            { 
                // $push adiciona elemento ao FINAL do array 'manutencoes'
                $push: { 
                    manutencoes: {
                        ...manutencao, // Dados da manutenção (data, km, tipo, ...)
                        // Gera ID único para esta manutenção
                        // toString() converte ObjectId para string (mais fácil no frontend)
                        id: new ObjectId().toString(),
                        // Timestamp de quando a manutenção foi registrada
                        criadaEm: new Date()
                    }
                },
                // Atualiza timestamp do veículo também
                $set: { atualizadoEm: new Date() }
            }
        );
    }

    // ========================================================
    // MÉTODO: excluirManutencao(veiculoId, manutencaoId)
    // ========================================================
    // PROPÓSITO: Remove uma manutenção do array de manutenções
    // PARÂMETROS:
    //   - veiculoId: String com ID do veículo
    //   - manutencaoId: String com ID da manutenção (não é ObjectId)
    // RETORNA: Resultado da atualização
    // USADO EM: routes/maintenance.routes.js → DELETE /api/vehicles/:id/maintenance/:manutencaoId
    // USADO NO FRONTEND: veiculo-detalhes.js (botão "Excluir" em cada manutenção)
    // OPERADOR $pull: Remove elemento do array que corresponde ao filtro
    // ========================================================
    static async excluirManutencao(veiculoId, manutencaoId) {
        const db = getBanco();
        
        // updateOne() com $pull remove item do array
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(veiculoId) }, // Qual veículo
            { 
                // $pull remove elementos do array que correspondem ao filtro
                $pull: { manutencoes: { id: manutencaoId } },
                // Atualiza timestamp do veículo
                $set: { atualizadoEm: new Date() }
            }
        );
    }

    // ========================================================
    // MÉTODO: atualizarKmAtual(veiculoId, kmAtual, dataLeitura)
    // ========================================================
    // PROPÓSITO: Atualiza a quilometragem atual do veículo
    // PARÂMETROS:
    //   - veiculoId: String com ID do veículo
    //   - kmAtual: Número com quilometragem atual
    //   - dataLeitura: String com data da leitura (formato ISO: "2026-08-05")
    // RETORNA: Resultado da atualização
    // USADO EM: routes/maintenance.routes.js → PATCH /api/vehicles/:id/maintenance/km
    // IMPORTANTE PARA NOTIFICAÇÕES:
    //   - kmAtual é usado para calcular quando fazer próxima manutenção
    //   - dataLeitura permite calcular média de KM rodados por mês
    //   - Sistema de notificações usa estes dados para alertar o usuário
    // ========================================================
    static async atualizarKmAtual(veiculoId, kmAtual, dataLeitura) {
        const db = getBanco();
        
        // updateOne() com $set atualiza campos específicos
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(veiculoId) }, // Qual veículo
            { 
                $set: {
                    // Atualiza quilometragem atual
                    kmAtual,
                    // Atualiza data da leitura (útil para calcular média mensal)
                    dataLeitura,
                    // Atualiza timestamp de modificação
                    atualizadoEm: new Date()
                }
            }
        );
    }

    // ============================================================
    // MÉTODOS COM ESCOPO DE PROPRIETÁRIO (SEGURANÇA)
    // ============================================================
    // Estes métodos recebem ownerId e SEMPRE filtram por ele.
    // Mesmo que o frontend envie o ID de outro veículo, a consulta
    // não encontrará o registro (proteção contra IDOR).
    // ============================================================

    // Cria um veículo vinculado ao proprietário autenticado
    static async criarDoProprietario(veiculo, ownerId) {
        const db = getBanco();
        const resultado = await db.collection(COLECAO).insertOne({
            ...veiculo,
            ownerId: new ObjectId(ownerId),
            criadoEm: new Date(),
            atualizadoEm: new Date()
        });
        return resultado;
    }

    // Lista apenas os veículos do proprietário
    static async buscarTodosDoProprietario(ownerId) {
        const db = getBanco();
        return await db.collection(COLECAO)
            .find({ ownerId: new ObjectId(ownerId) })
            .toArray();
    }

    // Busca um veículo garantindo que pertence ao proprietário
    static async buscarPorIdEProprietario(id, ownerId) {
        const db = getBanco();
        try {
            return await db.collection(COLECAO).findOne({
                _id: new ObjectId(id),
                ownerId: new ObjectId(ownerId)
            });
        } catch {
            return null;
        }
    }

    // Atualiza um veículo garantindo que pertence ao proprietário
    static async atualizarDoProprietario(id, ownerId, dadosAtualizados) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(id), ownerId: new ObjectId(ownerId) },
            { $set: { ...dadosAtualizados, atualizadoEm: new Date() } }
        );
    }

    // Exclui um veículo garantindo que pertence ao proprietário
    static async excluirDoProprietario(id, ownerId) {
        const db = getBanco();
        return await db.collection(COLECAO).deleteOne({
            _id: new ObjectId(id),
            ownerId: new ObjectId(ownerId)
        });
    }

    // Adiciona manutenção garantindo que o veículo pertence ao proprietário
    static async adicionarManutencaoDoProprietario(veiculoId, ownerId, manutencao) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(veiculoId), ownerId: new ObjectId(ownerId) },
            {
                $push: {
                    manutencoes: {
                        ...manutencao,
                        id: new ObjectId().toString(),
                        criadaEm: new Date()
                    }
                },
                $set: { atualizadoEm: new Date() }
            }
        );
    }

    // Exclui manutenção garantindo que o veículo pertence ao proprietário
    static async excluirManutencaoDoProprietario(veiculoId, ownerId, manutencaoId) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(veiculoId), ownerId: new ObjectId(ownerId) },
            {
                $pull: { manutencoes: { id: manutencaoId } },
                $set: { atualizadoEm: new Date() }
            }
        );
    }

    // ========================================================
    // MÉTODO: atualizarManutencao(veiculoId, manutencaoId, campos)
    // ========================================================
    // PROPÓSITO: Atualiza os campos de uma manutenção específica
    // OPERADOR $: Posicional — atualiza o elemento do array que
    //              corresponde ao filtro "manutencoes.id"
    // ========================================================
    static async atualizarManutencao(veiculoId, manutencaoId, campos) {
        const db = getBanco();
        const set = { atualizadoEm: new Date() };
        Object.entries(campos).forEach(([campo, valor]) => {
            set[`manutencoes.$.${campo}`] = valor;
        });
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(veiculoId), 'manutencoes.id': manutencaoId },
            { $set: set }
        );
    }

    // Atualiza manutenção garantindo que o veículo pertence ao proprietário
    static async atualizarManutencaoDoProprietario(veiculoId, ownerId, manutencaoId, campos) {
        const db = getBanco();
        const set = { atualizadoEm: new Date() };
        Object.entries(campos).forEach(([campo, valor]) => {
            set[`manutencoes.$.${campo}`] = valor;
        });
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(veiculoId), ownerId: new ObjectId(ownerId), 'manutencoes.id': manutencaoId },
            { $set: set }
        );
    }

    // Atualiza KM garantindo que o veículo pertence ao proprietário
    static async atualizarKmDoProprietario(veiculoId, ownerId, kmAtual, dataLeitura) {
        const db = getBanco();
        return await db.collection(COLECAO).updateOne(
            { _id: new ObjectId(veiculoId), ownerId: new ObjectId(ownerId) },
            {
                $set: { kmAtual, dataLeitura, atualizadoEm: new Date() }
            }
        );
    }

    // Busca um veículo por ID sem filtro de proprietário (uso interno/admin)
    static async buscarPorIdAdmin(id) {
        const db = getBanco();
        try {
            return await db.collection(COLECAO).findOne({ _id: new ObjectId(id) });
        } catch {
            return null;
        }
    }

    // Lista todos os veículos (uso administrativo)
    static async listarTodosAdmin() {
        const db = getBanco();
        return await db.collection(COLECAO).find().toArray();
    }
}

// ============================================================
// EXPORTAÇÃO
// ============================================================
// Exporta a classe Veiculo como exportação padrão
// USADO EM:
//   - routes/vehicle.routes.js → Rotas de veículos
//   - routes/maintenance.routes.js → Rotas de manutenção
//   - routes/admin.routes.js → Listagem admin
//   - Futuramente: Sistema de notificações (verificar veículos que precisam manutenção)
// ============================================================
export default Veiculo;
