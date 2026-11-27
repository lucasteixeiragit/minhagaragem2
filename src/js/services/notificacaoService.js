// ============================================================
// ARQUIVO: services/notificacaoService.js
// DESCRIÇÃO: Calcula manutenções próximas e envia emails
// ============================================================
import Veiculo from '../models/Veiculo.js';
import Usuario from '../models/Usuario.js';
import Notificacao from '../models/Notificacao.js';
import { enviarEmail } from './emailService.js';
import { calcularProximasManutencoes } from '../manutencao-utils.js';

// Estima a data em que o veículo deve atingir o KM da próxima manutenção
// É uma ESTIMATIVA baseada na média mensal de KM informada pelo dono do veículo
export function estimarDataVencimento(veiculo, kmRestantes, dataReferencia = new Date()) {
    const kmMensal = parseInt(veiculo.kmMensal) || 0;

    // Sem média mensal não há como projetar a data: mantém a data de referência
    if (!kmMensal) return new Date(dataReferencia);

    // Converte a média mensal em média diária e projeta quantos dias faltam
    // kmRestantes negativo (manutenção atrasada) gera data no passado, o que é o esperado
    const kmDiaria = kmMensal / 30;
    const diasRestantes = Math.round(kmRestantes / kmDiaria);

    const data = new Date(dataReferencia);
    data.setDate(data.getDate() + diasRestantes);
    return data;
}

// Processa um único veículo: cria as notificações e dispara os emails
async function notificarVeiculo(veiculo) {
    const proximas = calcularProximasManutencoes(veiculo, new Date());
    const urgentes = proximas.filter(m => m.status !== 'ok');

    for (const manutencao of urgentes) {
        const dono = await Usuario.buscarPorId(veiculo.ownerId);
        if (!dono || !dono.email) continue;

        // Evita notificação e email repetidos enquanto a anterior estiver pendente
        const jaNotificado = await Notificacao.existePendente({
            usuarioId: dono._id,
            veiculoId: veiculo._id,
            tipo: manutencao.nome
        });
        if (jaNotificado) continue;

        await Notificacao.criarNotificacao({
            usuarioId: dono._id,
            veiculoId: veiculo._id,
            tipo: manutencao.nome,
            mensagem: `A manutenção ${manutencao.nome} do veículo ${veiculo.apelido || veiculo.modelo} está próxima.`,
            dataVencimento: estimarDataVencimento(veiculo, manutencao.kmRestantes)
        });

        // O email é disparado sem await: a notificação já está salva e o envio
        // pode levar minutos, então não deve travar a verificação dos demais veículos
        enviarEmail({
            para: dono.email,
            assunto: `🔧 Manutenção próxima: ${manutencao.nome}`,
            texto: `Olá ${dono.nome}, a manutenção ${manutencao.nome} do veículo ${veiculo.apelido || veiculo.modelo} está próxima.`
        }).catch(erro => {
            console.error(`❌ Falha ao enviar email para ${dono.email}:`, erro.message);
        });
    }
}

// Verifica e envia notificações de manutenções próximas
export async function verificarManutencoesProximas() {
    let veiculos;
    try {
        veiculos = await Veiculo.listarTodosAdmin(); // precisa existir esse método
    } catch (erro) {
        console.error('❌ Falha ao listar veículos para notificação:', erro.message);
        return;
    }

    for (const veiculo of veiculos) {
        // Isola cada veículo: um erro aqui não impede a verificação dos demais
        try {
            await notificarVeiculo(veiculo);
        } catch (erro) {
            console.error(`❌ Falha ao verificar notificações do veículo ${veiculo._id}:`, erro.message);
        }
    }
}
