# Índice - Fase 4: Segurança

## 📋 Documentação

### Documentos Principais

1. **FASE_4_RESUMO.md** - Resumo executivo da Fase 4
   - Status da implementação
   - Arquivos criados e modificados
   - Fluxo de autorização
   - Regras de segurança
   - Exemplos de uso
   - Testes implementados

2. **COMO_USAR_FASE_4.md** - Guia prático de uso
   - Como usar middlewares em rotas
   - Como usar funções de autorização
   - Fluxo de autorização
   - Testes
   - Cenários de teste manual
   - Troubleshooting

3. **CHECKLIST_FASE_4.md** - Checklist de implementação
   - Tarefas implementadas
   - Regras de segurança
   - Testes realizados
   - Commits realizados
   - Próximas fases

4. **INDICE_FASE_4.md** - Este arquivo
   - Índice de todos os arquivos
   - Estrutura do projeto
   - Como navegar

---

## 📁 Arquivos Criados

### Middlewares

**Arquivo:** `src/js/middleware/vinculos.js`

Middlewares de autorização de vínculo entre cliente e mecânica.

**Funções Exportadas:**
- `canMechanicAccessClient(mechanicId, clientId)` - Verifica acesso a cliente
- `canMechanicAccessVehicle(mechanicId, vehicleId)` - Verifica acesso a veículo
- `verificarVinculoAtivo(usuarioId, mecanicaId)` - Verifica vínculo ATIVO
- `requireActiveClientLink` - Middleware para verificar vínculo com cliente
- `requireActiveVehicleAccess` - Middleware para verificar acesso a veículo

**Tamanho:** ~280 linhas

**Localização:** `/src/js/middleware/vinculos.js`

### Funções de Autorização

**Arquivo:** `src/js/utils/authorization.js`

Funções reutilizáveis de autorização de vínculo.

**Funções Exportadas:**
- `verificarVinculoAtivo(usuarioId, mecanicaId)` - Verifica vínculo ATIVO
- `obterClientesAtivos(mecanicaId)` - Lista clientes ATIVOS
- `obterMecanicasAtivas(usuarioId)` - Lista mecânicas ATIVAS
- `verificarAcessoVeiculo(mechanicId, vehicleId)` - Verifica acesso a veículo
- `verificarAcessoManutencao(mechanicId, vehicleId)` - Verifica acesso a manutenção
- `obterVeiculosDoCliente(mechanicId, clientId)` - Lista veículos de cliente
- `obterVeiculosAcessiveisParaMecanica(mechanicId)` - Lista todos os veículos acessíveis
- `obterManutencoesAcessiveisParaMecanica(mechanicId)` - Lista todas as manutenções acessíveis
- `validarTransicaoStatus(statusAtual, novoStatus)` - Valida transição de status
- `obterStatusVinculo(usuarioId, mecanicaId)` - Obtém status do vínculo

**Tamanho:** ~350 linhas

**Localização:** `/src/js/utils/authorization.js`

### Documentação Técnica

**Arquivo:** `src/js/middleware/VINCULOS_MIDDLEWARE_GUIDE.md`

Guia completo de middlewares com exemplos de uso.

**Conteúdo:**
- Visão geral dos middlewares
- Descrição detalhada de cada função
- Fluxo de autorização
- Exemplos de integração com rotas
- Regras de segurança
- Testes obrigatórios

**Tamanho:** ~600 linhas

**Localização:** `/src/js/middleware/VINCULOS_MIDDLEWARE_GUIDE.md`

### Testes

**Arquivo:** `src/js/__tests__/vinculos.authorization.test.js`

Suite de testes para validar a implementação.

**Testes Inclusos:**
- Acesso permitido (vínculo ATIVO)
- Acesso negado (vínculo PENDENTE)
- Acesso negado (vínculo RECUSADO)
- Acesso negado (vínculo INATIVO)
- Acesso negado (vínculo BLOQUEADO)
- Acesso negado (sem vínculo)
- Validação de transição de status

**Tamanho:** ~400 linhas

**Localização:** `/src/js/__tests__/vinculos.authorization.test.js`

---

## 📝 Arquivos Modificados

### Rotas de Mecânica

**Arquivo:** `src/js/routes/mechanic.routes.js`

**Mudanças:**
- Importar `requireActiveVehicleAccess` do middleware
- Importar `verificarAcessoVeiculo` das funções de autorização
- Adicionar `requireActiveVehicleAccess` na rota `GET /api/mechanic/vehicles/:id`
- Adicionar `requireActiveVehicleAccess` na rota `POST /api/mechanic/vehicles/:id/maintenance`

**Impacto:** Mecânica agora precisa ter vínculo ATIVO para acessar veículos.

### Rotas de Manutenção

**Arquivo:** `src/js/routes/maintenance.routes.js`

**Mudanças:**
- Importar `requireRole` do middleware de autorização
- Importar `requireActiveVehicleAccess` do middleware de vínculo
- Adicionar verificação de vínculo ATIVO para mecânicas na rota `POST /api/vehicles/:id/maintenance`
- Se é MECANICA: verificar vínculo ATIVO com proprietário
- Se é USER: adicionar manutenção ao seu próprio veículo

**Impacto:** Mecânicas agora precisam ter vínculo ATIVO para criar manutenções.

---

## 🔐 Segurança Implementada

### Autenticação
- ✅ Todas as rotas protegidas exigem `requireAuth`
- ✅ Verificar se usuário está autenticado
- ✅ Verificar se usuário está ativo

### Autorização por Role
- ✅ Verificar `role` do usuário (USER, MECANICA, ADMIN)
- ✅ Rejeitar requisições de roles não permitidos
- ✅ Retornar 403 Forbidden se role não permitido

### Vínculo ATIVO
- ✅ Apenas vínculos com `status = ATIVO` concedem acesso
- ✅ Rejeitar PENDENTE, RECUSADO, INATIVO, BLOQUEADO
- ✅ Retornar 403 Forbidden se vínculo não ATIVO

### Proteção Contra IDOR
- ✅ Não confiar em IDs enviados pelo cliente
- ✅ Sempre verificar vínculo no backend
- ✅ Verificar que veículo pertence ao cliente vinculado

### Whitelist de Campos
- ✅ Apenas campos permitidos podem ser gravados
- ✅ Campos como `ownerId`, `mecanicaId`, `role` são protegidos
- ✅ Ignorar campos não permitidos no body

### Proteção Contra Privilege Escalation
- ✅ Mecânica não pode alterar `role`
- ✅ Mecânica não pode alterar `ownerId`
- ✅ Mecânica não pode alterar `mecanicaId`
- ✅ Mecânica não pode alterar `status`

### Auditoria
- ✅ Registrar criação de vínculo
- ✅ Registrar aceite de vínculo
- ✅ Registrar recusa de vínculo
- ✅ Registrar desativação de vínculo
- ✅ Registrar bloqueio de vínculo
- ✅ Registrar criação de manutenção pela mecânica

---

## 🧪 Testes

### Executar Testes

```bash
npm test -- src/js/__tests__/vinculos.authorization.test.js
```

### Testes Implementados

1. **Acesso Permitido (Vínculo ATIVO)**
   - Mecânica com vínculo ATIVO pode acessar veículos

2. **Acesso Negado (Vínculo PENDENTE)**
   - Mecânica com vínculo PENDENTE não pode acessar

3. **Acesso Negado (Vínculo RECUSADO)**
   - Mecânica com vínculo RECUSADO não pode acessar

4. **Acesso Negado (Vínculo INATIVO)**
   - Mecânica com vínculo INATIVO não pode acessar

5. **Acesso Negado (Vínculo BLOQUEADO)**
   - Mecânica com vínculo BLOQUEADO não pode acessar

6. **Acesso Negado (Sem Vínculo)**
   - Mecânica sem vínculo não pode acessar

7. **Validação de Transição de Status**
   - Transições de status são validadas

---

## 📚 Como Navegar

### Para Entender a Implementação

1. Leia **FASE_4_RESUMO.md** para visão geral
2. Leia **src/js/middleware/VINCULOS_MIDDLEWARE_GUIDE.md** para detalhes técnicos
3. Consulte **src/js/middleware/vinculos.js** para código dos middlewares
4. Consulte **src/js/utils/authorization.js** para código das funções

### Para Usar em Seu Código

1. Leia **COMO_USAR_FASE_4.md** para exemplos práticos
2. Copie os exemplos de integração com rotas
3. Adapte para suas necessidades
4. Consulte **CHECKLIST_FASE_4.md** para validar implementação

### Para Testar

1. Leia **COMO_USAR_FASE_4.md** seção "Testes"
2. Execute os testes com `npm test`
3. Siga os cenários de teste manual
4. Consulte **src/js/__tests__/vinculos.authorization.test.js** para detalhes

---

## 🔗 Relacionamentos

### Arquivos Relacionados

```
src/js/
├── middleware/
│   ├── vinculos.js ..................... Middlewares de autorização
│   ├── auth.js ......................... Autenticação
│   ├── authorization.js ............... Autorização por role
│   └── VINCULOS_MIDDLEWARE_GUIDE.md ... Documentação técnica
├── utils/
│   ├── authorization.js ............... Funções de autorização
│   └── audit.js ........................ Auditoria
├── routes/
│   ├── mechanic.routes.js ............. Rotas de mecânica (modificado)
│   ├── maintenance.routes.js .......... Rotas de manutenção (modificado)
│   ├── vehicle.routes.js .............. Rotas de veículo
│   └── vinculos.routes.js ............. Rotas de vínculo
├── models/
│   ├── Vinculo.js ..................... Model de vínculo
│   ├── Usuario.js ..................... Model de usuário
│   └── Veiculo.js ..................... Model de veículo
└── __tests__/
    └── vinculos.authorization.test.js . Testes de autorização
```

### Fluxo de Dados

```
Requisição HTTP
    ↓
requireAuth (middleware/auth.js)
    ↓
requireRole (middleware/authorization.js)
    ↓
requireActiveVehicleAccess (middleware/vinculos.js)
    ├─ canMechanicAccessVehicle (middleware/vinculos.js)
    ├─ verificarVinculoAtivo (utils/authorization.js)
    └─ Vinculo.buscarAtivoEntre (models/Vinculo.js)
    ↓
Handler (routes/*.js)
    ├─ verificarAcessoVeiculo (utils/authorization.js)
    ├─ obterClientesAtivos (utils/authorization.js)
    └─ obterVeiculosAcessiveisParaMecanica (utils/authorization.js)
    ↓
Resposta HTTP
```

---

## 📊 Estatísticas

### Código Criado

| Arquivo | Linhas | Tipo |
|---------|--------|------|
| vinculos.js | ~280 | Middleware |
| authorization.js | ~350 | Funções |
| VINCULOS_MIDDLEWARE_GUIDE.md | ~600 | Documentação |
| vinculos.authorization.test.js | ~400 | Testes |
| **Total** | **~1.630** | **Código** |

### Documentação Criada

| Arquivo | Linhas | Tipo |
|---------|--------|------|
| FASE_4_RESUMO.md | ~323 | Resumo |
| COMO_USAR_FASE_4.md | ~353 | Guia |
| CHECKLIST_FASE_4.md | ~333 | Checklist |
| INDICE_FASE_4.md | Este arquivo | Índice |
| **Total** | **~1.342** | **Documentação** |

### Total Geral

- **Código:** ~1.630 linhas
- **Documentação:** ~1.342 linhas
- **Total:** ~2.972 linhas

---

## 🚀 Próximas Fases

### Fase 5 - Veículos
- Modificar consultas das mecânicas para retornarem apenas veículos de clientes vinculados
- Criar rota para listar veículos acessíveis
- Criar rota para listar clientes ativos

### Fase 6 - Manutenções
- Garantir que mecânica só visualize manutenções de clientes vinculados
- Garantir que mecânica só edite manutenções criadas por ela
- Criar rota para listar manutenções acessíveis

### Fase 7 - Frontend
- Criar interface para lista de clientes
- Criar interface para solicitações pendentes
- Criar interface para detalhes do cliente
- Criar interface para veículos
- Criar interface para histórico de manutenção
- Criar interface para cadastro de manutenção

### Fase 8 - Testes
- Testes de integração
- Testes de API
- Testes de segurança
- Testes de performance

---

## ✅ Status

**Fase 4 - Segurança: ✅ CONCLUÍDO**

Todos os middlewares e funções de autorização foram implementados, testados e documentados. O sistema agora garante que apenas mecânicas com vínculo ATIVO possam acessar veículos e manutenções de clientes.

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte **COMO_USAR_FASE_4.md** seção "Troubleshooting"
2. Leia **src/js/middleware/VINCULOS_MIDDLEWARE_GUIDE.md**
3. Verifique os testes em **src/js/__tests__/vinculos.authorization.test.js**
4. Consulte **FASE_4_RESUMO.md** para visão geral

---

**Última atualização:** 15 de agosto de 2026
**Versão:** 1.0
**Status:** Concluído ✅
