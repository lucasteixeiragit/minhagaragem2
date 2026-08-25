// ============================================================
// ARQUIVO: services/notificacaoService.js
// DESCRIÇÃO: Calcula manutenções próximas e envia emails
// ============================================================
import Veiculo from '../models/Veiculo.js';
import Usuario from '../models/Usuario.js';
import Notificacao from '../models/Notificacao.js';
import { enviarEmail } from './emailService.js';
import { calcularProximasManutencoes } from '../manutencao-utils.js';

// Verifica e envia notificações de manutenções próximas
export async function verificarManutencoesProximas() {
    const veiculos = await Veiculo.listarTodosAdmin(); // precisa existir esse método
    for (const veiculo of veiculos) {
        const proximas = calcularProximasManutencoes(veiculo, new Date());
        const urgentes = proximas.filter(m => m.status !== 'ok');

        for (const manutencao of urgentes) {
            const dono = await Usuario.buscarPorId(veiculo.ownerId);
            if (!dono || !dono.email) continue;

            await Notificacao.criarNotificacao({
                usuarioId: dono._id,
                veiculoId: veiculo._id,
                tipo: manutencao.nome,
                mensagem: `A manutenção ${manutencao.nome} do veículo ${veiculo.apelido || veiculo.modelo} está próxima.`,
                dataVencimento: new Date()
            });

            await enviarEmail({
                para: dono.email,
                assunto: `🔧 Manutenção próxima: ${manutencao.nome}`,
                texto: `Olá ${dono.nome}, a manutenção ${manutencao.nome} do veículo ${veiculo.apelido || veiculo.modelo} está próxima.`
            });
        }
    }
}
