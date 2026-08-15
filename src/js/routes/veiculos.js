// ============================================================
// ARQUIVO: routes/veiculos.js
// DESCRIÇÃO: Rotas da API para gerenciamento de veículos e manutenções
// ============================================================
// PREFIXO DE ROTAS: /api/veiculos (configurado em app.js)
// RESPONSABILIDADES:
//   - CRUD completo de veículos (Create, Read, Update, Delete)
//   - Gerenciar manutenções de veículos
//   - Atualizar quilometragem atual
// ============================================================

// Importa Express Router
import express from 'express';

// Importa o Model Veiculo que acessa o MongoDB
import Veiculo from '../models/Veiculo.js';

// Importa o middleware de autenticação
import { requireAuth } from '../middleware/auth.js';

// Cria instância do Router
const router = express.Router();

// Aplica autenticação em TODAS as rotas deste router
// (protege contra acesso não autenticado e IDOR)
router.use(requireAuth);

// ============================================================
// ROTA: GET /api/veiculos
// ============================================================
// PROPÓSITO: Retorna TODOS os veículos do usuário
// USADO EM: main.js → Renderiza lista de veículos na home
// RETORNA: Array de objetos completos (incluindo manutenções e intervalos)
router.get('/', async (req, res) => {
    try {
        // Busca apenas os veículos do usuário autenticado (proteção contra IDOR)
        const veiculos = await Veiculo.buscarTodosDoProprietario(req.user._id);
        
        // Retorna JSON (status 200 implícito)
        res.json(veiculos);
    } catch (error) {
        // Log no console do servidor para debugging
        console.error('Erro ao buscar veículos:', error);
        
        // Retorna erro 500 ao frontend
        res.status(500).json({ erro: 'Erro ao buscar veículos' });
    }
});

// ============================================================
// ROTA: GET /api/veiculos/:id
// ============================================================
// PROPÓSITO: Retorna um veículo específico por ID
// PARÂMETRO: :id → ObjectId do MongoDB (ex: "507f1f77bcf86cd799439011")
// USADO EM: veiculo-detalhes.js → Carrega dados do veículo
// EXEMPLO: GET /api/veiculos/507f1f77bcf86cd799439011
router.get('/:id', async (req, res) => {
    try {
        // Busca o veículo garantindo que pertence ao usuário autenticado (proteção contra IDOR)
        const veiculo = await Veiculo.buscarPorIdEProprietario(req.params.id, req.user._id);
        
        // Validação: Se ID não existe ou não pertence ao usuário, retorna 404
        if (!veiculo) {
            return res.status(404).json({ erro: 'Veículo não encontrado' });
        }
        
        res.json(veiculo);
    } catch (error) {
        console.error('Erro ao buscar veículo:', error);
        res.status(500).json({ erro: 'Erro ao buscar veículo' });
    }
});

// ============================================================
// ROTA: POST /api/veiculos
// ============================================================
// PROPÓSITO: Cria um novo veículo
// BODY ESPERADO: { apelido, marca, modelo, versao, ano, cambio, placa, kmAtual, ... }
// USADO EM: veiculo-novo.js → Formulário de cadastro
// RETORNA: { mensagem, id } onde id é o ObjectId do veículo criado
// STATUS: 201 (Created) em caso de sucesso
router.post('/', async (req, res) => {
    try {
        // Cria o veículo vinculado ao usuário autenticado (ownerId derivado de req.user)
        const resultado = await Veiculo.criarDoProprietario(req.body, req.user._id);
        
        // Status 201 indica que um recurso foi CRIADO
        res.status(201).json({ 
            mensagem: 'Veículo criado com sucesso',
            // insertedId é o ObjectId gerado automaticamente pelo MongoDB
            id: resultado.insertedId 
        });
    } catch (error) {
        console.error('Erro ao criar veículo:', error);
        res.status(500).json({ erro: 'Erro ao criar veículo' });
    }
});

// ============================================================
// ROTA: PUT /api/veiculos/:id
// ============================================================
// PROPÓSITO: Atualiza dados de um veículo existente
// PARÂMETRO: :id → ObjectId do veículo
// BODY ESPERADO: Objeto com campos a atualizar (ex: { apelido: "Novo nome", kmAtual: 55000 })
// IMPORTANTE: Atualiza APENAS os campos enviados no body (usa $set no Model)
// EXEMPLO: PUT /api/veiculos/507f1f77bcf86cd799439011 com body { apelido: "Carro Novo" }
router.put('/:id', async (req, res) => {
    try {
        // Atualiza garantindo que o veículo pertence ao usuário autenticado (proteção contra IDOR)
        const resultado = await Veiculo.atualizarDoProprietario(req.params.id, req.user._id, req.body);
        
        // matchedCount = 0 significa que o ID não foi encontrado ou não pertence ao usuário
        if (resultado.matchedCount === 0) {
            return res.status(404).json({ erro: 'Veículo não encontrado' });
        }
        
        res.json({ mensagem: 'Veículo atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar veículo:', error);
        res.status(500).json({ erro: 'Erro ao atualizar veículo' });
    }
});

// ============================================================
// ROTA: DELETE /api/veiculos/:id
// ============================================================
// PROPÓSITO: Exclui um veículo permanentemente
// PARÂMETRO: :id → ObjectId do veículo
// USADO EM: main.js → Botão "Excluir" nos cards de veículos
// IMPORTANTE: Operação IRREVERSÍVEL - exclui o veículo e todas as suas manutenções
// EXEMPLO: DELETE /api/veiculos/507f1f77bcf86cd799439011
router.delete('/:id', async (req, res) => {
    try {
        // Exclui garantindo que o veículo pertence ao usuário autenticado (proteção contra IDOR)
        const resultado = await Veiculo.excluirDoProprietario(req.params.id, req.user._id);
        
        // deletedCount = 0 significa que o ID não foi encontrado ou não pertence ao usuário
        if (resultado.deletedCount === 0) {
            return res.status(404).json({ erro: 'Veículo não encontrado' });
        }
        
        res.json({ mensagem: 'Veículo excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir veículo:', error);
        res.status(500).json({ erro: 'Erro ao excluir veículo' });
    }
});

// ============================================================
// ROTA: POST /api/veiculos/:id/manutencoes
// ============================================================
// PROPÓSITO: Adiciona uma nova manutenção ao veículo
// PARÂMETRO: :id → ObjectId do veículo
// BODY ESPERADO: { data, km, tipo, custo, descricao, notaFiscal }
// USADO EM: manutencao-nova.js → Formulário de registro de manutenção
// STATUS: 201 (Created) em caso de sucesso
// IMPORTANTE:
//   - Adiciona ao array 'manutencoes' do veículo (usa $push no Model)
//   - Gera ID único para a manutenção (para poder excluir depois)
// EXEMPLO: POST /api/veiculos/507f1f77bcf86cd799439011/manutencoes
router.post('/:id/manutencoes', async (req, res) => {
    try {
        // Adiciona manutenção garantindo que o veículo pertence ao usuário autenticado (proteção contra IDOR)
        const resultado = await Veiculo.adicionarManutencaoDoProprietario(req.params.id, req.user._id, req.body);
        
        // matchedCount = 0 significa que o veículo não foi encontrado ou não pertence ao usuário
        if (resultado.matchedCount === 0) {
            return res.status(404).json({ erro: 'Veículo não encontrado' });
        }
        
        // Status 201 indica que um recurso foi criado
        res.status(201).json({ mensagem: 'Manutenção adicionada com sucesso' });
    } catch (error) {
        console.error('Erro ao adicionar manutenção:', error);
        res.status(500).json({ erro: 'Erro ao adicionar manutenção' });
    }
});

// ============================================================
// ROTA: DELETE /api/veiculos/:id/manutencoes/:manutencaoId
// ============================================================
// PROPÓSITO: Remove uma manutenção específica do veículo
// PARÂMETROS:
//   - :id → ObjectId do veículo
//   - :manutencaoId → ID único da manutenção (gerado ao adicionar)
// USADO EM: veiculo-detalhes.js → Botão "Excluir" em cada card de manutenção
// IMPORTANTE:
//   - Remove do array 'manutencoes' usando $pull no Model
//   - manutencaoId NÃO é ObjectId, é string gerada ao criar a manutenção
// EXEMPLO: DELETE /api/veiculos/507f1f77bcf86cd799439011/manutencoes/1628123456789
router.delete('/:id/manutencoes/:manutencaoId', async (req, res) => {
    try {
        // Exclui manutenção garantindo que o veículo pertence ao usuário autenticado (proteção contra IDOR)
        const resultado = await Veiculo.excluirManutencaoDoProprietario(req.params.id, req.user._id, req.params.manutencaoId);
        
        // matchedCount = 0 significa que o veículo não foi encontrado ou não pertence ao usuário
        if (resultado.matchedCount === 0) {
            return res.status(404).json({ erro: 'Veículo não encontrado' });
        }
        
        res.json({ mensagem: 'Manutenção excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir manutenção:', error);
        res.status(500).json({ erro: 'Erro ao excluir manutenção' });
    }
});

// ============================================================
// ROTA: PATCH /api/veiculos/:id/km
// ============================================================
// PROPÓSITO: Atualiza a quilometragem atual do veículo
// PARÂMETRO: :id → ObjectId do veículo
// BODY ESPERADO: { kmAtual: 55000, dataLeitura: "2026-08-05" }
// USADO EM: Futuramente (interface de atualização rápida de KM)
// MÉTODO: PATCH (indica atualização PARCIAL de um recurso)
// IMPORTANTE PARA NOTIFICAÇÕES:
//   - Sistema de notificações usa kmAtual para calcular quando fazer manutenção
//   - dataLeitura permite calcular média de KM rodados por mês
// EXEMPLO: PATCH /api/veiculos/507f1f77bcf86cd799439011/km
router.patch('/:id/km', async (req, res) => {
    try {
        // Desestruturação: extrai kmAtual e dataLeitura do body
        const { kmAtual, dataLeitura } = req.body;
        
        // Atualiza garantindo que o veículo pertence ao usuário autenticado (proteção contra IDOR)
        const resultado = await Veiculo.atualizarKmDoProprietario(req.params.id, req.user._id, kmAtual, dataLeitura);
        
        // matchedCount = 0 significa que o veículo não foi encontrado ou não pertence ao usuário
        if (resultado.matchedCount === 0) {
            return res.status(404).json({ erro: 'Veículo não encontrado' });
        }
        
        res.json({ mensagem: 'KM atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar KM:', error);
        res.status(500).json({ erro: 'Erro ao atualizar KM' });
    }
});

// ============================================================
// EXPORTAÇÃO
// ============================================================
// Exporta o router para ser registrado no app.js
// Será usado com prefixo /api/veiculos (configurado em app.js)
export default router;
