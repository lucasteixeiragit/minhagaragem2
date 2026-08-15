# Guia de Middlewares de Vínculo

## Visão Geral

Este documento descreve os middlewares e funções de autorização de vínculo entre cliente (USER) e mecânica.

## Arquivos Criados

### 1. `src/js/middleware/vinculos.js`

Contém middlewares e funções de autorização de vínculo.

#### Funções Exportadas

##### `canMechanicAccessClient(mechanicId, clientId)`

Verifica se uma mecânica tem vínculo ATIVO com um cliente.

**Parâmetros:**
- `mechanicId`: ObjectId ou string da mecânica
- `clientId`: ObjectId ou string do cliente

**Retorna:** `true` se vínculo ATIVO existe, `false` caso contrário

**Exemplo:**
```javascript
import { canMechanicAccessClient } from '../middleware/vinculos.js';

const temAcesso = await canMechanicAccessClient(mecanicaId, clienteId);
if (temAcesso) {
    // Mecânica pode acessar cliente
}
```

##### `canMechanicAccessVehicle(mechanicId, vehicleId)`

Verifica se uma mecânica pode acessar um veículo (via vínculo ATIVO com proprietário).

**Parâmetros:**
- `mechanicId`: ObjectId ou string da mecânica
- `vehicleId`: ObjectId ou string do veículo

**Retorna:** `true` se acesso permitido, `false` caso contrário

**Fluxo:**
1. Busca o veículo
2. Obtém o `ownerId` do veículo
3. Verifica se existe vínculo ATIVO entre mecânica e proprietário

**Exemplo:**
```javascript
import { canMechanicAccessVehicle } from '../middleware/vinculos.js';

const temAcesso = await canMechanicAccessVehicle(mecanicaId, veiculoId);
if (temAcesso) {
    // Mecânica pode acessar veículo
}
```

##### `verificarVinculoAtivo(usuarioId, mecanicaId)`

Verifica se existe vínculo ATIVO entre usuário e mecânica.

**Parâmetros:**
- `usuarioId`: ObjectId ou string do usuário (cliente)
- `mecanicaId`: ObjectId ou string da mecânica

**Retorna:** Documento do vínculo se ATIVO, `null` caso contrário

**Exemplo:**
```javascript
import { verificarVinculoAtivo } from '../middleware/vinculos.js';

const vinculo = await verificarVinculoAtivo(usuarioId, mecanicaId);
if (vinculo) {
    console.log('Vínculo ATIVO:', vinculo);
}
```

#### Middlewares

##### `requireActiveClientLink`

Middleware que verifica vínculo ATIVO entre cliente e mecânica.

**Uso:**
```javascript
router.get('/:clientId/veiculos', 
    requireAuth, 
    requireRole('MECANICA'), 
    requireActiveClientLink, 
    handler
);
```

**Parâmetros na Rota:**
- `req.params.clientId`: ID do cliente a ser acessado
- `req.user._id`: ID da mecânica autenticada (vem de `requireAuth`)

**Comportamento:**
- Se vínculo ATIVO existe: continua (chama `next()`)
- Se vínculo não existe ou não está ATIVO: retorna `403 Forbidden`

**Resposta de Erro:**
```json
{
    "success": false,
    "message": "Você não tem acesso a este cliente. Vínculo não ativo."
}
```

##### `requireActiveVehicleAccess`

Middleware que verifica se mecânica pode acessar veículo.

**Uso:**
```javascript
router.get('/vehicles/:vehicleId', 
    requireAuth, 
    requireRole('MECANICA'), 
    requireActiveVehicleAccess, 
    handler
);
```

**Parâmetros na Rota:**
- `req.params.vehicleId` ou `req.params.id`: ID do veículo a ser acessado
- `req.user._id`: ID da mecânica autenticada (vem de `requireAuth`)

**Comportamento:**
- Se mecânica tem vínculo ATIVO com proprietário: continua (chama `next()`)
- Caso contrário: retorna `403 Forbidden`

**Resposta de Erro:**
```json
{
    "success": false,
    "message": "Você não tem acesso a este veículo."
}
```

### 2. `src/js/utils/authorization.js`

Contém funções reutilizáveis de autorização de vínculo.

#### Funções Exportadas

##### `verificarVinculoAtivo(usuarioId, mecanicaId)`

Verifica se existe vínculo ATIVO entre usuário e mecânica.

**Retorna:** Documento do vínculo se ATIVO, `null` caso contrário

##### `obterClientesAtivos(mecanicaId)`

Lista clientes ATIVOS da mecânica com seus dados.

**Retorna:** Array de objetos `{ vinculo, cliente }`

**Exemplo:**
```javascript
import { obterClientesAtivos } from '../utils/authorization.js';

const clientesAtivos = await obterClientesAtivos(mecanicaId);
clientesAtivos.forEach(({ vinculo, cliente }) => {
    console.log(`Cliente: ${cliente.nome}, Status: ${vinculo.status}`);
});
```

##### `obterMecanicasAtivas(usuarioId)`

Lista mecânicas ATIVAS do cliente com seus dados.

**Retorna:** Array de objetos `{ vinculo, mecanica }`

##### `verificarAcessoVeiculo(mechanicId, vehicleId)`

Verifica se mecânica pode acessar veículo.

**Retorna:** `true` se acesso permitido, `false` caso contrário

##### `verificarAcessoManutencao(mechanicId, vehicleId)`

Verifica se mecânica pode acessar manutenção de um veículo.

**Retorna:** `true` se acesso permitido, `false` caso contrário

##### `obterVeiculosDoCliente(mechanicId, clientId)`

Lista veículos de um cliente que a mecânica pode acessar.

**Retorna:** Array de veículos do cliente, ou `[]` se sem acesso

##### `obterVeiculosAcessiveisParaMecanica(mechanicId)`

Lista TODOS os veículos que a mecânica pode acessar.

**Retorna:** Array de veículos acessíveis

**Exemplo:**
```javascript
import { obterVeiculosAcessiveisParaMecanica } from '../utils/authorization.js';

const veiculos = await obterVeiculosAcessiveisParaMecanica(mecanicaId);
console.log(`Mecânica pode acessar ${veiculos.length} veículos`);
```

##### `obterManutencoesAcessiveisParaMecanica(mechanicId)`

Lista TODAS as manutenções que a mecânica pode acessar.

**Retorna:** Array de manutenções acessíveis

##### `validarTransicaoStatus(statusAtual, novoStatus)`

Valida se a transição de status é permitida.

**Transições Permitidas:**
- `PENDENTE` → `ATIVO` (aceitar)
- `PENDENTE` → `RECUSADO` (recusar)
- `ATIVO` → `INATIVO` (desativar)
- `ATIVO` → `BLOQUEADO` (bloquear - admin)
- `BLOQUEADO` → `ATIVO` (desbloquear - admin)
- `RECUSADO` → `PENDENTE` (reabrir - admin)

**Retorna:** `{ valido: boolean, erro?: string }`

**Exemplo:**
```javascript
import { validarTransicaoStatus } from '../utils/authorization.js';

const resultado = validarTransicaoStatus('PENDENTE', 'ATIVO');
if (resultado.valido) {
    // Transição permitida
} else {
    console.error(resultado.erro);
}
```

##### `obterStatusVinculo(usuarioId, mecanicaId)`

Obtém o status do vínculo entre usuário e mecânica.

**Retorna:** Status do vínculo ou `null` se não existe

## Fluxo de Autorização

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

### Fluxo de Acesso a Cliente

```
MECANICA
   ↓
requireAuth (autenticação)
   ↓
requireRole('MECANICA') (verificar role)
   ↓
requireActiveClientLink (verificar vínculo)
   ├─ Obter clientId dos parâmetros
   └─ Verificar vínculo ATIVO entre mecânica e cliente
   ↓
SIM → continua (next())
NÃO → 403 Forbidden
```

## Integração com Rotas

### Exemplo 1: Rota de Acesso a Veículo

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

### Exemplo 2: Rota de Acesso a Cliente

```javascript
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import { requireActiveClientLink } from '../middleware/vinculos.js';

router.get('/clientes/:clientId/veiculos', 
    requireAuth, 
    requireRole('MECANICA'), 
    requireActiveClientLink, 
    async (req, res) => {
        // Aqui a mecânica tem acesso garantido ao cliente
        const veiculos = await Veiculo.buscarTodosDoProprietario(req.params.clientId);
        res.json({ success: true, veiculos });
    }
);
```

### Exemplo 3: Verificação Manual em Handler

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

## Regras de Segurança

### 1. Nunca Confiar Apenas em Role

❌ **ERRADO:**
```javascript
if (req.user.role === 'MECANICA') {
    // Liberar acesso a todos os veículos
}
```

✅ **CORRETO:**
```javascript
const temAcesso = await canMechanicAccessVehicle(req.user._id, vehicleId);
if (temAcesso) {
    // Liberar acesso apenas a este veículo
}
```

### 2. Sempre Verificar Vínculo ATIVO

❌ **ERRADO:**
```javascript
const vinculo = await Vinculo.buscarPorUsuarioEMecanica(usuarioId, mecanicaId);
if (vinculo) {
    // Liberar acesso
}
```

✅ **CORRETO:**
```javascript
const vinculo = await Vinculo.buscarAtivoEntre(usuarioId, mecanicaId);
if (vinculo) {
    // Liberar acesso
}
```

### 3. Nunca Confiar em IDs Enviados pelo Cliente

❌ **ERRADO:**
```javascript
const { ownerId, mecanicaId } = req.body;
// Usar ownerId e mecanicaId diretamente
```

✅ **CORRETO:**
```javascript
const mecanicaId = req.user._id; // Sempre do usuário autenticado
const veiculo = await Veiculo.buscarPorIdAdmin(vehicleId);
const ownerId = veiculo.ownerId; // Sempre do banco de dados
```

### 4. Usar Whitelist de Campos

❌ **ERRADO:**
```javascript
const dados = req.body;
await Veiculo.atualizar(id, dados);
```

✅ **CORRETO:**
```javascript
const CAMPOS_PERMITIDOS = ['apelido', 'marca', 'modelo'];
const dados = {};
CAMPOS_PERMITIDOS.forEach(campo => {
    if (req.body[campo] !== undefined) {
        dados[campo] = req.body[campo];
    }
});
await Veiculo.atualizar(id, dados);
```

## Testes

### Teste 1: Acesso Permitido (Vínculo ATIVO)

```javascript
// 1. Criar cliente
const cliente = await Usuario.criar({ nome: 'João', email: 'joao@test.com', role: 'USER' });

// 2. Criar mecânica
const mecanica = await Usuario.criar({ nome: 'Oficina XYZ', email: 'oficina@test.com', role: 'MECANICA' });

// 3. Criar vínculo ATIVO
const vinculo = await Vinculo.criar({
    usuarioId: cliente._id,
    mecanicaId: mecanica._id,
    criadoPor: mecanica._id,
    tipo: 'CONVITE'
});
await Vinculo.aceitar(vinculo._id);

// 4. Criar veículo do cliente
const veiculo = await Veiculo.criarDoProprietario({ apelido: 'Carro' }, cliente._id);

// 5. Testar acesso
const temAcesso = await canMechanicAccessVehicle(mecanica._id, veiculo._id);
console.assert(temAcesso === true, 'Mecânica deve ter acesso ao veículo');
```

### Teste 2: Acesso Negado (Vínculo PENDENTE)

```javascript
// 1. Criar cliente
const cliente = await Usuario.criar({ nome: 'Maria', email: 'maria@test.com', role: 'USER' });

// 2. Criar mecânica
const mecanica = await Usuario.criar({ nome: 'Oficina ABC', email: 'abc@test.com', role: 'MECANICA' });

// 3. Criar vínculo PENDENTE (não aceitar)
const vinculo = await Vinculo.criar({
    usuarioId: cliente._id,
    mecanicaId: mecanica._id,
    criadoPor: mecanica._id,
    tipo: 'CONVITE'
});

// 4. Criar veículo do cliente
const veiculo = await Veiculo.criarDoProprietario({ apelido: 'Carro' }, cliente._id);

// 5. Testar acesso
const temAcesso = await canMechanicAccessVehicle(mecanica._id, veiculo._id);
console.assert(temAcesso === false, 'Mecânica NÃO deve ter acesso ao veículo');
```

### Teste 3: Acesso Negado (Vínculo RECUSADO)

```javascript
// 1. Criar cliente
const cliente = await Usuario.criar({ nome: 'Pedro', email: 'pedro@test.com', role: 'USER' });

// 2. Criar mecânica
const mecanica = await Usuario.criar({ nome: 'Oficina DEF', email: 'def@test.com', role: 'MECANICA' });

// 3. Criar vínculo e recusar
const vinculo = await Vinculo.criar({
    usuarioId: cliente._id,
    mecanicaId: mecanica._id,
    criadoPor: mecanica._id,
    tipo: 'CONVITE'
});
await Vinculo.recusar(vinculo._id);

// 4. Criar veículo do cliente
const veiculo = await Veiculo.criarDoProprietario({ apelido: 'Carro' }, cliente._id);

// 5. Testar acesso
const temAcesso = await canMechanicAccessVehicle(mecanica._id, veiculo._id);
console.assert(temAcesso === false, 'Mecânica NÃO deve ter acesso ao veículo');
```

### Teste 4: Acesso Negado (Vínculo INATIVO)

```javascript
// 1. Criar cliente
const cliente = await Usuario.criar({ nome: 'Ana', email: 'ana@test.com', role: 'USER' });

// 2. Criar mecânica
const mecanica = await Usuario.criar({ nome: 'Oficina GHI', email: 'ghi@test.com', role: 'MECANICA' });

// 3. Criar vínculo ATIVO e depois desativar
const vinculo = await Vinculo.criar({
    usuarioId: cliente._id,
    mecanicaId: mecanica._id,
    criadoPor: mecanica._id,
    tipo: 'CONVITE'
});
await Vinculo.aceitar(vinculo._id);
await Vinculo.desativar(vinculo._id);

// 4. Criar veículo do cliente
const veiculo = await Veiculo.criarDoProprietario({ apelido: 'Carro' }, cliente._id);

// 5. Testar acesso
const temAcesso = await canMechanicAccessVehicle(mecanica._id, veiculo._id);
console.assert(temAcesso === false, 'Mecânica NÃO deve ter acesso ao veículo');
```

## Resumo

- **Middlewares** (`vinculos.js`): Usados em rotas para verificar autorização
- **Funções Utilitárias** (`authorization.js`): Usadas em handlers para lógica de negócio
- **Regra Crítica**: Somente vínculos com status `ATIVO` concedem acesso
- **Segurança**: Sempre verificar vínculo no backend, nunca confiar apenas em role
