// ============================================================
// ARQUIVO: models/Fabricante.js
// DESCRIÇÃO: Model para manipular dados de fabricantes de veículos
// ============================================================
// Este arquivo é responsável por:
// - Acessar a coleção 'fabricantes' no MongoDB
// - Buscar informações sobre marcas, modelos, versões, câmbios
// - Retornar intervalos de manutenção preventiva específicos por câmbio
// - Fornecer métodos estáticos para uso nas rotas da API
// ============================================================

// Importa a função que retorna a instância do banco de dados conectado
// Esta função garante que o banco está conectado antes de acessar coleções
import { getBanco } from '../config/database.js';

// Importa ObjectId do MongoDB para manipular IDs no formato do MongoDB
// Necessário quando precisamos buscar documentos por _id
import { ObjectId } from 'mongodb';

// ============================================================
// CONFIGURAÇÃO DA COLEÇÃO
// ============================================================

// Nome da coleção no MongoDB que armazena os fabricantes
// ESTRUTURA DO DOCUMENTO:
// {
//   _id: ObjectId,
//   marca: "Chevrolet",
//   modelos: [
//     {
//       nome: "Onix",
//       descricao: "Hatch compacto",
//       versoes: [
//         {
//           nome: "LTZ 1.4",
//           motor: "1.4 Flex",
//           potencia: "106 cv",
//           anos: [2013, 2014, ..., 2020],
//           cambios: [
//             {
//               tipo: "Manual",
//               marchas: "5 marchas",
//               intervalos: {
//                 trocaOleo: { nome: "Troca de Óleo", intervaloKm: 10000, ... },
//                 ...
//               }
//             }
//           ]
//         }
//       ]
//     }
//   ]
// }
const COLECAO = 'fabricantes';

// ============================================================
// CLASSE FABRICANTE
// ============================================================
// Usa apenas métodos estáticos (static)
// Não precisa instanciar (new Fabricante()) - usa direto: Fabricante.buscarTodos()
// ============================================================
class Fabricante {
    
    // ========================================================
    // MÉTODO: buscarTodos()
    // ========================================================
    // PROPÓSITO: Retorna TODOS os fabricantes do banco
    // RETORNA: Array de documentos completos
    // USADO EM: routes/fabricantes.js → GET /api/fabricantes
    // EXEMPLO DE RETORNO:
    //   [{ _id: ..., marca: "Chevrolet", modelos: [...] }, ...]
    // ========================================================
    static async buscarTodos() {
        // Obtém a instância do banco de dados
        const db = getBanco();
        
        // Busca TODOS os documentos da coleção 'fabricantes'
        // find() sem parâmetros = buscar tudo
        // toArray() converte o cursor do MongoDB em array JavaScript
        return await db.collection(COLECAO).find().toArray();
    }

    // ========================================================
    // MÉTODO: buscarPorMarca(marca)
    // ========================================================
    // PROPÓSITO: Busca um fabricante específico pelo nome da marca
    // PARÂMETROS:
    //   - marca: String com nome da marca (ex: "Chevrolet")
    // RETORNA: Documento completo do fabricante ou null se não encontrado
    // USADO EM: routes/fabricantes.js → GET /api/fabricantes/:marca
    // ========================================================
    static async buscarPorMarca(marca) {
        const db = getBanco();
        
        // findOne() busca UM documento que corresponde ao filtro { marca }
        // Se não encontrar, retorna null automaticamente
        return await db.collection(COLECAO).findOne({ marca });
    }

    // ========================================================
    // MÉTODO: listarMarcas()
    // ========================================================
    // PROPÓSITO: Retorna apenas os NOMES das marcas (sem modelos/versões)
    // RETORNA: Array de strings com nomes das marcas
    // USADO EM: routes/fabricantes.js → GET /api/fabricantes/marcas
    // EXEMPLO DE RETORNO: ["Chevrolet", "Ford", "Volkswagen"]
    // POR QUÊ: Popula dropdown de marcas no formulário de novo veículo
    // ========================================================
    static async listarMarcas() {
        const db = getBanco();
        
        // Busca TODOS os fabricantes
        const fabricantes = await db.collection(COLECAO).find().toArray();
        
        // Extrai apenas o campo 'marca' de cada fabricante
        // map() transforma [{marca: "Chevrolet", ...}, ...] em ["Chevrolet", ...]
        return fabricantes.map(f => f.marca);
    }

    // ========================================================
    // MÉTODO: listarModelosPorMarca(marca)
    // ========================================================
    // PROPÓSITO: Lista os modelos de uma marca específica
    // PARÂMETROS:
    //   - marca: String com nome da marca (ex: "Chevrolet")
    // RETORNA: Array de objetos { nome, descricao }
    // USADO EM: routes/fabricantes.js → GET /api/fabricantes/:marca/modelos
    // EXEMPLO DE RETORNO: [{ nome: "Onix", descricao: "Hatch" }, ...]
    // POR QUÊ: Popula dropdown de modelos após selecionar marca
    // ========================================================
    static async listarModelosPorMarca(marca) {
        const db = getBanco();
        
        // Busca o fabricante completo pela marca
        const fabricante = await db.collection(COLECAO).findOne({ marca });
        
        // Validação: Se marca não existe, retorna array vazio
        if (!fabricante) return [];
        
        // Extrai apenas nome e descricao de cada modelo
        // Remove dados desnecessários (versoes, cambios) para otimizar response
        return fabricante.modelos.map(m => ({
            nome: m.nome,
            descricao: m.descricao
        }));
    }

    // ========================================================
    // MÉTODO: listarVersoesPorModelo(marca, nomeModelo)
    // ========================================================
    // PROPÓSITO: Lista as versões de um modelo específico
    // PARÂMETROS:
    //   - marca: String (ex: "Chevrolet")
    //   - nomeModelo: String (ex: "Onix")
    // RETORNA: Array de objetos { nome, motor, potencia, anos }
    // USADO EM: routes/fabricantes.js → GET /api/fabricantes/:marca/modelos/:nomeModelo/versoes
    // EXEMPLO DE RETORNO:
    //   [{ nome: "LTZ 1.4", motor: "1.4 Flex", potencia: "106 cv", anos: [2013...2020] }]
    // POR QUÊ: Popula dropdown de versões após selecionar modelo
    // ========================================================
    static async listarVersoesPorModelo(marca, nomeModelo) {
        const db = getBanco();
        const fabricante = await db.collection(COLECAO).findOne({ marca });
        
        // Validação 1: Marca não existe
        if (!fabricante) return [];
        
        // Busca o modelo específico dentro do array 'modelos'
        // find() retorna o PRIMEIRO elemento que corresponde à condição
        const modelo = fabricante.modelos.find(m => m.nome === nomeModelo);
        
        // Validação 2: Modelo não existe nesta marca
        if (!modelo) return [];
        
        // Extrai informações das versões (remove cambios para otimizar response)
        return modelo.versoes.map(v => ({
            nome: v.nome,
            motor: v.motor,
            potencia: v.potencia,
            anos: v.anos
        }));
    }

    // ========================================================
    // MÉTODO: listarAnosPorVersao(marca, nomeModelo, nomeVersao)
    // ========================================================
    // PROPÓSITO: Lista os anos disponíveis para uma versão específica
    // PARÂMETROS:
    //   - marca: String (ex: "Chevrolet")
    //   - nomeModelo: String (ex: "Onix")
    //   - nomeVersao: String (ex: "LTZ 1.4")
    // RETORNA: Array de números (ex: [2013, 2014, ..., 2020])
    // USADO EM: routes/fabricantes.js → GET /api/fabricantes/.../versoes/:nomeVersao/anos
    // POR QUÊ: Popula dropdown de anos após selecionar versão
    // ========================================================
    static async listarAnosPorVersao(marca, nomeModelo, nomeVersao) {
        const db = getBanco();
        const fabricante = await db.collection(COLECAO).findOne({ marca });
        
        // Validação 1: Marca não existe
        if (!fabricante) return [];
        
        // Navega: fabricante → modelo
        const modelo = fabricante.modelos.find(m => m.nome === nomeModelo);
        
        // Validação 2: Modelo não existe
        if (!modelo) return [];
        
        // Navega: modelo → versão
        const versao = modelo.versoes.find(v => v.nome === nomeVersao);
        
        // Retorna array de anos (ex: [2013, 2014, 2015])
        // Se versão não existe, retorna array vazio
        return versao ? versao.anos : [];
    }

    // ========================================================
    // MÉTODO: listarCambiosPorVersao(marca, nomeModelo, nomeVersao)
    // ========================================================
    // PROPÓSITO: Lista os tipos de câmbio disponíveis para uma versão
    // PARÂMETROS:
    //   - marca: String (ex: "Chevrolet")
    //   - nomeModelo: String (ex: "Onix")
    //   - nomeVersao: String (ex: "LTZ 1.4")
    // RETORNA: Array de objetos { tipo, marchas }
    // USADO EM: routes/fabricantes.js → GET /api/fabricantes/.../versoes/:nomeVersao/cambios
    // EXEMPLO DE RETORNO:
    //   [
    //     { tipo: "Manual", marchas: "5 marchas" },
    //     { tipo: "Automático", marchas: "6 marchas" }
    //   ]
    // POR QUÊ: Popula dropdown de câmbios após selecionar versão
    // IMPORTANTE: Cada câmbio tem intervalos de manutenção DIFERENTES
    // ========================================================
    static async listarCambiosPorVersao(marca, nomeModelo, nomeVersao) {
        const db = getBanco();
        const fabricante = await db.collection(COLECAO).findOne({ marca });
        
        // Validação 1: Marca não existe
        if (!fabricante) return [];
        
        // Navega: fabricante → modelo
        const modelo = fabricante.modelos.find(m => m.nome === nomeModelo);
        
        // Validação 2: Modelo não existe
        if (!modelo) return [];
        
        // Navega: modelo → versão
        const versao = modelo.versoes.find(v => v.nome === nomeVersao);
        
        // Validação 3: Versão não existe
        if (!versao) return [];
        
        // Extrai apenas tipo e marchas dos câmbios (remove intervalos)
        return versao.cambios.map(c => ({
            tipo: c.tipo,
            marchas: c.marchas
        }));
    }

    // ========================================================
    // MÉTODO: buscarIntervalos(marca, nomeModelo, nomeVersao, tipoCambio)
    // ========================================================
    // PROPÓSITO: Busca os intervalos de manutenção preventiva de um câmbio específico
    // PARÂMETROS:
    //   - marca: String (ex: "Chevrolet")
    //   - nomeModelo: String (ex: "Onix")
    //   - nomeVersao: String (ex: "LTZ 1.4")
    //   - tipoCambio: String (ex: "Manual" ou "Automático")
    // RETORNA: Objeto com intervalos de manutenção ou null se não encontrado
    // USADO EM: routes/fabricantes.js → GET /api/fabricantes/.../cambios/:tipoCambio/intervalos
    // EXEMPLO DE RETORNO:
    //   {
    //     trocaOleo: { nome: "Troca de Óleo", intervaloKm: 10000, intervaloMeses: 12, ... },
    //     filtroAr: { nome: "Filtro de Ar", intervaloKm: 15000, ... },
    //     ...
    //   }
    // POR QUÊ É IMPORTANTE:
    //   - Câmbios diferentes têm manutenções DIFERENTES
    //   - Manual: 4 intervalos (óleo, filtros, velas, correia)
    //   - Automático: 5 intervalos (+ troca de óleo de transmissão)
    // ========================================================
    static async buscarIntervalos(marca, nomeModelo, nomeVersao, tipoCambio) {
        const db = getBanco();
        const fabricante = await db.collection(COLECAO).findOne({ marca });
        
        // Validação 1: Marca não existe
        if (!fabricante) return null;
        
        // Navega: fabricante → modelo
        const modelo = fabricante.modelos.find(m => m.nome === nomeModelo);
        
        // Validação 2: Modelo não existe
        if (!modelo) return null;
        
        // Navega: modelo → versão
        const versao = modelo.versoes.find(v => v.nome === nomeVersao);
        
        // Validação 3: Versão não existe
        if (!versao) return null;
        
        // Navega: versão → câmbio específico
        const cambio = versao.cambios.find(c => c.tipo === tipoCambio);
        
        // Retorna os intervalos de manutenção do câmbio
        // Se câmbio não existe, retorna null
        // Este objeto será salvo no veículo como 'intervalosManutencoesPreventivas'
        return cambio ? cambio.intervalos : null;
    }
}

// ============================================================
// EXPORTAÇÃO
// ============================================================
// Exporta a classe Fabricante como exportação padrão
// USADO EM:
//   - routes/fabricantes.js → Todas as rotas da API
//   - Futuramente: Sistema de notificações (buscar intervalos padrão)
// ============================================================
export default Fabricante;
