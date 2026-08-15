# Como Usar a Fase 4 - Segurança

## Visão Geral

A Fase 4 implementa middlewares e funções de autorização para garantir que apenas mecânicas com vínculo ATIVO possam acessar veículos e manutenções de clientes.

---

## Arquivos Principais

### 1. Middlewares (`src/js/middleware/vinculos.js`)

Contém middlewares que verificam autorização em rotas.

**Middlewares Disponíveis:**

- `requireActiveClientLink` - Verifica vínculo ATIVO com cliente
- `requireActiveVehicleAccess` - Verifica acesso a veículo

**Funções Disponíveis:**

- `canMechanicAccessClient(mechanicId, clientId)` - Verifica acesso a cliente
- `canMechanicAccessVehicle(mechanicId, vehicleId)` - Verifica acesso a veículo
- `verificarVinculoAtivo(usuarioId, mecanicaId)` - Verifica vínculo ATIVO

### 2. Funções Utilitárias (`src/js/utils/authorization.js`)

Contém funções reutilizáveis para lógica de negócio.

**Funções Disponíveis:**

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

---

## Como Usar em Rotas

### Exemplo 1: Proteger Rota com Middleware

```javascript
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import { requireActiveVehicleAccess } from '../middleware/vinculos.js';

// Rota protegida: apenas mecânica com vínculo ATIVO pode acessar
router.get('/vehicles/:id', 
    requireAuth,                    // Verificar autenticação
    requireRole('MECANICA'),        // Verificar role
    requireActiveVehicleAccess,     // Verificar vínculo ATIVO
    async (req, res) => {
        // Aqui a mecânica tem acesso garantido
        const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
        res.json({ success: true, veiculo });
    }
);
```

### Exemplo 2: Verificação Manual em Handler

```javascript
import { verificarAcessoVeiculo } from '../utils/authorization.js';

router.post('/veiculos/:id/manutencao', requireAuth, async (req, res) => {
    // Verificação manual
    const temAcesso = await verificarAcessoVeiculo(req.user._id, req.params.id);
    if (!temAcesso) {
        return res.status(403).json({ success: false, message: 'Acesso negado.' });
    }

    // Continuar com a operação
    // ...
});
```

### Exemplo 3: Listar Dados Acessíveis

```javascript
import { obterClientesAtivos, obterVeiculosAcessiveisParaMecanica } from '../utils/authorization.js';

// Listar clientes ATIVOS da mecânica
const clientesAtivos = await obterClientesAtivos(req.user._id);

// Listar todos os veículos acessíveis
const veiculosAcessiveis = await obterVeiculosAcessiveisParaMecanica(req.user._id);
```

---

## Fluxo de Autorização

### Fluxo Completo

```
1. Usuário faz requisição
   ↓
2. requireAuth verifica autenticação
   ├─ Se não autenticado → 401 Unauthorized
   └─ Se autenticado → continua
   ↓
3. requireRole verifica role
   ├─ Se role não permitido → 403 Forbidden
   └─ Se role permitido → continua
   ↓
4. requireActiveVehicleAccess verifica vínculo
   ├─ Busca veículo
   ├─ Obtém ownerId do veículo
   ├─ Verifica vínculo ATIVO entre mecânica e proprietário
   ├─ Se vínculo não ATIVO → 403 Forbidden
   └─ Se vínculo ATIVO → continua
   ↓
5. Handler executa operação
```

---

## Testes

### Executar Testes

```bash
npm test -- src/js/__tests__/vinculos.authorization.test.js
```

### Testes Inclusos

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

## Cenários de Teste Manual

### Cenário 1: Mecânica Acessa Veículo com Vínculo ATIVO

```
1. Criar cliente (USER)
2. Criar mecânica (MECANICA)
3. Criar vínculo PENDENTE
4. Aceitar vínculo (status = ATIVO)
5. Criar veículo do cliente
6. Mecânica tenta acessar veículo
   → ✅ Acesso permitido (200 OK)
```

### Cenário 2: Mecânica Acessa Veículo com Vínculo PENDENTE

```
1. Criar cliente (USER)
2. Criar mecânica (MECANICA)
3. Criar vínculo PENDENTE (não aceitar)
4. Criar veículo do cliente
5. Mecânica tenta acessar veículo
   → ❌ Acesso negado (403 Forbidden)
```

### Cenário 3: Mecânica Acessa Veículo com Vínculo RECUSADO

```
1. Criar cliente (USER)
2. Criar mecânica (MECANICA)
3. Criar vínculo PENDENTE
4. Recusar vínculo (status = RECUSADO)
5. Criar veículo do cliente
6. Mecânica tenta acessar veículo
   → ❌ Acesso negado (403 Forbidden)
```

### Cenário 4: Mecânica Acessa Veículo com Vínculo INATIVO

```
1. Criar cliente (USER)
2. Criar mecânica (MECANICA)
3. Criar vínculo PENDENTE
4. Aceitar vínculo (status = ATIVO)
5. Desativar vínculo (status = INATIVO)
6. Criar veículo do cliente
7. Mecânica tenta acessar veículo
   → ❌ Acesso negado (403 Forbidden)
```

### Cenário 5: Mecânica Cria Manutenção com Vínculo ATIVO

```
1. Criar cliente (USER)
2. Criar mecânica (MECANICA)
3. Criar vínculo PENDENTE
4. Aceitar vínculo (status = ATIVO)
5. Criar veículo do cliente
6. Mecânica tenta criar manutenção
   → ✅ Manutenção criada (201 Created)
```

### Cenário 6: Mecânica Cria Manutenção com Vínculo PENDENTE

```
1. Criar cliente (USER)
2. Criar mecânica (MECANICA)
3. Criar vínculo PENDENTE (não aceitar)
4. Criar veículo do cliente
5. Mecânica tenta criar manutenção
   → ❌ Acesso negado (403 Forbidden)
```

---

## Rotas Protegidas

### Rotas de Mecânica

| Rota | Método | Proteção | Status |
|------|--------|----------|--------|
| `/api/mechanic/vehicles` | GET | requireAuth, requireRole('MECANICA') | ✅ |
| `/api/mechanic/vehicles/:id` | GET | requireAuth, requireRole('MECANICA'), requireActiveVehicleAccess | ✅ |
| `/api/mechanic/vehicles/:id/maintenance` | POST | requireAuth, requireRole('MECANICA'), requireActiveVehicleAccess | ✅ |

### Rotas de Manutenção

| Rota | Método | Proteção | Status |
|------|--------|----------|--------|
| `/api/vehicles/:id/maintenance` | POST | requireAuth, verificação de vínculo para MECANICA | ✅ |
| `/api/vehicles/:id/maintenance/:manutencaoId` | DELETE | requireAuth | ✅ |
| `/api/vehicles/:id/maintenance/km` | PATCH | requireAuth | ✅ |

---

## Regras de Segurança

### ✅ Implementadas

1. **Autenticação Obrigatória**
   - Todas as rotas protegidas exigem `requireAuth`

2. **Autorização por Role**
   - Verificar `role` do usuário (USER, MECANICA, ADMIN)

3. **Vínculo ATIVO**
   - Apenas vínculos com `status = ATIVO` concedem acesso

4. **Proteção Contra IDOR**
   - Não confiar em IDs enviados pelo cliente
   - Sempre verificar vínculo no backend

5. **Whitelist de Campos**
   - Apenas campos permitidos podem ser gravados
   - Campos como `ownerId`, `mecanicaId`, `role` são protegidos

6. **Proteção Contra Privilege Escalation**
   - Mecânica não pode alterar `role`, `status`, `ownerId`

7. **Auditoria**
   - Ações importantes são registradas em `auditLogs`

---

## Documentação Adicional

Para mais detalhes, consulte:

- `src/js/middleware/VINCULOS_MIDDLEWARE_GUIDE.md` - Guia completo de middlewares
- `FASE_4_RESUMO.md` - Resumo da implementação
- `src/js/__tests__/vinculos.authorization.test.js` - Testes

---

## Próximas Etapas

### Fase 5 - Veículos

Modificar as consultas das mecânicas para retornarem apenas veículos de clientes vinculados.

### Fase 6 - Manutenções

Garantir que uma mecânica somente possa visualizar e editar manutenções de veículos pertencentes a clientes vinculados.

### Fase 7 - Frontend

Criar interface para:
- Lista de clientes
- Solicitações pendentes
- Detalhes do cliente
- Veículos
- Histórico de manutenção
- Cadastro de manutenção

---

## Troubleshooting

### Erro: "Você não tem acesso a este veículo"

**Causa:** Mecânica não tem vínculo ATIVO com proprietário do veículo.

**Solução:**
1. Verificar se vínculo existe
2. Verificar se vínculo está ATIVO
3. Se necessário, aceitar vínculo PENDENTE

### Erro: "Acesso negado"

**Causa:** Vínculo não está ATIVO.

**Solução:**
1. Verificar status do vínculo
2. Se PENDENTE: aceitar vínculo
3. Se RECUSADO: criar novo vínculo
4. Se INATIVO: reativar vínculo
5. Se BLOQUEADO: desbloquear (admin)

### Erro: "Não autenticado"

**Causa:** Usuário não está autenticado.

**Solução:**
1. Fazer login
2. Verificar se sessão é válida
3. Verificar se token é válido

---

## Suporte

Para dúvidas ou problemas, consulte:

1. Documentação: `src/js/middleware/VINCULOS_MIDDLEWARE_GUIDE.md`
2. Testes: `src/js/__tests__/vinculos.authorization.test.js`
3. Resumo: `FASE_4_RESUMO.md`
