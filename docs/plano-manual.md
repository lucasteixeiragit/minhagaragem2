# Plano Pro — gerenciamento manual para testes

Este documento explica como atribuir, retirar e inspecionar a assinatura Pro de
um usuário sem passar pelo checkout da InfinitePay.

Use apenas para teste. Em produção o plano muda pelo webhook de pagamento
(`POST /api/pagamento/webhook`), nunca por este script.

## O que o comando faz

O `npm run plano` executa uma ação sobre o documento do usuário na coleção
`usuarios`. Ele grava os mesmos campos que o webhook grava:

| Campo | Significado |
|---|---|
| `plano` | `FREE` ou `PRO` |
| `planoExpiraEm` | data em que o acesso Pro termina |
| `trialUsado` | se o teste de 7 dias já foi consumido |

O acesso é decidido por `planoAtivo()` em `src/js/middleware/plano.js`, que exige
**duas** condições: `plano === 'PRO'` **e** `planoExpiraEm` no futuro. Um usuário
com `plano: 'PRO'` e data vencida volta a ser tratado como FREE.

## Comandos

### Ver a situação atual

```bash
npm run plano status <email>
```

Saída esperada:

```
👤 Lucas <teste@teste.com>
   id:            6a85343cec97f126906485bd
   plano gravado: FREE
   vence em:      —
   trial usado:   não
   acesso Pro:    BLOQUEADO

   histórico: vazio
```

O campo `acesso Pro` é o que o sistema realmente enxerga, porque usa a mesma
função do middleware. Se ele disser `BLOQUEADO` com `plano gravado: PRO`, a data
de vencimento já passou.

### Atribuir o Pro

```bash
npm run plano pro <email>          # 30 dias
npm run plano pro <email> 15       # 15 dias
```

Saída esperada:

```
✅ teste@teste.com agora é PRO por 15 dias.
   vence em: 11/12/2026, 23:13:35
```

A contagem parte da data maior entre hoje e o vencimento atual, igual ao
`somarDias()` de `src/js/routes/pagamento.routes.js`. Quem renova antes de vencer
não perde os dias restantes.

### Retirar o Pro

```bash
npm run plano free <email>
```

Saída esperada:

```
✅ teste@teste.com voltou para FREE.
   trial usado continua: não
```

Grava `plano: 'FREE'` e `planoExpiraEm: null`. Não mexe em `trialUsado`.

### Liberar o teste de 7 dias outra vez

```bash
npm run plano reset-trial <email>
```

Saída esperada:

```
✅ trial liberado para teste@teste.com.
   o próximo POST /api/pagamento/assinar concede 7 dias de PRO.
```

Zera `trialUsado`. É o comando que você usa quando o teste já foi consumido e
quer testar o fluxo de assinatura do começo.

### Limpar cobranças pendentes

```bash
npm run plano limpar-pendentes <email>
```

Saída esperada:

```
✅ 2 assinatura(s) pendente(s) removida(s) de teste@teste.com.
```

Remove da coleção `assinaturas` apenas as linhas com `status: 'pendente'`, que
aparecem como "Pendente" no histórico do perfil. As pagas ficam.

## Como rodar no servidor

```bash
cd /home/ubuntu/minhagaragem
npm run plano status lucas.teixeiracarv@gmail.com
```

O script usa o `.env` da pasta onde é executado. No servidor, isso significa o
banco de produção. Confira o e-mail antes de rodar: o comando altera dados reais.

## Roteiro de teste do fluxo de assinatura

Para testar o checkout do começo, na ordem:

```bash
# 1. Deixe o usuário sem Pro e com o teste disponível
npm run plano free <email>
npm run plano reset-trial <email>

# 2. Confirme o estado
npm run plano status <email>
```

Agora abra `/assinatura.html` logado e clique em "Começar teste de 7 dias". O
plano vira PRO por 7 dias. Confira com `status`.

Para testar o pagamento em si, o trial precisa estar consumido, senão a rota
responde `jaAtivo: true` e não cria link de checkout:

```bash
# 3. Consuma o trial e volte para FREE, mantendo trialUsado = true
npm run plano free <email>
```

Gere o link pela tela e pague. Depois do pagamento, confira:

```bash
npm run plano status <email>
```

O esperado é `plano gravado: PRO`, `acesso Pro: LIBERADO` e uma linha no
histórico com `pago`.

## Se o pagamento não atualizar o plano

1. Veja o log do webhook no servidor:

   ```bash
   sudo journalctl -u minhagaragem --since "30 minutes ago" | grep -i webhook
   ```

2. Procure a linha `Webhook InfinitePay recebido:` e compare o `invoice_slug`
   com o `slug` gravado na assinatura (`npm run plano status`).

3. Se o webhook não chegou, o pagamento ainda pode ser confirmado pelo
   `/payment_check`. O `order_nsu` e o `slug` estão no histórico.

4. Como último recurso, ative o plano à mão com `npm run plano pro <email>` e
   registre o motivo. O acesso do usuário é o que importa; a trilha de auditoria
   fica na coleção `assinaturas`.

## Códigos de erro

| Situação | Saída | Exit |
|---|---|---|
| E-mail não informado | `❌ Informe o e-mail do usuário.` | 1 |
| Usuário não existe | `❌ Usuário não encontrado: <email>` | 1 |
| Comando inválido | `Uso: npm run plano <comando> <email> [dias]` | 1 |
| Dias inválidos | `❌ O número de dias precisa ser um inteiro positivo.` | 1 |

## Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `scripts/plano.js` | este script |
| `src/js/models/Usuario.js` | `buscarPorEmail()`, `atualizarPlano()` |
| `src/js/models/Assinatura.js` | `listarDoUsuario()`, coleção `assinaturas` |
| `src/js/middleware/plano.js` | `planoAtivo()`, `DIAS_ASSINATURA` |
| `src/js/routes/pagamento.routes.js` | quem altera o plano em produção |
