# Exemplos de Uso - Rotas de Vínculo

## Pré-requisitos

- Servidor rodando em `http://localhost:3000`
- Usuários autenticados com sessão válida
- IDs válidos de usuários e vínculos

---

## 1. POST /api/vinculos - Criar Vínculo

### 1.1 Mecânica Convida Cliente

**Requisição**:
```bash
curl -X POST http://localhost:3000/api/vinculos \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "usuarioId": "507f1f77bcf86cd799439011",
    "tipo": "CONVITE"
  }'
```

**Resposta (201 Created)**:
```json
{
  "success": true,
  "message": "Vínculo criado com sucesso.",
  "vinculo": {
    "_id": "507f1f77bcf86cd799439012",
    "usuarioId": "507f1f77bcf86cd799439011",
    "mecanicaId": "507f1f77bcf86cd799439013",
    "status": "PENDENTE",
    "criadoEm": "2026-08-15T05:00:00.000Z",
    "atualizadoEm": "2026-08-15T05:00:00.000Z",
    "criadoPor": "507f1f77bcf86cd799439013",
    "dataAceite": null,
    "dataRecusa": null,
    "dataDesativacao": null,
    "tipo": "CONVITE"
  }
}
```

### 1.2 Cliente Solicita Mecânica

**Requisição**:
```bash
curl -X POST http://localhost:3000/api/vinculos \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "mecanicaId": "507f1f77bcf86cd799439013",
    "tipo": "SOLICITACAO"
  }'
```

**Resposta (201 Created)**:
```json
{
  "success": true,
  "message": "Vínculo criado com sucesso.",
  "vinculo": {
    "_id": "507f1f77bcf86cd799439014",
    "usuarioId": "507f1f77bcf86cd799439011",
    "mecanicaId": "507f1f77bcf86cd799439013",
    "status": "PENDENTE",
    "criadoEm": "2026-08-15T05:00:00.000Z",
    "atualizadoEm": "2026-08-15T05:00:00.000Z",
    "criadoPor": "507f1f77bcf86cd799439011",
    "dataAceite": null,
    "dataRecusa": null,
    "dataDesativacao": null,
    "tipo": "SOLICITACAO"
  }
}
```

### 1.3 Erro: Tipo Inválido

**Requisição**:
```bash
curl -X POST http://localhost:3000/api/vinculos \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "usuarioId": "507f1f77bcf86cd799439011",
    "tipo": "INVALIDO"
  }'
```

**Resposta (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Tipo de vínculo inválido. Use CONVITE ou SOLICITACAO."
}
```

### 1.4 Erro: Vínculo Duplicado

**Requisição** (segunda vez com mesmos IDs):
```bash
curl -X POST http://localhost:3000/api/vinculos \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "usuarioId": "507f1f77bcf86cd799439011",
    "tipo": "CONVITE"
  }'
```

**Resposta (409 Conflict)**:
```json
{
  "success": false,
  "message": "Já existe um vínculo entre este usuário e esta mecânica."
}
```

---

## 2. GET /api/vinculos - Listar Vínculos

### 2.1 USER Lista Suas Mecânicas

**Requisição**:
```bash
curl -X GET http://localhost:3000/api/vinculos \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "vinculos": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "usuarioId": "507f1f77bcf86cd799439011",
      "mecanicaId": "507f1f77bcf86cd799439013",
      "status": "ATIVO",
      "criadoEm": "2026-08-15T05:00:00.000Z",
      "atualizadoEm": "2026-08-15T05:00:00.000Z",
      "criadoPor": "507f1f77bcf86cd799439013",
      "dataAceite": "2026-08-15T05:05:00.000Z",
      "dataRecusa": null,
      "dataDesativacao": null,
      "tipo": "CONVITE"
    }
  ]
}
```

### 2.2 MECANICA Lista Seus Clientes

**Requisição** (autenticado como MECANICA):
```bash
curl -X GET http://localhost:3000/api/vinculos \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "vinculos": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "usuarioId": "507f1f77bcf86cd799439011",
      "mecanicaId": "507f1f77bcf86cd799439013",
      "status": "ATIVO",
      "criadoEm": "2026-08-15T05:00:00.000Z",
      "atualizadoEm": "2026-08-15T05:00:00.000Z",
      "criadoPor": "507f1f77bcf86cd799439013",
      "dataAceite": "2026-08-15T05:05:00.000Z",
      "dataRecusa": null,
      "dataDesativacao": null,
      "tipo": "CONVITE"
    }
  ]
}
```

---

## 3. GET /api/vinculos/meus-clientes - Listar Clientes da Mecânica

**Requisição** (autenticado como MECANICA):
```bash
curl -X GET http://localhost:3000/api/vinculos/meus-clientes \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "clientes": [
    {
      "vinculoId": "507f1f77bcf86cd799439012",
      "status": "ATIVO",
      "criadoEm": "2026-08-15T05:00:00.000Z",
      "atualizadoEm": "2026-08-15T05:00:00.000Z",
      "cliente": {
        "id": "507f1f77bcf86cd799439011",
        "nome": "João Silva",
        "email": "joao@example.com"
      }
    }
  ]
}
```

**Erro (403 Forbidden)** - Se autenticado como USER:
```json
{
  "success": false,
  "message": "Acesso negado."
}
```

---

## 4. GET /api/vinculos/minhas-mecanicas - Listar Mecânicas do Cliente

**Requisição** (autenticado como USER):
```bash
curl -X GET http://localhost:3000/api/vinculos/minhas-mecanicas \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "mecanicas": [
    {
      "vinculoId": "507f1f77bcf86cd799439012",
      "status": "ATIVO",
      "criadoEm": "2026-08-15T05:00:00.000Z",
      "atualizadoEm": "2026-08-15T05:00:00.000Z",
      "mecanica": {
        "id": "507f1f77bcf86cd799439013",
        "nome": "Oficina XYZ",
        "email": "oficina@example.com"
      }
    }
  ]
}
```

---

## 5. POST /api/vinculos/:id/aceitar - Aceitar Vínculo

**Requisição** (autenticado como USER):
```bash
curl -X POST http://localhost:3000/api/vinculos/507f1f77bcf86cd799439012/aceitar \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "message": "Vínculo aceito com sucesso.",
  "vinculo": {
    "_id": "507f1f77bcf86cd799439012",
    "usuarioId": "507f1f77bcf86cd799439011",
    "mecanicaId": "507f1f77bcf86cd799439013",
    "status": "ATIVO",
    "criadoEm": "2026-08-15T05:00:00.000Z",
    "atualizadoEm": "2026-08-15T05:05:00.000Z",
    "criadoPor": "507f1f77bcf86cd799439013",
    "dataAceite": "2026-08-15T05:05:00.000Z",
    "dataRecusa": null,
    "dataDesativacao": null,
    "tipo": "CONVITE"
  }
}
```

**Erro (400 Bad Request)** - Se vínculo não está PENDENTE:
```json
{
  "success": false,
  "message": "Vínculo não está em status PENDENTE. Status atual: ATIVO"
}
```

**Erro (403 Forbidden)** - Se vínculo pertence a outro usuário:
```json
{
  "success": false,
  "message": "Acesso negado."
}
```

---

## 6. POST /api/vinculos/:id/recusar - Recusar Vínculo

**Requisição** (autenticado como USER):
```bash
curl -X POST http://localhost:3000/api/vinculos/507f1f77bcf86cd799439012/recusar \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "message": "Vínculo recusado com sucesso.",
  "vinculo": {
    "_id": "507f1f77bcf86cd799439012",
    "usuarioId": "507f1f77bcf86cd799439011",
    "mecanicaId": "507f1f77bcf86cd799439013",
    "status": "RECUSADO",
    "criadoEm": "2026-08-15T05:00:00.000Z",
    "atualizadoEm": "2026-08-15T05:05:00.000Z",
    "criadoPor": "507f1f77bcf86cd799439013",
    "dataAceite": null,
    "dataRecusa": "2026-08-15T05:05:00.000Z",
    "dataDesativacao": null,
    "tipo": "CONVITE"
  }
}
```

---

## 7. PATCH /api/vinculos/:id/desativar - Desativar Vínculo

### 7.1 USER Desativa

**Requisição** (autenticado como USER):
```bash
curl -X PATCH http://localhost:3000/api/vinculos/507f1f77bcf86cd799439012/desativar \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "message": "Vínculo desativado com sucesso.",
  "vinculo": {
    "_id": "507f1f77bcf86cd799439012",
    "usuarioId": "507f1f77bcf86cd799439011",
    "mecanicaId": "507f1f77bcf86cd799439013",
    "status": "INATIVO",
    "criadoEm": "2026-08-15T05:00:00.000Z",
    "atualizadoEm": "2026-08-15T05:10:00.000Z",
    "criadoPor": "507f1f77bcf86cd799439013",
    "dataAceite": "2026-08-15T05:05:00.000Z",
    "dataRecusa": null,
    "dataDesativacao": "2026-08-15T05:10:00.000Z",
    "tipo": "CONVITE"
  }
}
```

### 7.2 MECANICA Desativa

**Requisição** (autenticado como MECANICA):
```bash
curl -X PATCH http://localhost:3000/api/vinculos/507f1f77bcf86cd799439012/desativar \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**: Mesmo formato acima

---

## 8. PATCH /api/vinculos/:id/bloquear - Bloquear Vínculo

**Requisição** (autenticado como ADMIN):
```bash
curl -X PATCH http://localhost:3000/api/vinculos/507f1f77bcf86cd799439012/bloquear \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "message": "Vínculo bloqueado com sucesso.",
  "vinculo": {
    "_id": "507f1f77bcf86cd799439012",
    "usuarioId": "507f1f77bcf86cd799439011",
    "mecanicaId": "507f1f77bcf86cd799439013",
    "status": "BLOQUEADO",
    "criadoEm": "2026-08-15T05:00:00.000Z",
    "atualizadoEm": "2026-08-15T05:15:00.000Z",
    "criadoPor": "507f1f77bcf86cd799439013",
    "dataAceite": "2026-08-15T05:05:00.000Z",
    "dataRecusa": null,
    "dataDesativacao": null,
    "tipo": "CONVITE"
  }
}
```

**Erro (403 Forbidden)** - Se não é ADMIN:
```json
{
  "success": false,
  "message": "Acesso negado."
}
```

---

## 9. PATCH /api/vinculos/:id/desbloquear - Desbloquear Vínculo

**Requisição** (autenticado como ADMIN):
```bash
curl -X PATCH http://localhost:3000/api/vinculos/507f1f77bcf86cd799439012/desbloquear \
  -H "Cookie: connect.sid=..."
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "message": "Vínculo desbloqueado com sucesso.",
  "vinculo": {
    "_id": "507f1f77bcf86cd799439012",
    "usuarioId": "507f1f77bcf86cd799439011",
    "mecanicaId": "507f1f77bcf86cd799439013",
    "status": "ATIVO",
    "criadoEm": "2026-08-15T05:00:00.000Z",
    "atualizadoEm": "2026-08-15T05:20:00.000Z",
    "criadoPor": "507f1f77bcf86cd799439013",
    "dataAceite": "2026-08-15T05:05:00.000Z",
    "dataRecusa": null,
    "dataDesativacao": null,
    "tipo": "CONVITE"
  }
}
```

---

## 10. Erros Comuns

### 10.1 Não Autenticado

**Resposta (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Não autenticado."
}
```

### 10.2 Vínculo Não Encontrado

**Resposta (404 Not Found)**:
```json
{
  "success": false,
  "message": "Vínculo não encontrado."
}
```

### 10.3 Acesso Negado (IDOR)

**Resposta (403 Forbidden)**:
```json
{
  "success": false,
  "message": "Acesso negado."
}
```

### 10.4 Erro Interno

**Resposta (500 Internal Server Error)**:
```json
{
  "success": false,
  "message": "Erro ao criar vínculo."
}
```

---

## 11. Fluxo Completo: Mecânica Convida → Cliente Aceita

### Passo 1: Mecânica Cria Convite
```bash
# Autenticado como MECANICA (ID: 507f1f77bcf86cd799439013)
curl -X POST http://localhost:3000/api/vinculos \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "usuarioId": "507f1f77bcf86cd799439011",
    "tipo": "CONVITE"
  }'
```

Resposta: Vínculo criado com status PENDENTE (ID: 507f1f77bcf86cd799439012)

### Passo 2: Cliente Aceita Convite
```bash
# Autenticado como USER (ID: 507f1f77bcf86cd799439011)
curl -X POST http://localhost:3000/api/vinculos/507f1f77bcf86cd799439012/aceitar \
  -H "Cookie: connect.sid=..."
```

Resposta: Vínculo atualizado com status ATIVO

### Passo 3: Mecânica Lista Clientes
```bash
# Autenticado como MECANICA
curl -X GET http://localhost:3000/api/vinculos/meus-clientes \
  -H "Cookie: connect.sid=..."
```

Resposta: Array com cliente João Silva

### Passo 4: Cliente Lista Mecânicas
```bash
# Autenticado como USER
curl -X GET http://localhost:3000/api/vinculos/minhas-mecanicas \
  -H "Cookie: connect.sid=..."
```

Resposta: Array com mecânica Oficina XYZ

### Passo 5: Cliente Desativa Vínculo
```bash
# Autenticado como USER
curl -X PATCH http://localhost:3000/api/vinculos/507f1f77bcf86cd799439012/desativar \
  -H "Cookie: connect.sid=..."
```

Resposta: Vínculo atualizado com status INATIVO

---

## 12. Usando com Postman

1. **Criar ambiente** com variáveis:
   - `base_url`: http://localhost:3000
   - `user_id`: 507f1f77bcf86cd799439011
   - `mecanica_id`: 507f1f77bcf86cd799439013
   - `vinculo_id`: 507f1f77bcf86cd799439012

2. **Criar requisições** para cada endpoint

3. **Usar pré-scripts** para extrair IDs das respostas

4. **Testar fluxos completos** em sequência

---

## 13. Usando com JavaScript/Fetch

```javascript
// Criar vínculo
async function criarVinculo(usuarioId, tipo) {
  const response = await fetch('http://localhost:3000/api/vinculos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // Incluir cookies
    body: JSON.stringify({
      usuarioId,
      tipo
    })
  });
  
  return response.json();
}

// Aceitar vínculo
async function aceitarVinculo(vinculoId) {
  const response = await fetch(
    `http://localhost:3000/api/vinculos/${vinculoId}/aceitar`,
    {
      method: 'POST',
      credentials: 'include'
    }
  );
  
  return response.json();
}

// Listar mecânicas
async function listarMinhasMecanicas() {
  const response = await fetch(
    'http://localhost:3000/api/vinculos/minhas-mecanicas',
    {
      credentials: 'include'
    }
  );
  
  return response.json();
}
```

---

**Fim dos exemplos**
