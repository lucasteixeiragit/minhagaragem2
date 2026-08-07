// ============================================================
// ARQUIVO: server.js
// DESCRIÇÃO: Ponto de entrada do servidor Node.js
// ============================================================
// Este arquivo é responsável por:
// - Iniciar o servidor HTTP Express
// - Conectar ao banco de dados MongoDB antes de aceitar requisições
// - Configurar handlers de encerramento gracioso (SIGINT, SIGTERM)
// - Gerenciar variáveis de ambiente
// ============================================================

// Importa a aplicação Express configurada (rotas, middlewares, etc)
// O app.js contém toda a configuração do Express, este arquivo apenas o inicia
import app from "./app.js";

// Importa a função de conexão com MongoDB
// Deve ser executada ANTES de iniciar o servidor para garantir que o banco esteja disponível
import { conectarBanco } from "./config/database.js";

// Importa dotenv para carregar variáveis de ambiente do arquivo .env
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env para process.env
// Isso deve ser feito o mais cedo possível no ciclo de vida da aplicação
dotenv.config();

// ============================================================
// CONFIGURAÇÕES DO SERVIDOR
// ============================================================

// Define a porta do servidor
// - Primeiro tenta usar PORT do arquivo .env
// - Se não existir, usa 3000 como padrão (desenvolvimento local)
// EXEMPLOS de uso:
//   - Desenvolvimento: 3000
//   - Produção: pode ser 80, 443, ou variável do hosting (Heroku, Railway, etc)
const PORT = process.env.PORT || 3000;

// ============================================================
// FUNÇÃO: iniciarServidor()
// ============================================================
// PROPÓSITO: Inicia o servidor HTTP após conectar ao banco
// FLUXO:
//   1. Conecta ao MongoDB (aguarda conexão)
//   2. Inicia o servidor Express na porta configurada
//   3. Em caso de erro, exibe mensagem e encerra o processo
// ============================================================
async function iniciarServidor() {
    try {
        // PASSO 1: Conecta ao MongoDB
        // ============================================================
        // Esta é uma operação CRÍTICA - se falhar, o servidor não inicia
        // Garante que todas as rotas que dependem do banco terão acesso a ele
        // A função conectarBanco() está em config/database.js
        await conectarBanco();
        
        // PASSO 2: Inicia o servidor HTTP
        // ============================================================
        // app.listen() vincula o servidor à porta especificada
        // A partir deste momento, o servidor aceita requisições HTTP
        // IMPORTANTE: Só executa após conectar ao banco (await acima)
        app.listen(PORT, () => {
            // Callback executado quando o servidor está pronto
            console.log(`🚀 Servidor MINHAGARAGEM rodando na porta ${PORT}`);
            console.log(`📡 Acesse: http://localhost:${PORT}`);
            // URLS disponíveis:
            // - http://localhost:3000/ → Página inicial (index.html)
            // - http://localhost:3000/api/veiculos → API de veículos
            // - http://localhost:3000/api/fabricantes → API de fabricantes
        });
        
    } catch (error) {
        // TRATAMENTO DE ERROS CRÍTICOS
        // ============================================================
        // Se houver erro ao conectar ao MongoDB ou iniciar o servidor:
        // 1. Exibe o erro no console
        // 2. Encerra o processo com código de erro (1)
        // POR QUÊ: Não faz sentido manter um servidor rodando sem banco de dados
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1); // Código 1 indica erro (0 seria sucesso)
    }
}

// ============================================================
// HANDLER: SIGINT (Ctrl+C)
// ============================================================
// PROPÓSITO: Encerrar o servidor de forma limpa quando receber sinal de interrupção
// QUANDO É ACIONADO:
//   - Usuário pressiona Ctrl+C no terminal
//   - Sistema envia sinal de encerramento (deployment, reinicialização)
// O QUE FAZ:
//   1. Exibe mensagem de encerramento
//   2. Desconecta do MongoDB (libera conexões)
//   3. Encerra o processo com código 0 (sucesso)
// POR QUÊ É IMPORTANTE:
//   - Evita conexões pendentes no MongoDB
//   - Previne corrupção de dados
//   - Permite restart limpo do servidor
// ============================================================
process.on('SIGINT', async () => {
    // \n adiciona uma linha em branco para não sobrepor a mensagem com ^C
    console.log('\n🔴 Encerrando servidor...');
    
    // Importa dinamicamente a função de desconexão
    // Por quê dinâmico? Para garantir que usamos a instância mais recente
    const { desconectarBanco } = await import('./config/database.js');
    
    // Desconecta do MongoDB de forma assíncrona
    // Aguarda a desconexão completa antes de encerrar
    await desconectarBanco();
    
    // Encerra o processo com código 0 (indica encerramento bem-sucedido)
    process.exit(0);
});

// ============================================================
// EXECUÇÃO INICIAL
// ============================================================
// Chama a função que inicia todo o servidor
// Esta é a primeira (e única) linha executada ao rodar: npm run dev
// FLUXO COMPLETO:
//   1. Carrega variáveis de ambiente (dotenv.config())
//   2. Conecta ao MongoDB (await conectarBanco())
//   3. Inicia servidor Express (app.listen())
//   4. Aguarda requisições...
//   5. Ao receber SIGINT, desconecta do MongoDB e encerra
// ============================================================
iniciarServidor();