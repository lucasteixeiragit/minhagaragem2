# Guia para Próximas Fases

## Fase 4 - Segurança: Middlewares de Autorização Reutilizáveis

### Objetivo
Criar middlewares centralizados para validar acesso de mecânicas a clientes e veículos.

### Arquivos a Criar

#### 1. `/src/js/middleware/vinculoAuth.js`

```javascript
// ============================================================
// ARQUIVO: middleware/vinculoAuth.js
// DESCRIÇÃO: Middlewares de autorização para vínculos
// ============================================================

import Vinculo from '../models/Vinculo.js';
import { ObjectId } from 'mongodb';

// ============================================================
// MIDDLEWARE: requireActiveClientLink
// PROPÓSITO: Verifica se existe vínculo ATIVO entre mecânica e cliente
// USO: router.get('/:clientId/veiculos', requireAuth, requireRole('MECANICA'), requireActiveClientLink, handler)
// ============================================================
export async function requireActiveClientLink(req, res, next) {
    try {
        const mecanicaId = req.user._id;
        const clienteId = req.params.clientId || req.body.clienteId;

        if (!clienteId) {
            return res.status(400).json({
                success: false,
                message: 'ID do cliente não fornecido.'
            });
        }

        // Buscar vínculo ATIVO
        const vinculo = await Vinculo.buscarAtivoEntre(clienteId, mecanicaId);

        if (!vinculo) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Vínculo não encontrado ou inativo.'
            });
        }

        // Anexar vínculo na requisição
        req.vinculo = vinculo;
        next();
    } catch (error) {
        console.error('Erro no middleware de vínculo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao validar vínculo.'
        });
    }
}

// ============================================================
// FUNÇÃO: canMechanicAccessClient(mechanicId, clientId)
// PROPÓSITO: Verifica se mecânica pode acessar cliente
// RETORNA: { allowed: boolean, vinculo?: object }
// ============================================================
export async function canMechanicAccessClient(mechanicId, clientId) {
    try {
        const vinculo = await Vinculo.buscarAtivoEntre(clientId, mechanicId);
        return {
            allowed: !!vinculo,
            vinculo
        };
    } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        return { allowed: false };
    }
}

// ============================================================
// FUNÇÃO: canMechanicAccessVehicle(mechanicId, vehicleId)
// PROPÓSITO: Verifica se mecânica pode acessar veículo
// FLUXO:
//   1. Buscar veículo
//   2. Obter ownerId
//   3. Verificar vínculo ATIVO entre mecânica e owner
// RETORNA: { allowed: boolean, vehicle?: object, vinculo?: object }
// ============================================================
export async function canMechanicAccessVehicle(mechanicId, vehicleId) {
    try {
        // Buscar veículo (será implementado na Fase 5)
        // const vehicle = await Vehicle.buscarPorId(vehicleId);
        // if (!vehicle) return { allowed: false };

        // const vinculo = await Vinculo.buscarAtivoEntre(vehicle.ownerId, mechanicId);
        // return {
        //     allowed: !!vinculo,
        //     vehicle,
        //     vinculo
        // };

        // Por enquanto, retornar false
        return { allowed: false };
    } catch (error) {
        console.error('Erro ao verificar acesso ao veículo:', error);
        return { allowed: false };
    }
}
```

### Implementação

1. Criar arquivo `/src/js/middleware/vinculoAuth.js`
2. Implementar `requireActiveClientLink` middleware
3. Implementar `canMechanicAccessClient()` função
4. Implementar `canMechanicAccessVehicle()` função
5. Exportar no `app.js`

### Testes

- Mecânica com vínculo ATIVO acessa cliente ✅
- Mecânica sem vínculo tenta acessar cliente ❌
- Mecânica com vínculo INATIVO tenta acessar cliente ❌

---

## Fase 5 - Veículos: Integração com Vínculos

### Objetivo
Modificar rotas de veículos para respeitar vínculos entre cliente e mecânica.

### Arquivos a Modificar

#### 1. `/src/js/routes/mechanic.routes.js`

**Mudanças necessárias**:

```javascript
// Adicionar no topo
import { requireActiveClientLink, canMechanicAccessVehicle } from '../middleware/vinculoAuth.js';

// Modificar rota GET /api/mechanic/vehicles
// Antes: Retorna todos os veículos (INSEGURO)
// Depois: Retorna apenas veículos de clientes com vínculo ATIVO

router.get('/vehicles', requireAuth, requireRole('MECANICA'), async (req, res) => {
    try {
        const mecanicaId = req.user._id;

        // 1. Buscar vínculos ATIVOS da mecânica
        const vinculos = await Vinculo.listarAtivosDaMecanica(mecanicaId);

        // 2. Extrair IDs dos clientes
        const clienteIds = vinculos.map(v => v.usuarioId);

        // 3. Buscar veículos desses clientes
        const veiculos = await Vehicle.buscarPorOwners(clienteIds);

        return res.status(200).json({
            success: true,
            veiculos
        });
    } catch (error) {
        console.error('Erro ao listar veículos:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao listar veículos.'
        });
    }
});

// Modificar rota GET /api/mechanic/vehicles/:id
// Antes: Retorna qualquer veículo
// Depois: Retorna apenas se mecânica tem vínculo ATIVO com owner

router.get('/vehicles/:id', requireAuth, requireRole('MECANICA'), async (req, res) => {
    try {
        const mecanicaId = req.user._id;
        const vehicleId = req.params.id;

        // Verificar acesso
        const acesso = await canMechanicAccessVehicle(mecanicaId, vehicleId);
        if (!acesso.allowed) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado.'
            });
        }

        return res.status(200).json({
            success: true,
            veiculo: acesso.vehicle
        });
    } catch (error) {
        console.error('Erro ao buscar veículo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar veículo.'
        });
    }
});
```

### Implementação

1. Importar `Vinculo` e `canMechanicAccessVehicle`
2. Modificar `GET /api/mechanic/vehicles` para filtrar por vínculos
3. Modificar `GET /api/mechanic/vehicles/:id` para validar acesso
4. Testar com Postman

### Testes

- Mecânica lista apenas veículos de clientes vinculados ✅
- Mecânica tenta acessar veículo de cliente não vinculado ❌
- Mecânica com vínculo INATIVO não vê veículos ❌

---

## Fase 6 - Manutenções: Integração com Vínculos

### Objetivo
Garantir que mecânica só cria/edita manutenções de clientes vinculados.

### Arquivos a Modificar

#### 1. `/src/js/routes/maintenance.routes.js`

**Mudanças necessárias**:

```javascript
// Adicionar no topo
import { canMechanicAccessVehicle } from '../middleware/vinculoAuth.js';

// Modificar rota POST /api/vehicles/:id/maintenance
// Antes: Qualquer MECANICA pode criar manutenção
// Depois: Apenas se tem vínculo ATIVO com owner

router.post('/', requireAuth, requireRole('MECANICA'), async (req, res) => {
    try {
        const mecanicaId = req.user._id;
        const vehicleId = req.params.id;
        const { tipo, descricao, km, data } = req.body;

        // 1. Verificar acesso ao veículo
        const acesso = await canMechanicAccessVehicle(mecanicaId, vehicleId);
        if (!acesso.allowed) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado.'
            });
        }

        // 2. Criar manutenção com mecanicaId
        const resultado = await Maintenance.criar({
            vehicleId,
            ownerId: acesso.vehicle.ownerId,
            mecanicaId,
            tipo,
            descricao,
            km,
            data
        });

        // 3. Registrar auditoria
        await registrarAuditoria({
            userId: mecanicaId,
            action: 'CREATE_MAINTENANCE',
            resource: 'maintenance',
            resourceId: resultado.insertedId,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.status(201).json({
            success: true,
            message: 'Manutenção criada com sucesso.',
            manutencao: resultado
        });
    } catch (error) {
        console.error('Erro ao criar manutenção:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao criar manutenção.'
        });
    }
});
```

### Implementação

1. Importar `canMechanicAccessVehicle`
2. Adicionar validação de vínculo em POST (criar)
3. Adicionar validação de vínculo em PUT (editar)
4. Adicionar validação de vínculo em DELETE (excluir)
5. Adicionar `mecanicaId` em manutenções criadas por mecânica
6. Testar com Postman

### Testes

- Mecânica cria manutenção em veículo de cliente vinculado ✅
- Mecânica tenta criar manutenção em veículo de cliente não vinculado ❌
- Manutenção registra `mecanicaId` corretamente ✅

---

## Fase 7 - Frontend: Interface de Vínculos

### Objetivo
Criar interface para gerenciar vínculos (aceitar, recusar, desativar).

### Arquivos a Criar

#### 1. `/src/vinculos.html`
- Listar vínculos do usuário
- Mostrar status (PENDENTE, ATIVO, INATIVO, RECUSADO, BLOQUEADO)
- Botões: Aceitar, Recusar, Desativar

#### 2. `/src/js/vinculos.js`
- Funções para criar vínculo
- Funções para aceitar/recusar
- Funções para desativar
- Listar vínculos

#### 3. `/src/styles/vinculos.css`
- Estilos para tabela de vínculos
- Estilos para botões de ação
- Estilos para status badges

### Implementação

1. Criar HTML com formulário e tabela
2. Criar JavaScript com chamadas AJAX
3. Criar CSS com estilos
4. Integrar no menu principal
5. Testar fluxos completos

### Testes

- Usuário vê suas mecânicas ✅
- Usuário aceita convite ✅
- Usuário recusa convite ✅
- Usuário desativa vínculo ✅
- Mecânica vê seus clientes ✅

---

## Fase 8 - Testes: Validação Completa

### Objetivo
Executar todos os 50+ casos de teste documentados.

### Ferramentas Recomendadas

1. **Postman**
   - Criar coleção com todas as rotas
   - Usar variáveis de ambiente
   - Usar pré-scripts para extrair IDs
   - Usar testes para validar respostas

2. **Insomnia**
   - Alternativa a Postman
   - Suporta variáveis e scripts

3. **curl**
   - Testar via terminal
   - Útil para CI/CD

4. **Supertest** (Node.js)
   - Testes automatizados
   - Integração com Jest/Mocha

### Casos de Teste

Veja arquivo `/src/js/__tests__/vinculos.routes.test.js` para lista completa.

### Checklist de Testes

- [ ] POST /api/vinculos - 7 casos
- [ ] GET /api/vinculos - 4 casos
- [ ] GET /api/vinculos/meus-clientes - 3 casos
- [ ] GET /api/vinculos/minhas-mecanicas - 3 casos
- [ ] POST /api/vinculos/:id/aceitar - 5 casos
- [ ] POST /api/vinculos/:id/recusar - 4 casos
- [ ] PATCH /api/vinculos/:id/desativar - 5 casos
- [ ] PATCH /api/vinculos/:id/bloquear - 4 casos
- [ ] PATCH /api/vinculos/:id/desbloquear - 3 casos
- [ ] Testes de Segurança (IDOR) - 3 casos
- [ ] Testes de Auditoria - 6 casos
- [ ] Testes de Fluxo Completo - 4 casos
- [ ] Testes de Validação - 5 casos
- [ ] Testes de Whitelist - 2 casos

---

## Ordem de Implementação Recomendada

1. **Fase 4** (Segurança) - 1-2 dias
   - Criar middlewares reutilizáveis
   - Testar com Postman

2. **Fase 5** (Veículos) - 2-3 dias
   - Integrar vínculos com veículos
   - Testar acesso de mecânica

3. **Fase 6** (Manutenções) - 2-3 dias
   - Integrar vínculos com manutenções
   - Adicionar `mecanicaId`

4. **Fase 7** (Frontend) - 3-5 dias
   - Criar interface
   - Integrar com backend

5. **Fase 8** (Testes) - 2-3 dias
   - Executar todos os testes
   - Corrigir bugs

---

## Checklist de Implementação Completa

### Fase 1 - Análise
- [x] Analisar projeto existente
- [x] Identificar estrutura de usuários
- [x] Identificar estrutura de veículos
- [x] Identificar estrutura de manutenções

### Fase 2 - Modelo de Dados
- [x] Criar modelo Vinculo.js
- [x] Definir estados (PENDENTE, ATIVO, RECUSADO, INATIVO, BLOQUEADO)
- [x] Criar índices MongoDB
- [x] Implementar métodos CRUD

### Fase 3 - Backend (Rotas)
- [x] Criar vinculos.routes.js
- [x] Implementar 9 rotas
- [x] Adicionar autenticação
- [x] Adicionar autorização
- [x] Adicionar validações
- [x] Adicionar auditoria
- [x] Registrar rotas em app.js

### Fase 4 - Segurança
- [ ] Criar middleware vinculoAuth.js
- [ ] Implementar requireActiveClientLink
- [ ] Implementar canMechanicAccessClient()
- [ ] Implementar canMechanicAccessVehicle()

### Fase 5 - Veículos
- [ ] Modificar mechanic.routes.js
- [ ] Filtrar veículos por vínculos
- [ ] Validar acesso a veículos

### Fase 6 - Manutenções
- [ ] Modificar maintenance.routes.js
- [ ] Validar acesso a manutenções
- [ ] Adicionar mecanicaId

### Fase 7 - Frontend
- [ ] Criar vinculos.html
- [ ] Criar vinculos.js
- [ ] Criar vinculos.css
- [ ] Integrar no menu

### Fase 8 - Testes
- [ ] Executar 50+ casos de teste
- [ ] Testar segurança (IDOR)
- [ ] Testar fluxos completos
- [ ] Corrigir bugs

---

## Recursos Úteis

### Documentação
- [Express.js](https://expressjs.com/)
- [MongoDB](https://docs.mongodb.com/)
- [Node.js](https://nodejs.org/docs/)

### Ferramentas
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [MongoDB Compass](https://www.mongodb.com/products/compass)

### Segurança
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [IDOR Prevention](https://owasp.org/www-community/attacks/Insecure_Direct_Object_References)

---

## Contato e Suporte

Para dúvidas sobre a implementação:
1. Consultar documentação em FASE3_RESUMO.md
2. Consultar exemplos em EXEMPLOS_ROTAS_VINCULOS.md
3. Consultar testes em src/js/__tests__/vinculos.routes.test.js

---

**Próxima fase: Fase 4 - Segurança (Middlewares de autorização reutilizáveis)**
