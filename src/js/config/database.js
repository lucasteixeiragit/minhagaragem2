// ============================================================
// ARQUIVO: config/database.js
// DESCRIÇÃO: Gerenciamento da conexão com MongoDB
// ============================================================
// Este arquivo é responsável por:
// - Estabelecer conexão com o banco de dados MongoDB
// - Manter uma instância única da conexão (padrão Singleton)
// - Fornecer acesso ao banco para outros módulos
// - Gerenciar o ciclo de vida da conexão (conectar/desconectar)
// ============================================================

// Importa o cliente MongoDB oficial para Node.js
// MongoClient é a classe principal para conectar ao MongoDB
import { MongoClient } from 'mongodb';

// Importa dotenv para carregar variáveis de ambiente do arquivo .env
// Isso permite configurar a URI do MongoDB sem expor credenciais no código
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env para process.env
// Deve ser chamado antes de acessar process.env.MONGODB_URI
dotenv.config();

// ============================================================
// CONFIGURAÇÕES DO BANCO DE DADOS
// ============================================================

// URI de conexão ao MongoDB
// FORMATO: mongodb://[usuario:senha@]host:porta/database
// VALOR PADRÃO: 'mongodb://localhost:27017/minhagaragem'
// - Se MONGODB_URI estiver definida no .env, usa ela
// - Caso contrário, usa localhost (desenvolvimento local)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/minhagaragem';

// Nome do banco de dados que será usado
// Este nome deve corresponder ao database na URI de conexão
const DB_NAME = 'minhagaragem';

// ============================================================
// VARIÁVEIS DE ESTADO (PADRÃO SINGLETON)
// ============================================================

// Armazena a instância do cliente MongoDB
// Inicialmente null, será preenchida na primeira conexão
// Mantém a conexão viva durante toda a execução do servidor
let client = null;

// Armazena a referência ao banco de dados
// Inicialmente null, será preenchida após client.connect()
// Permite acesso direto às coleções (ex: db.collection('veiculos'))
let db = null;

// ============================================================
// FUNÇÃO: conectarBanco()
// ============================================================
// PROPÓSITO: Estabelece conexão com MongoDB
// RETORNA: Instância do banco de dados (db)
// QUANDO USAR: Chamada uma vez no início do servidor (server.js)
// ============================================================
async function conectarBanco() {
    try {
        // Verifica se já existe uma conexão ativa
        // Isso evita múltiplas conexões desnecessárias (padrão Singleton)
        if (client && db) {
            console.log('✅ Já conectado ao MongoDB');
            return db; // Retorna a conexão existente
        }

        console.log('🔄 Conectando ao MongoDB...');
        
        // Cria uma nova instância do cliente MongoDB
        // MongoClient gerencia o pool de conexões automaticamente
        client = new MongoClient(MONGODB_URI);
        
        // Conecta ao servidor MongoDB (operação assíncrona)
        // Este comando estabelece a conexão TCP com o banco
        await client.connect();
        
        // Seleciona o banco de dados específico
        // A partir deste momento, podemos acessar coleções via db.collection()
        db = client.db(DB_NAME);
        
        console.log('✅ Conectado ao MongoDB com sucesso!');
        return db; // Retorna a instância do banco para uso imediato
        
    } catch (error) {
        // Captura qualquer erro durante a conexão (ex: MongoDB não está rodando)
        console.error('❌ Erro ao conectar ao MongoDB:', error);
        throw error; // Re-lança o erro para que o servidor possa lidar com ele
    }
}

// ============================================================
// FUNÇÃO: desconectarBanco()
// ============================================================
// PROPÓSITO: Fecha a conexão com MongoDB de forma limpa
// QUANDO USAR: Ao encerrar o servidor (SIGINT, SIGTERM)
// POR QUÊ: Evita conexões pendentes e libera recursos
// ============================================================
async function desconectarBanco() {
    try {
        // Verifica se existe uma conexão ativa antes de tentar fechar
        if (client) {
            // Fecha a conexão com o MongoDB
            await client.close();
            
            // Limpa as referências para permitir garbage collection
            client = null;
            db = null;
            
            console.log('✅ Desconectado do MongoDB');
        }
    } catch (error) {
        // Captura erros durante o fechamento da conexão
        console.error('❌ Erro ao desconectar do MongoDB:', error);
        throw error;
    }
}

// ============================================================
// FUNÇÃO: getBanco()
// ============================================================
// PROPÓSITO: Fornece acesso à instância do banco
// RETORNA: Referência ao banco de dados (db)
// QUANDO USAR: Em Models e Routes para acessar coleções
// SEGURANÇA: Valida se a conexão foi estabelecida antes de retornar
// ============================================================
function getBanco() {
    // Valida se o banco está conectado
    // Se não estiver, lança um erro explicativo
    if (!db) {
        throw new Error('Banco de dados não está conectado. Execute conectarBanco() primeiro.');
    }
    
    // Retorna a instância do banco
    // Permite uso como: const db = getBanco(); db.collection('veiculos')
    return db;
}

// ============================================================
// EXPORTAÇÕES
// ============================================================
// Exporta as 3 funções principais para serem usadas em outros arquivos:
// - conectarBanco: Usado em server.js ao iniciar o servidor
// - desconectarBanco: Usado em server.js ao encerrar o servidor (SIGINT)
// - getBanco: Usado em Models (Veiculo.js, Fabricante.js) para acessar coleções
// ============================================================
export { conectarBanco, desconectarBanco, getBanco };
