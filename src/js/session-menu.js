// Menu de sessão: revela links conforme o usuário autenticado e encerra a sessão.
import { calcularProximasManutencoes } from './manutencao-utils.js';

// Conta os alertas reais dos veículos do usuário.
// Não basta contar as notificações gravadas: elas só nascem no cron diário,
// então um veículo com revisão vencida ficaria sem link no header até o cron rodar.
async function contarAlertas() {
    const [resNotificacoes, resVeiculos] = await Promise.all([
        fetch('/api/notificacoes'),
        fetch('/api/vehicles')
    ]);

    const notificacoes = resNotificacoes.ok ? ((await resNotificacoes.json()).notificacoes || []) : [];
    const veiculos = resVeiculos.ok ? ((await resVeiculos.json()).veiculos || []) : [];

    // Índice por veículo + tipo para saber quais alertas foram adiados
    const porChave = {};
    for (const notificacao of notificacoes) {
        porChave[`${notificacao.veiculoId}:${notificacao.tipo}`] = notificacao;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const alertas = [];
    for (const veiculo of veiculos) {
        for (const manutencao of calcularProximasManutencoes(veiculo, new Date())) {
            if (manutencao.status === 'ok') continue;

            // Alerta adiado para uma data futura fica oculto também no header
            const notificacao = porChave[`${veiculo._id}:${manutencao.nome}`];
            if (notificacao && notificacao.dataVencimento) {
                const dataAdiada = new Date(notificacao.dataVencimento);
                dataAdiada.setHours(0, 0, 0, 0);
                if (dataAdiada > hoje) continue;
            }

            alertas.push({
                veiculoId: veiculo._id,
                status: manutencao.status,
                kmRestantes: manutencao.kmRestantes
            });
        }
    }

    return alertas;
}

(async function configurarMenuSessao() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return;

        const data = await res.json();
        const usuario = data.user;
        const linkPerfil = document.getElementById('linkPerfil');
        const linkLogout = document.getElementById('linkLogout');
        const linkLogin = document.getElementById('linkLogin');
        const linkAdmin = document.getElementById('linkAdmin');
        const linkMecanica = document.getElementById('linkMecanica');
        const linkNotificacoes = document.getElementById('linkNotificacoes');
        const badgeNotificacoes = document.getElementById('badgeNotificacoes');

        if (linkPerfil) linkPerfil.style.display = '';
        if (linkLogout) linkLogout.style.display = '';
        if (linkLogin) linkLogin.style.display = 'none';
        if (linkNotificacoes) linkNotificacoes.style.display = '';
        if (linkAdmin && usuario.role === 'ADMIN') linkAdmin.style.display = '';
        if (linkMecanica && (usuario.role === 'MECANICA' || usuario.role === 'ADMIN')) {
            linkMecanica.style.display = '';
        }

        if (linkLogout) {
            linkLogout.addEventListener('click', async (event) => {
                event.preventDefault();
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login.html';
            });
        }

        // Contador de alertas exibido ao lado do link
        // O link leva à página do veículo com o alerta mais urgente, onde ficam Concluir/Adiar
        if (badgeNotificacoes) {
            try {
                const alertas = await contarAlertas();
                const total = alertas.length;

                badgeNotificacoes.textContent = total;
                badgeNotificacoes.style.display = total > 0 ? '' : 'none';

                if (linkNotificacoes) {
                    if (total > 0) {
                        // atrasada vem antes de urgente, que vem antes de alerta
                        const prioridade = { atrasada: 0, urgente: 1, alerta: 2 };
                        const maisUrgente = [...alertas].sort((a, b) => {
                            const diferenca = (prioridade[a.status] ?? 3) - (prioridade[b.status] ?? 3);
                            return diferenca !== 0 ? diferenca : a.kmRestantes - b.kmRestantes;
                        })[0];

                        linkNotificacoes.href = `./veiculo-detalhes.html?id=${maisUrgente.veiculoId}`;
                    } else {
                        // Sem alertas não há para onde levar: esconde o link
                        linkNotificacoes.style.display = 'none';
                    }
                }
            } catch (erroNotificacoes) {
                // Falha ao contar alertas não deve quebrar o menu
                badgeNotificacoes.style.display = 'none';
            }
        }
    } catch (error) {
        // Usuários sem sessão permanecem com o menu público.
    }
})();
