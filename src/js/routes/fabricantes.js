// ============================================================
// ARQUIVO: routes/fabricantes.js
// DESCRIÇÃO: Rotas da API para dados de fabricantes, modelos e intervalos de manutenção
// ============================================================
// PREFIXO DE ROTAS: /api/fabricantes (configurado em app.js)
// RESPONSABILIDADES:
//   - Listar marcas, modelos, versões, anos, câmbios
//   - Retornar intervalos de manutenção específicos por câmbio
//   - Fornecer dados em cascata para formulário de novo veículo
// ============================================================

// Importa Express Router para criar rotas modulares
import express from 'express';

// Importa o Model Fabricante que acessa o MongoDB
import Fabricante from '../models/Fabricante.js';

// Cria uma instância do Router do Express
// Este router será exportado e registrado no app.js com prefixo /api/fabricantes
const router = express.Router();

// ============================================================
// ROTA: GET /api/fabricantes
// ============================================================
// PROPÓSITO: Retorna TODOS os fabricantes com modelos, versões, etc completos
// USADO EM: Raramente (dados muito grandes)
// RETORNA: Array de objetos completos
router.get('/', async (req, res) => {
    try {
        // Chama método do Model que busca tudo no MongoDB
        const fabricantes = await Fabricante.buscarTodos();
        
        // Retorna JSON com status 200 (OK) implícito
        res.json(fabricantes);
    } catch (error) {
        // Log do erro no console do servidor (para debugging)
        console.error('Erro ao buscar fabricantes:', error);
        
        // Retorna erro 500 (Internal Server Error) ao frontend
        res.status(500).json({ erro: 'Erro ao buscar fabricantes' });
    }
});

// ============================================================
// ROTA: GET /api/fabricantes/marcas
// ============================================================
// PROPÓSITO: Retorna apenas array de nomes das marcas (ex: ["Chevrolet", "Ford"])
// USADO EM: veiculo-novo.js → Popula primeiro dropdown (select de marca)
// IMPORTANTE: Esta rota deve vir ANTES de /:marca para não conflitar
router.get('/marcas', async (req, res) => {
    try {
        const marcas = await Fabricante.listarMarcas();
        res.json(marcas);
    } catch (error) {
        console.error('Erro ao listar marcas:', error);
        res.status(500).json({ erro: 'Erro ao listar marcas' });
    }
});

// ============================================================
// ROTA: GET /api/fabricantes/:marca
// ============================================================
// PROPÓSITO: Retorna dados completos de um fabricante específico
// PARÂMETRO: :marca → Nome da marca (ex: "Chevrolet")
// RETORNA: Objeto completo com todos os modelos/versões
// EXEMPLO: GET /api/fabricantes/Chevrolet
router.get('/:marca', async (req, res) => {
    try {
        // req.params.marca extrai o valor do parâmetro de rota :marca
        const fabricante = await Fabricante.buscarPorMarca(req.params.marca);
        
        // Validação: Se marca não existe, retorna 404 (Not Found)
        if (!fabricante) {
            return res.status(404).json({ erro: 'Fabricante não encontrado' });
        }
        
        res.json(fabricante);
    } catch (error) {
        console.error('Erro ao buscar fabricante:', error);
        res.status(500).json({ erro: 'Erro ao buscar fabricante' });
    }
});

// ============================================================
// ROTA: GET /api/fabricantes/:marca/modelos
// ============================================================
// PROPÓSITO: Lista modelos de uma marca específica
// USADO EM: veiculo-novo.js → Popula segundo dropdown após selecionar marca
// EXEMPLO: GET /api/fabricantes/Chevrolet/modelos
// RETORNA: [{ nome: "Onix", descricao: "Hatch" }, ...]
router.get('/:marca/modelos', async (req, res) => {
    try {
        const modelos = await Fabricante.listarModelosPorMarca(req.params.marca);
        res.json(modelos);
    } catch (error) {
        console.error('Erro ao listar modelos:', error);
        res.status(500).json({ erro: 'Erro ao listar modelos' });
    }
});

// ============================================================
// ROTA: GET /api/fabricantes/:marca/modelos/:nomeModelo/versoes
// ============================================================
// PROPÓSITO: Lista versões de um modelo específico
// USADO EM: veiculo-novo.js → Popula terceiro dropdown após selecionar modelo
// EXEMPLO: GET /api/fabricantes/Chevrolet/modelos/Onix/versoes
// IMPORTANTE: decodeURIComponent() decodifica espaços e caracteres especiais
//   - URL: /Chevrolet/modelos/Onix%20Plus/versoes
//   - Após decode: "Onix Plus"
router.get('/:marca/modelos/:nomeModelo/versoes', async (req, res) => {
    try {
        const versoes = await Fabricante.listarVersoesPorModelo(
            req.params.marca,
            // decodeURIComponent necessário porque nomes de modelos podem ter espaços
            decodeURIComponent(req.params.nomeModelo)
        );
        res.json(versoes);
    } catch (error) {
        console.error('Erro ao listar versões:', error);
        res.status(500).json({ erro: 'Erro ao listar versões' });
    }
});

// ============================================================
// ROTA: GET /api/fabricantes/:marca/modelos/:nomeModelo/versoes/:nomeVersao/anos
// ============================================================
// PROPÓSITO: Lista anos disponíveis para uma versão
// USADO EM: veiculo-novo.js → Popula quarto dropdown após selecionar versão
// EXEMPLO: GET /api/fabricantes/Chevrolet/modelos/Onix/versoes/LTZ%201.4/anos
// RETORNA: [2013, 2014, 2015, ..., 2020]
router.get('/:marca/modelos/:nomeModelo/versoes/:nomeVersao/anos', async (req, res) => {
    try {
        const anos = await Fabricante.listarAnosPorVersao(
            req.params.marca,
            decodeURIComponent(req.params.nomeModelo),
            decodeURIComponent(req.params.nomeVersao)
        );
        res.json(anos);
    } catch (error) {
        console.error('Erro ao listar anos:', error);
        res.status(500).json({ erro: 'Erro ao listar anos' });
    }
});

// ============================================================
// ROTA: GET /api/fabricantes/:marca/modelos/:nomeModelo/versoes/:nomeVersao/cambios
// ============================================================
// PROPÓSITO: Lista tipos de câmbio disponíveis para uma versão
// USADO EM: veiculo-novo.js → Popula quinto dropdown após selecionar versão
// EXEMPLO: GET /api/fabricantes/Chevrolet/modelos/Onix/versoes/LTZ%201.4/cambios
// RETORNA: [{ tipo: "Manual", marchas: "5 marchas" }, { tipo: "Automático", marchas: "6 marchas" }]
// IMPORTANTE: Câmbios diferentes têm intervalos de manutenção DIFERENTES
router.get('/:marca/modelos/:nomeModelo/versoes/:nomeVersao/cambios', async (req, res) => {
    try {
        const cambios = await Fabricante.listarCambiosPorVersao(
            req.params.marca,
            decodeURIComponent(req.params.nomeModelo),
            decodeURIComponent(req.params.nomeVersao)
        );
        res.json(cambios);
    } catch (error) {
        console.error('Erro ao listar câmbios:', error);
        res.status(500).json({ erro: 'Erro ao listar câmbios' });
    }
});

// ============================================================
// ROTA: GET /api/fabricantes/:marca/.../cambios/:tipoCambio/intervalos
// ============================================================
// PROPÓSITO: Retorna intervalos de manutenção preventiva para um câmbio específico
// USADO EM: veiculo-novo.js → Carrega intervalos após selecionar câmbio
// EXEMPLO: GET /api/fabricantes/Chevrolet/modelos/Onix/versoes/LTZ%201.4/cambios/Manual/intervalos
// RETORNA:
//   {
//     trocaOleo: { nome: "Troca de Óleo", intervaloKm: 10000, intervaloMeses: 12, ... },
//     filtroAr: { nome: "Filtro de Ar", intervaloKm: 15000, ... },
//     ...
//   }
// IMPORTANTE:
//   - Estes intervalos são salvos no veículo como 'intervalosManutencoesPreventivas'
//   - Sistema de notificações usa estes dados para alertar quando fazer manutenção
router.get('/:marca/modelos/:nomeModelo/versoes/:nomeVersao/cambios/:tipoCambio/intervalos', async (req, res) => {
    try {
        const intervalos = await Fabricante.buscarIntervalos(
            req.params.marca,
            decodeURIComponent(req.params.nomeModelo),
            decodeURIComponent(req.params.nomeVersao),
            decodeURIComponent(req.params.tipoCambio)
        );
        
        // Validação: Se não encontrar intervalos, retorna 404
        // Isso pode acontecer se o câmbio não existir ou não ter intervalos cadastrados
        if (!intervalos) {
            return res.status(404).json({ erro: 'Intervalos não encontrados' });
        }
        
        res.json(intervalos);
    } catch (error) {
        console.error('Erro ao buscar intervalos:', error);
        res.status(500).json({ erro: 'Erro ao buscar intervalos' });
    }
});

// ============================================================
// EXPORTAÇÃO
// ============================================================
// Exporta o router para ser registrado no app.js
// Será usado com prefixo /api/fabricantes (configurado em app.js)
export default router;
