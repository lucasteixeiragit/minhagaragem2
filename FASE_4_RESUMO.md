# Fase 4 - Segurança: Middlewares e Funções de Autorização de Vínculo

## Status: ✅ CONCLUÍDO

Esta fase implementa os middlewares e funções de autorização para garantir que apenas mecânicas com vínculo ATIVO possam acessar veículos e manutenções de clientes.

---

## Arquivos Criados

### 1. `src/js/middleware/vinculos.js`

**Descrição:** Middlewares de autorização de vínculo entre cliente e mecânica.

**Funções Exportadas:**

- `canMechanicAccessClient(mechanicId, clientId)` - Verifica se mecânica tem vínculo ATIVO com cliente
- `canMechanicAccessVehicle(mechanicId, vehicleId)` - Verifica se mecânica pode acessar veículo (via vínculo)
- `verificarVinculoAtivo(usuarioId, mecanicaId)` - Verifica se existe vínculo ATIVO
- `requireActiveClientLink` - Middleware que verifica vínculo ATIVO com cliente
- `requireActiveVehicleAccess` - Middleware que verifica acesso a veículo

**Tamanho:** ~280 linhas

### 2. `src/js/utils/authorization.js`

**Descrição:** Funções reutilizáveis de autorização de vínculo.

**Funções Exportadas:**

- `verificarVinculoAtivo(usuarioId, mecanicaId)` - Verifica vínculo ATIVO
- `obterClientesAtivos(mecanicaId)` - Lista clientes ATIVOS da mecânica
- `obterMecanicasAtivas(usuarioId)` - Lista mecânicas ATIVAS do cliente
- `verificarAcessoVeiculo(mechanicId, vehicleId)` - Verifica acesso a veículo
- `verificarAcessoManutencao(mechanicId, vehicleId)` - Verifica acesso a manutenção
- `obterVeiculosDoCliente(mechanicId, clientId)` - Lista veículos acessíveis de um cliente
- `obterVeiculosAcessiveisParaMecanica(mechanicId)` - Lista TODOS os veículos acessíveis
- `obterManutencoesAcessiveisParaMecanica(mechanicId)` - Lista TODAS as manutenções acessíveis
- `validarTransicaoStatus(statusAtual, novoStatus)` - Valida transições de status
- `obterStatusVinculo(usuarioId, mecanicaId)` - Obtém status do vínculo

**Tamanho:** ~350 linhas

### 3. `src/js/middleware/VINCULOS_MIDDLEWARE_GUIDE.md`

**Descrição:** Documentação completa com exemplos de uso dos middlewares.

**Conteúdo:**
- Visão geral dos middlewares
- Descrição detalhada de cada função
- Fluxo de autorização
- Exemplos de integração com rotas
- Regras de segurança
- Testes obrigatórios

**Tamanho:** ~600 linhas

### 4. `src/js/__tests__/vinculos.authorization.test.js`

**Descrição:** Suite de testes para validar a implementação de autorização.

**Testes Inclusos:**
- Acesso permitido (vínculo ATIVO)
- Acesso negado (vínculo PENDENTE)
- Acesso negado (vínculo RECUSADO)
- Acesso negado (vínculo INATIVO)
- Acesso negado (vínculo BLOQUEADO)
- Acesso negado (sem vínculo)
- Validação de transição de status

**Tamanho:** ~400 linhas

---

## Arquivos Modificados

### 1. `src/js/routes/mechanic.routes.js`

**Mudanças:**
- Importar `requireActiveVehicleAccess` do middleware de vínculo
- Importar `verificarAcessoVeiculo` das funções de autorização
- Adicionar `requireActiveVehicleAccess` na rota `GET /api/mechanic/vehicles/:id`
- Adicionar `requireActiveVehicleAccess` na rota `POST /api/mechanic/vehicles/:id/maintenance`

**Impacto:** Agora a mecânica só pode acessar veículos se tiver vínculo ATIVO com o proprietário.

### 2. `src/js/routes/maintenance.routes.js`

**Mudanças:**
- Importar `requireRole` do middleware de autorização
- Importar `requireActiveVehicleAccess` do middleware de vínculo
- Adicionar verificação de vínculo ATIVO para mecânicas na rota `POST /api/vehicles/:id/maintenance`
- Se é MECANICA: verificar vínculo ATIVO com proprietário do veículo
- Se é USER: adicionar manutenção ao seu próprio veículo

**Impacto:** Mecânicas agora precisam ter vínculo ATIVO para criar manutenções.

---

## Fluxo de Autorização Implementado

### Fluxo Geral

```
Usuário autenticado?
        ↓
É MECANICA?
        ↓
Existe vínculo com o cliente?
        ↓
O vínculo está ATIVO?
        ↓
O veículo pertence ao cliente?
        ↓
A operação solicitada é permitida?
        ↓
SIM → liberar
NÃO → bloquear (403 Forbidden)
```

### Fluxo de Acesso a Veículo

```
MECANICA
   ↓
requireAuth (autenticação)
   ↓
requireRole('MECANICA') (verificar role)
   ↓
requireActiveVehicleAccess (verificar vínculo)
   ├─ Buscar veículo
   ├─ Obter ownerId do veículo
   └─ Verificar vínculo ATIVO entre mecânica e proprietário
   ↓
SIM → continua (next())
NÃO → 403 Forbidden
```

---

## Regras de Segurança Implementadas

### 1. ✅ Nunca Confiar Apenas em Role

A simples presença de `role = MECANICA` não garante acesso. Sempre verificar vínculo ATIVO.

### 2. ✅ Sempre Verificar Vínculo ATIVO

Apenas vínculos com `status = ATIVO` concedem acesso. Estados como PENDENTE, RECUSADO, INATIVO e BLOQUEADO são bloqueados.

### 3. ✅ Nunca Confiar em IDs Enviados pelo Cliente

- `mecanicaId` sempre vem de `req.user._id` (usuário autenticado)
- `ownerId` sempre vem do banco de dados (nunca do body/URL)
- `clientId` é verificado contra o banco de dados

### 4. ✅ Usar Whitelist de Campos

Apenas campos permitidos podem ser gravados. Campos como `ownerId`, `mecanicaId`, `role` são protegidos.

### 5. ✅ Proteção Contra IDOR

Mecânica não pode acessar veículos de clientes não vinculados, mesmo conhecendo o ID.

### 6. ✅ Proteção Contra Privilege Escalation

Mecânica não pode alterar `role`, `ownerId`, `mecanicaId` ou `status` de registros.

---

## Exemplos de Uso

### Exemplo 1: Usar Middleware em Rota

```javascript
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import { requireActiveVehicleAccess } from '../middleware/vinculos.js';

router.get('/vehicles/:id', 
    requireAuth, 
    requireRole('MECANICA'), 
    requireActiveVehicleAccess, 
    async (req, res) => {
        // Aqui a mecânica tem acesso garantido ao veículo
        const veiculo = await Veiculo.buscarPorIdAdmin(req.params.id);
        res.json({ success: true, veiculo });
    }
);
```

### Exemplo 2: Usar Função de Autorização em Handler

```javascript
import { verificarAcessoVeiculo } from '../utils/authorization.js';

router.post('/veiculos/:id/manutencao', requireAuth, async (req, res) => {
    // Verificação manual se necessário
    const temAcesso = await verificarAcessoVeiculo(req.user._id, req.params.id);
    if (!temAcesso) {
        return res.status(403).json({ success: false, message: 'Acesso negado.' });
    }

    // Continuar com a operação
    // ...
});
```

### Exemplo 3: Listar Clientes Ativos

```javascript
import { obterClientesAtivos } from '../utils/authorization.js';

const clientesAtivos = await obterClientesAtivos(mecanicaId);
clientesAtivos.forEach(({ vinculo, cliente }) => {
    console.log(`Cliente: ${cliente.nome}, Status: ${vinculo.status}`);
});
```

---

## Testes Implementados

### Teste 1: Acesso Permitido (Vínculo ATIVO)

✅ Mecânica com vínculo ATIVO pode acessar veículos do cliente

### Teste 2: Acesso Negado (Vínculo PENDENTE)

✅ Mecânica com vínculo PENDENTE não pode acessar veículos

### Teste 3: Acesso Negado (Vínculo RECUSADO)

✅ Mecânica com vínculo RECUSADO não pode acessar veículos

### Teste 4: Acesso Negado (Vínculo INATIVO)

✅ Mecânica com vínculo INATIVO não pode acessar veículos

### Teste 5: Acesso Negado (Vínculo BLOQUEADO)

✅ Mecânica com vínculo BLOQUEADO não pode acessar veículos

### Teste 6: Acesso Negado (Sem Vínculo)

✅ Mecânica sem vínculo não pode acessar veículos

### Teste 7: Validação de Transição de Status

✅ Transições de status são validadas corretamente

---

## Próximas Fases

### Fase 5 - Veículos

Modificar as consultas das mecânicas para retornarem apenas veículos de clientes vinculados.

### Fase 6 - Manutenções

Garantir que uma mecânica somente possa criar, visualizar e editar manutenções de veículos pertencentes a clientes vinculados.

### Fase 7 - Frontend

Criar interface para:
- Lista de clientes
- Solicitações pendentes
- Detalhes do cliente
- Veículos
- Histórico de manutenção
- Cadastro de manutenção

### Fase 8 - Testes

Testes completos de todos os cenários positivos e negativos.

---

## Resumo de Segurança

| Aspecto | Status | Descrição |
|---------|--------|-----------|
| Autenticação | ✅ | Usuário deve estar autenticado |
| Autorização por Role | ✅ | Verificar role (USER, MECANICA, ADMIN) |
| Vínculo ATIVO | ✅ | Apenas vínculos ATIVO concedem acesso |
| Proteção IDOR | ✅ | Não confiar em IDs do cliente |
| Whitelist de Campos | ✅ | Apenas campos permitidos podem ser gravados |
| Privilege Escalation | ✅ | Não permitir alteração de role/status |
| Auditoria | ✅ | Registrar ações importantes |
| Validação de Transição | ✅ | Validar transições de status |

---

## Commit

```
Fase 4 - Segurança: Criar middlewares e funções de autorização de vínculo

- Criar arquivo src/js/middleware/vinculos.js com middlewares de autorização
- Criar arquivo src/js/utils/authorization.js com funções reutilizáveis
- Integrar middlewares nas rotas mechanic.routes.js e maintenance.routes.js
- Criar documentação com exemplos de uso
- Criar arquivo de testes para validar a implementação
```

**Hash:** `24a5e30`

---

## Conclusão

A Fase 4 foi concluída com sucesso. Os middlewares e funções de autorização de vínculo foram implementados, garantindo que apenas mecânicas com vínculo ATIVO possam acessar veículos e manutenções de clientes.

A implementação segue as melhores práticas de segurança:
- Autenticação obrigatória
- Autorização por role
- Verificação de vínculo ATIVO
- Proteção contra IDOR
- Whitelist de campos
- Proteção contra privilege escalation

Próxima fase: **Fase 5 - Veículos**
