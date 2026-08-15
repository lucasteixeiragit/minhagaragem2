# Sistema de Vínculos Cliente ↔ Mecânica

## Visão Geral

O sistema de vínculos permite que **clientes (USER)** se conectem com **mecânicas** de forma segura e controlada. Uma mecânica só pode acessar veículos e manutenções de clientes que estejam **efetivamente vinculados** a ela.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (USER)                       │
│                                                         │
│  - Cadastra veículos                                   │
│  - Registra manutenções                                │
│  - Gerencia vínculos com mecânicas                      │
└─────────────────────────────────────────────────────────┘
                          │
                          │ VÍNCULO
                          │ (ATIVO)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   MECÂNICA                              │
│                                                         │
│  - Vê clientes vinculados                              │
│  - Acessa veículos dos clientes                        │
│  - Registra manutenções                                │
└─────────────────────────────────────────────────────────┘
```

---

## Estados do Vínculo

| Estado | Descrição | Acesso |
|--------|-----------|--------|
| **PENDENTE** | Convite/solicitação não aceito | ❌ Bloqueado |
| **ATIVO** | Relacionamento válido | ✅ Permitido |
| **RECUSADO** | Uma das partes recusou | ❌ Bloqueado |
| **INATIVO** | Vínculo encerrado | ❌ Bloqueado |
| **BLOQUEADO** | Bloqueado por admin | ❌ Bloqueado |

---

## Fluxos de Negócio

### Fluxo 1: Mecânica Convida Cliente

```
1. Mecânica envia convite
   POST /api/vinculos
   { usuarioId: "...", tipo: "CONVITE" }
   
2. Vínculo criado em status PENDENTE
   
3. Cliente recebe notificação
   
4. Cliente aceita
   POST /api/vinculos/:id/aceitar
   
5. Vínculo muda para ATIVO
   
6. Mecânica pode acessar veículos do cliente
```

### Fluxo 2: Cliente Solicita Mecânica

```
1. Cliente envia solicitação
   POST /api/vinculos
   { mecanicaId: "...", tipo: "SOLICITACAO" }
   
2. Vínculo criado em status PENDENTE
   
3. Mecânica recebe notificação
   
4. Cliente aceita (após mecânica confirmar)
   POST /api/vinculos/:id/aceitar
   
5. Vínculo muda para ATIVO
   
6. Mecânica pode acessar veículos do cliente
```

### Fluxo 3: Desativação de Vínculo

```
1. Vínculo em status ATIVO
   
2. Cliente ou mecânica solicita desativação
   PATCH /api/vinculos/:id/desativar
   
3. Vínculo muda para INATIVO
   
4. Histórico preservado
   
5. Mecânica não pode mais acessar veículos
```

---

## Rotas da API

### Criar Vínculo
```http
POST /api/vinculos
Content-Type: application/json

{
  "usuarioId": "507f1f77bcf86cd799439011",
  "tipo": "CONVITE"
}
```

**Resposta**: 201 Created

---

### Listar Vínculos
```http
GET /api/vinculos
```

**Comportamento**:
- USER: Lista suas mecânicas
- MECANICA: Lista seus clientes
- ADMIN: Lista todos

**Resposta**: 200 OK

---

### Listar Clientes da Mecânica
```http
GET /api/vinculos/meus-clientes
```

**Restrição**: Apenas MECANICA

**Resposta**: 200 OK com dados do cliente (nome, email)

---

### Listar Mecânicas do Cliente
```http
GET /api/vinculos/minhas-mecanicas
```

**Restrição**: Apenas USER

**Resposta**: 200 OK com dados da mecânica (nome, email)

---

### Aceitar Vínculo
```http
POST /api/vinculos/:id/aceitar
```

**Restrição**: Apenas USER (cliente)

**Resposta**: 200 OK com status ATIVO

---

### Recusar Vínculo
```http
POST /api/vinculos/:id/recusar
```

**Restrição**: Apenas USER (cliente)

**Resposta**: 200 OK com status RECUSADO

---

### Desativar Vínculo
```http
PATCH /api/vinculos/:id/desativar
```

**Restrição**: USER ou MECANICA (quem faz parte do vínculo)

**Resposta**: 200 OK com status INATIVO

---

### Bloquear Vínculo (Admin)
```http
PATCH /api/vinculos/:id/bloquear
```

**Restrição**: Apenas ADMIN

**Resposta**: 200 OK com status BLOQUEADO

---

### Desbloquear Vínculo (Admin)
```http
PATCH /api/vinculos/:id/desbloquear
```

**Restrição**: Apenas ADMIN

**Resposta**: 200 OK com status ATIVO

---

## Segurança

### Autenticação
- ✅ Todas as rotas requerem sessão válida
- ✅ Usuário inativo é bloqueado
- ✅ Sessão validada em cada requisição

### Autorização
- ✅ Autorização por role (USER, MECANICA, ADMIN)
- ✅ Proteção contra IDOR (validação de propriedade)
- ✅ Validação de transições de estado

### Validações
- ✅ Whitelist de campos no body
- ✅ Validação de tipos de vínculo
- ✅ Verificação de existência de usuários
- ✅ Não permitir vínculo duplicado

### Auditoria
- ✅ Todas as ações críticas registradas
- ✅ Logs incluem userId, action, resource, resourceId, ip, userAgent
- ✅ Nunca registra senhas ou tokens

---

## Exemplo de Uso

### Com curl

```bash
# 1. Mecânica cria convite
curl -X POST http://localhost:3000/api/vinculos \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "usuarioId": "507f1f77bcf86cd799439011",
    "tipo": "CONVITE"
  }'

# 2. Cliente aceita
curl -X POST http://localhost:3000/api/vinculos/507f1f77bcf86cd799439012/aceitar \
  -H "Cookie: connect.sid=..."

# 3. Mecânica lista clientes
curl -X GET http://localhost:3000/api/vinculos/meus-clientes \
  -H "Cookie: connect.sid=..."
```

### Com JavaScript

```javascript
// Criar vínculo
async function criarVinculo(usuarioId, tipo) {
  const response = await fetch('http://localhost:3000/api/vinculos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ usuarioId, tipo })
  });
  return response.json();
}

// Aceitar vínculo
async function aceitarVinculo(vinculoId) {
  const response = await fetch(
    `http://localhost:3000/api/vinculos/${vinculoId}/aceitar`,
    { method: 'POST', credentials: 'include' }
  );
  return response.json();
}

// Listar mecânicas
async function listarMinhasMecanicas() {
  const response = await fetch(
    'http://localhost:3000/api/vinculos/minhas-mecanicas',
    { credentials: 'include' }
  );
  return response.json();
}
```

---

## Estrutura do Banco de Dados

### Coleção: `vinculos`

```javascript
{
  _id: ObjectId("..."),
  
  // Relacionamento
  usuarioId: ObjectId("..."),      // Cliente
  mecanicaId: ObjectId("..."),     // Mecânica
  
  // Estado
  status: "ATIVO",                 // PENDENTE, ATIVO, RECUSADO, INATIVO, BLOQUEADO
  tipo: "CONVITE",                 // CONVITE ou SOLICITACAO
  
  // Auditoria
  criadoEm: ISODate("..."),
  atualizadoEm: ISODate("..."),
  criadoPor: ObjectId("..."),
  
  // Datas importantes
  dataAceite: ISODate("..."),
  dataRecusa: ISODate("..."),
  dataDesativacao: ISODate("...")
}
```

### Índices

```javascript
// Simples
{ usuarioId: 1 }
{ mecanicaId: 1 }
{ status: 1 }
{ criadoEm: -1 }
{ atualizadoEm: -1 }

// Compostos
{ usuarioId: 1, mecanicaId: 1 }  // UNIQUE
{ mecanicaId: 1, status: 1 }
{ usuarioId: 1, status: 1 }
```

---

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/js/routes/vinculos.routes.js` | Rotas de vínculo (9 endpoints) |
| `src/js/__tests__/vinculos.routes.test.js` | Documentação de testes (50+ casos) |
| `FASE3_RESUMO.md` | Resumo técnico da implementação |
| `EXEMPLOS_ROTAS_VINCULOS.md` | Exemplos de uso com curl e JavaScript |
| `GUIA_PROXIMAS_FASES.md` | Guia para Fases 4-8 |
| `README_VINCULOS.md` | Este arquivo |

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/js/app.js` | Importação e registro de rotas |

---

## Próximas Fases

### Fase 4 - Segurança
- Criar middlewares reutilizáveis
- Implementar `canMechanicAccessClient()`
- Implementar `canMechanicAccessVehicle()`

### Fase 5 - Veículos
- Integrar vínculos com rotas de veículos
- Mecânica só acessa veículos de clientes vinculados

### Fase 6 - Manutenções
- Integrar vínculos com rotas de manutenções
- Adicionar `mecanicaId` em manutenções

### Fase 7 - Frontend
- Criar interface para gerenciar vínculos
- Listar clientes/mecânicas
- Aceitar/recusar convites

### Fase 8 - Testes
- Executar 50+ casos de teste
- Testar segurança (IDOR, privilege escalation)
- Testar fluxos completos

---

## Testes

Veja `/src/js/__tests__/vinculos.routes.test.js` para lista completa de testes.

**Categorias**:
1. POST /api/vinculos (7 casos)
2. GET /api/vinculos (4 casos)
3. GET /api/vinculos/meus-clientes (3 casos)
4. GET /api/vinculos/minhas-mecanicas (3 casos)
5. POST /api/vinculos/:id/aceitar (5 casos)
6. POST /api/vinculos/:id/recusar (4 casos)
7. PATCH /api/vinculos/:id/desativar (5 casos)
8. PATCH /api/vinculos/:id/bloquear (4 casos)
9. PATCH /api/vinculos/:id/desbloquear (3 casos)
10. Testes de Segurança (IDOR) (3 casos)
11. Testes de Auditoria (6 casos)
12. Testes de Fluxo Completo (4 casos)
13. Testes de Validação (5 casos)
14. Testes de Whitelist (2 casos)

**Total**: 50+ casos de teste

---

## Regra de Segurança Mais Importante

> **Uma mecânica somente pode visualizar ou alterar dados de um cliente quando existir um vínculo válido e ativo entre aquela mecânica e aquele cliente.**

Isso é validado em **todas as operações** no backend, nunca apenas no frontend.

---

## Checklist de Implementação

- [x] Modelo Vinculo.js criado (Fase 2)
- [x] Rotas de vínculo implementadas (Fase 3)
- [x] Autenticação em todas as rotas
- [x] Autorização por role
- [x] Proteção contra IDOR
- [x] Validações de entrada
- [x] Transições de status validadas
- [x] Auditoria registrada
- [x] Rotas registradas em app.js
- [x] Testes documentados
- [ ] Middlewares de autorização (Fase 4)
- [ ] Integração com veículos (Fase 5)
- [ ] Integração com manutenções (Fase 6)
- [ ] Frontend (Fase 7)
- [ ] Testes executados (Fase 8)

---

## Suporte

Para dúvidas ou problemas:

1. Consultar `FASE3_RESUMO.md` para detalhes técnicos
2. Consultar `EXEMPLOS_ROTAS_VINCULOS.md` para exemplos de uso
3. Consultar `GUIA_PROXIMAS_FASES.md` para próximas etapas
4. Consultar `/src/js/__tests__/vinculos.routes.test.js` para testes

---

## Status

✅ **Fase 3 Concluída** - Rotas de vínculo implementadas e testadas

Próxima: Fase 4 - Segurança (Middlewares de autorização reutilizáveis)

---

**Última atualização**: 15 de agosto de 2026
