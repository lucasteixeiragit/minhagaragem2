// ============================================================
// ARQUIVO: app.js
// DESCRIÇÃO: Configuração principal do Express
// ============================================================
// Este arquivo é responsável por:
// - Configurar middlewares do Express
// - Registrar rotas da API (/api/veiculos, /api/fabricantes)
// - Servir arquivos estáticos (HTML, CSS, JS do frontend)
// - Definir rotas de diagnóstico (health check)
// ============================================================

// Importa o framework Express (biblioteca principal para criar servidores web)
import express from "express";

// Importa módulo nativo do Node.js para manipulação de caminhos de arquivos
// Usado para construir paths absolutos e relativos de forma segura
import path from "path";

// Importa função para converter file URLs (import.meta.url) em caminhos do sistema
// NECESSÁRIO porque estamos usando ES Modules (type: "module" no package.json)
// Em CommonJS usaríamos __dirname diretamente, mas em ES Modules precisamos converter
import { fileURLToPath } from "url";

// Importa as rotas de veículos do arquivo routes/veiculos.js
// Contém endpoints: GET, POST, PUT, DELETE para manipular veículos
import veiculosRoutes from './routes/veiculos.js';

// Importa as rotas de fabricantes do arquivo routes/fabricantes.js
// Contém endpoints: GET para buscar marcas, modelos, versões, etc.
import fabricantesRoutes from './routes/fabricantes.js';

// ============================================================
// CONFIGURAÇÃO DE __dirname (necessário para ES Modules)
// ============================================================

// Converte a URL do arquivo atual (import.meta.url) para caminho do sistema
// EXEMPLO: file:///C:/Users/.../app.js → C:\Users\...\app.js
const __filename = fileURLToPath(import.meta.url);

// Extrai o diretório do arquivo atual
// EXEMPLO: Se __filename = C:\Users\lucas\minhagaragem\src\js\app.js
//          Então __dirname = C:\Users\lucas\minhagaragem\src\js
const __dirname = path.dirname(__filename);

// ============================================================
// CRIAÇÃO DA APLICAÇÃO EXPRESS
// ============================================================

// Cria uma instância do Express
// Este objeto 'app' é o núcleo da aplicação web
const app = express();

// ============================================================
// MIDDLEWARES GLOBAIS
// ============================================================
// Middlewares são funções que processam requisições antes de chegarem às rotas

// MIDDLEWARE 1: express.json()
// ============================================================
// PROPÓSITO: Parseia automaticamente requisições com Content-Type: application/json
// LIMITE: 10mb para evitar ataques de negação de serviço (DoS)
// QUANDO USA: Quando o frontend envia JSON no body (fetch com JSON.stringify)
// EXEMPLO:
//   Frontend: fetch('/api/veiculos', { method: 'POST', body: JSON.stringify({...}) })
//   Backend: req.body já vem parseado como objeto JavaScript
app.use(express.json({ limit: '10mb' }));

// MIDDLEWARE 2: express.urlencoded()
// ============================================================
// PROPÓSITO: Parseia dados de formulários HTML (Content-Type: application/x-www-form-urlencoded)
// extended: true → Permite objetos aninhados no formulário
// LIMITE: 10mb para evitar uploads muito grandes
// QUANDO USA: Quando formulários HTML são enviados com method="POST"
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MIDDLEWARE 3: express.static()
// ============================================================
// PROPÓSITO: Serve arquivos estáticos (HTML, CSS, JS, imagens)
// DIRETÓRIO: path.join(__dirname, '..') aponta para src/
// ESTRUTURA:
//   - Estamos em: src/js/app.js
//   - __dirname = src/js
//   - '..' sobe um nível = src/
// RESULTADO: Arquivos em src/ ficam acessíveis via URL
// EXEMPLOS:
//   - src/index.html → http://localhost:3000/index.html
//   - src/styles/main.css → http://localhost:3000/styles/main.css
//   - src/js/main.js → http://localhost:3000/js/main.js
app.use(express.static(path.join(__dirname, '..')));

// ============================================================
// ROTAS DA API
// ============================================================

// ROTA: /api/veiculos
// ============================================================
// APONTA PARA: routes/veiculos.js
// ENDPOINTS DISPONÍVEIS:
//   - GET    /api/veiculos          → Buscar todos os veículos
//   - GET    /api/veiculos/:id      → Buscar veículo por ID
//   - POST   /api/veiculos          → Criar novo veículo
//   - PUT    /api/veiculos/:id      → Atualizar veículo
//   - DELETE /api/veiculos/:id      → Excluir veículo
//   - POST   /api/veiculos/:id/manutencoes → Adicionar manutenção
//   - DELETE /api/veiculos/:id/manutencoes/:manutencaoId → Excluir manutenção
//   - PATCH  /api/veiculos/:id/km   → Atualizar KM do veículo
app.use('/api/veiculos', veiculosRoutes);

// ROTA: /api/fabricantes
// ============================================================
// APONTA PARA: routes/fabricantes.js
// ENDPOINTS DISPONÍVEIS:
//   - GET /api/fabricantes → Buscar todos os fabricantes
//   - GET /api/fabricantes/marcas → Listar apenas as marcas
//   - GET /api/fabricantes/:marca/modelos → Modelos de uma marca
//   - GET /api/fabricantes/:marca/modelos/:nomeModelo/versoes → Versões de um modelo
//   - GET /api/fabricantes/:marca/.../versoes/:nomeVersao/anos → Anos de uma versão
//   - GET /api/fabricantes/:marca/.../versoes/:nomeVersao/cambios → Câmbios de uma versão
//   - GET /api/fabricantes/:marca/.../cambios/:tipoCambio/intervalos → Intervalos de manutenção
app.use('/api/fabricantes', fabricantesRoutes);

// ============================================================
// ROTA RAIZ (HOME DA API)
// ============================================================

// GET /
// ============================================================
// PROPÓSITO: Informar que a API está funcionando
// RETORNA: Mensagem de texto simples
// QUANDO USAR: Acessar http://localhost:3000/ diretamente (sem /index.html)
// IMPORTANTE: Como express.static vem ANTES, se index.html existir, ele tem prioridade
app.get("/", (req, res) => {
    res.status(200).send("API Minha Garagem - Sistema de Gerenciamento de Veículos");
});

// ============================================================
// ROTA DE HEALTH CHECK
// ============================================================

// GET /api/health
// ============================================================
// PROPÓSITO: Verificar se a API está online e funcionando
// RETORNA: JSON com status, mensagem e timestamp
// QUANDO USAR:
//   - Monitoramento em produção (serviços como UptimeRobot)
//   - Testes automatizados de disponibilidade
//   - Debugging: verificar se o servidor está respondendo
// EXEMPLO DE RESPOSTA:
//   {
//     "status": "OK",
//     "mensagem": "API funcionando corretamente",
//     "timestamp": "2026-08-05T12:00:00.000Z"
//   }
app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        mensagem: 'API funcionando corretamente',
        timestamp: new Date() // Timestamp do servidor (útil para debug de timezone)
    });
});

// ============================================================
// EXPORTAÇÃO
// ============================================================
// Exporta a instância do Express configurada
// Será importada em server.js para iniciar o servidor HTTP
// POR QUÊ SEPARAR app.js e server.js?
//   - app.js: Configuração pura (testável, sem side effects)
//   - server.js: Inicia o servidor (side effect: abre porta, conecta DB)
//   - Facilita testes unitários (podemos testar rotas sem subir o servidor)
export default app;