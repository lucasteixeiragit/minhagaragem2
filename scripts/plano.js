// ============================================================
// ARQUIVO: scripts/plano.js
// DESCRIÇÃO: Gerencia o plano Pro de um usuário manualmente, para testes
// ============================================================
// Serve para atribuir, retirar e inspecionar a assinatura sem passar pelo
// checkout da InfinitePay. É uma ferramenta de teste: em produção o plano
// deve mudar pelo webhook de pagamento.
//
// USO:
//   npm run plano status <email>
//   npm run plano pro <email> [dias]
//   npm run plano free <email>
//   npm run plano reset-trial <email>
//   npm run plano limpar-pendentes <email>
//
// LIGADO A:
//   - src/js/models/Usuario.js → buscarPorEmail(), atualizarPlano() e
//     sanitizar(); é quem grava plano e planoExpiraEm no documento
//   - src/js/middleware/plano.js → planoAtivo() é a função que decide se o
//     usuário tem acesso; ela exige plano 'PRO' E planoExpiraEm no futuro
//   - src/js/models/Assinatura.js → listarDoUsuario() alimenta o histórico
//     exibido no perfil; a coleção é lida aqui só para exibição e limpeza
//   - src/js/routes/pagamento.routes.js → é quem altera o plano em produção,
//     pelo webhook; este script reproduz o mesmo efeito à mão
//   - src/js/config/database.js → conectarBanco() e desconectarBanco()
// ============================================================

import 'dotenv/config';
import { conectarBanco, desconectarBanco, getBanco } from '../src/js/config/database.js';
import Usuario from '../src/js/models/Usuario.js';
import Assinatura from '../src/js/models/Assinatura.js';
import { planoAtivo, DIAS_ASSINATURA } from '../src/js/middleware/plano.js';

// Formata uma data em pt-BR, ou devolve um traço quando não existe
function formatarData(valor) {
    if (!valor) return '—';
    return new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Busca o usuário pelo e-mail e encerra o script com erro claro se não achar.
// Sem isso, os comandos seguintes estourariam um TypeError em usuario._id.
async function exigirUsuario(email) {
    if (!email) {
        console.error('❌ Informe o e-mail do usuário.');
        process.exit(1);
    }

    const usuario = await Usuario.buscarPorEmail(email);

    if (!usuario) {
        console.error(`❌ Usuário não encontrado: ${email}`);
        process.exit(1);
    }

    return usuario;
}

// ============================================================
// COMANDO: status <email>
// PROPÓSITO: Mostra plano, vencimento, trial e histórico de cobranças
// ============================================================
async function status(email) {
    const usuario = await exigirUsuario(email);
    const assinaturas = await Assinatura.listarDoUsuario(usuario._id);

    console.log(`\n👤 ${usuario.nome} <${usuario.email}>`);
    console.log(`   id:            ${usuario._id}`);
    console.log(`   plano gravado: ${usuario.plano}`);
    console.log(`   vence em:      ${formatarData(usuario.planoExpiraEm)}`);
    console.log(`   trial usado:   ${usuario.trialUsado ? 'sim' : 'não'}`);
    // planoAtivo() é a mesma função que o middleware usa para liberar recursos,
    // então este é o valor que o sistema realmente enxerga.
    console.log(`   acesso Pro:    ${planoAtivo(usuario) ? 'LIBERADO' : 'BLOQUEADO'}`);

    if (assinaturas.length === 0) {
        console.log('\n   histórico: vazio');
    } else {
        console.log('\n   histórico:');
        for (const a of assinaturas) {
            console.log(`     ${a.orderNsu} | ${a.status} | ${a.valorCentavos} centavos | pago em ${formatarData(a.pagoEm)}`);
        }
    }
    console.log('');
}

// ============================================================
// COMANDO: pro <email> [dias]
// PROPÓSITO: Atribui o plano Pro por N dias (padrão DIAS_ASSINATURA)
// OBSERVAÇÃO: parte da data maior entre hoje e o vencimento atual, igual ao
// somarDias() de routes/pagamento.routes.js, para não encurtar quem renova.
// ============================================================
async function pro(email, diasTexto) {
    const usuario = await exigirUsuario(email);
    const dias = Number(diasTexto) || DIAS_ASSINATURA;

    if (!Number.isInteger(dias) || dias <= 0) {
        console.error('❌ O número de dias precisa ser um inteiro positivo.');
        process.exit(1);
    }

    const vencimentoAtual = usuario.planoExpiraEm ? new Date(usuario.planoExpiraEm) : null;
    const base = vencimentoAtual && vencimentoAtual.getTime() > Date.now() ? vencimentoAtual : new Date();
    const expiraEm = new Date(base);
    expiraEm.setDate(expiraEm.getDate() + dias);

    await Usuario.atualizarPlano(usuario._id, { plano: 'PRO', planoExpiraEm: expiraEm });

    console.log(`\n✅ ${usuario.email} agora é PRO por ${dias} dias.`);
    console.log(`   vence em: ${formatarData(expiraEm)}\n`);
}

// ============================================================
// COMANDO: free <email>
// PROPÓSITO: Retira o plano Pro e zera o vencimento
// OBSERVAÇÃO: não mexe em trialUsado, então o teste de 7 dias continua
// marcado como usado. Para liberar o teste de novo, use reset-trial.
// ============================================================
async function free(email) {
    const usuario = await exigirUsuario(email);

    await Usuario.atualizarPlano(usuario._id, { plano: 'FREE', planoExpiraEm: null });

    console.log(`\n✅ ${usuario.email} voltou para FREE.`);
    console.log('   trial usado continua:', usuario.trialUsado ? 'sim' : 'não');
    console.log('   para liberar o teste de novo: npm run plano reset-trial', email, '\n');
}

// ============================================================
// COMANDO: reset-trial <email>
// PROPÓSITO: Zera trialUsado para permitir conceder os 7 dias outra vez
// USADO QUANDO: o teste já foi consumido e você quer testar o fluxo de
// assinatura do começo, sem editar o banco à mão.
// ============================================================
async function resetTrial(email) {
    const usuario = await exigirUsuario(email);

    await getBanco().collection('usuarios').updateOne(
        { _id: usuario._id },
        { $set: { trialUsado: false, updatedAt: new Date() } }
    );

    console.log(`\n✅ trial liberado para ${usuario.email}.`);
    console.log('   o próximo POST /api/pagamento/assinar concede 7 dias de PRO.\n');
}

// ============================================================
// COMANDO: limpar-pendentes <email>
// PROPÓSITO: Remove as cobranças que ficaram em 'pendente'
// USADO QUANDO: o histórico do perfil acumula linhas "Pendente" de links de
// checkout que nunca foram pagos. Só apaga status 'pendente'; pagas ficam.
// ============================================================
async function limparPendentes(email) {
    const usuario = await exigirUsuario(email);

    const resultado = await getBanco().collection('assinaturas').deleteMany({
        userId: usuario._id,
        status: 'pendente'
    });

    console.log(`\n✅ ${resultado.deletedCount} assinatura(s) pendente(s) removida(s) de ${usuario.email}.\n`);
}

// ============================================================
// PONTO DE ENTRADA
// Lê o comando e o e-mail da linha de comando, abre a conexão, executa e
// fecha. O finally garante que a conexão fecha mesmo em caso de erro.
// ============================================================
async function executar() {
    const [comando, email, extra] = process.argv.slice(2);

    const comandos = {
        status,
        pro,
        free,
        'reset-trial': resetTrial,
        'limpar-pendentes': limparPendentes
    };

    if (!comando || !comandos[comando]) {
        console.error('Uso: npm run plano <comando> <email> [dias]');
        console.error('Comandos: status | pro | free | reset-trial | limpar-pendentes');
        process.exit(1);
    }

    await conectarBanco();

    try {
        await comandos[comando](email, extra);
    } finally {
        await desconectarBanco();
    }
}

executar()
    .then(() => process.exit(0))
    .catch(erro => {
        console.error('❌ Falha ao executar o comando:', erro.message);
        process.exit(1);
    });
