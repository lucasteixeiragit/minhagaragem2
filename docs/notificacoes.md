# Notificações de manutenção — uso manual

Este documento explica como rodar a verificação de manutenções próximas fora do
horário agendado, sem esperar o cron das 08:00.

## O que o comando faz

O comando executa a mesma rotina que o cron diário chama. Ela percorre todos os
veículos, calcula quais manutenções estão em `alerta`, `urgente` ou `atrasada`,
grava uma notificação para cada uma e dispara o e-mail para o dono do veículo.

## Como rodar

Na raiz do projeto:

```bash
npm run notificar
```

Saída esperada:

```
🔄 Conectando ao MongoDB...
✅ Conectado ao MongoDB com sucesso!
🔔 Verificando manutenções próximas...
✅ Verificação concluída.
⏳ Aguardando 10s para o envio dos e-mails...
✅ Desconectado do MongoDB
🏁 Script finalizado.
```

## Como rodar no servidor

```bash
cd /home/ubuntu/minhagaragem
npm run notificar
```

O `npm run notificar` usa o `.env` da pasta onde é executado. No servidor, isso
significa o banco e as credenciais de e-mail de produção.

## Por que o script espera 10 segundos

O envio de e-mail roda em segundo plano, sem `await`, para não travar a
verificação. Se o processo encerrasse na hora, o SMTP seria interrompido e o
e-mail não sairia. A espera de 10 segundos dá tempo para o envio concluir.

## Quando nada é gerado

Se nenhum veículo tiver manutenção em `alerta`, `urgente` ou `atrasada`, o
script roda e não cria nada. Isso é o comportamento correto, não um erro.

Para conferir o estado dos veículos:

```bash
node --input-type=module -e "
import 'dotenv/config';
import { conectarBanco, getBanco, desconectarBanco } from './src/js/config/database.js';
import { calcularProximasManutencoes } from './src/js/manutencao-utils.js';
await conectarBanco();
const db = getBanco();
for (const v of await db.collection('veiculos').find({}).toArray()) {
  const naoOk = calcularProximasManutencoes(v, new Date()).filter(m => m.status !== 'ok');
  console.log(v.apelido, '| km:', v.kmAtual, '| alertas:', naoOk.length ? naoOk.map(m => m.nome + '=' + m.status).join(', ') : 'nenhum');
}
await desconectarBanco();
"
```

## Deduplicação

O script não cria notificação repetida. Se já existir uma notificação
`pendente` para o mesmo veículo e o mesmo tipo de manutenção, ele pula. Rodar o
comando várias vezes no mesmo dia não gera e-mails duplicados.

## Onde ficam os dados

- Notificações: coleção `notificacoes` do MongoDB.
- E-mails: enviados pelo `src/js/services/emailService.js`, usando as
  credenciais `EMAIL_USER` e `EMAIL_PASS` do `.env`.

## Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `scripts/notificar.js` | Script executado pelo `npm run notificar` |
| `src/js/services/notificacaoService.js` | `verificarManutencoesProximas()`, a rotina em si |
| `src/js/config/database.js` | Abre e fecha a conexão com o MongoDB |
| `src/js/models/Notificacao.js` | Grava e consulta as notificações |
| `src/js/services/emailService.js` | Envia os e-mails |
| `src/js/server.js` | Agenda a mesma rotina no cron das 08:00 de Brasília |
| `src/js/manutencao-utils.js` | Calcula os status das manutenções |

## Agendamento automático

O cron em `src/js/server.js` roda todos os dias às 08:00 de Brasília
(`America/Sao_Paulo`). O `npm run notificar` é apenas para execução manual,
quando você quer gerar as notificações na hora.
