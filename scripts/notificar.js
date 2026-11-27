// ============================================================
// ARQUIVO: scripts/notificar.js
// DESCRIÇÃO: Executa manualmente a verificação de manutenções próximas
// ============================================================
// Este script dispara a mesma rotina que o cron executa todos os dias às
// 08:00 de Brasília, sem precisar esperar o horário agendado.
//
// USO:
//   npm run notificar
//
// LIGADO A:
//   - src/js/services/notificacaoService.js → verificarManutencoesProximas()
//     é a rotina chamada aqui; ela cria as notificações e dispara os e-mails
//   - src/js/config/database.js → conectarBanco() e desconectarBanco()
//     abrem e fecham a conexão com o MongoDB
//   - src/js/server.js → cron.schedule('0 8 * * *', ...) chama a mesma
//     função no agendamento diário
//   - src/js/models/Notificacao.js → grava as notificações na coleção
//   - src/js/services/emailService.js → envia os e-mails das notificações
// ============================================================

import 'dotenv/config';
import { conectarBanco, desconectarBanco } from '../src/js/config/database.js';
import { verificarManutencoesProximas } from '../src/js/services/notificacaoService.js';

// Tempo de espera para os e-mails em segundo plano terminarem.
// O envio é fire-and-forget (sem await) dentro do service, então sem essa
// espera o processo encerraria antes do SMTP concluir e o e-mail não sairia.
const ESPERA_ENVIO_MS = 10000;

async function executar() {
    await conectarBanco();

    try {
        console.log('🔔 Verificando manutenções próximas...');
        await verificarManutencoesProximas();
        console.log('✅ Verificação concluída.');

        // Aguarda o envio dos e-mails disparados em segundo plano
        console.log(`⏳ Aguardando ${ESPERA_ENVIO_MS / 1000}s para o envio dos e-mails...`);
        await new Promise(resolve => setTimeout(resolve, ESPERA_ENVIO_MS));
    } finally {
        // Fecha a conexão mesmo se a verificação falhar
        await desconectarBanco();
    }
}

executar()
    .then(() => {
        console.log('🏁 Script finalizado.');
        process.exit(0);
    })
    .catch(erro => {
        console.error('❌ Falha ao executar a verificação:', erro.message);
        process.exit(1);
    });
