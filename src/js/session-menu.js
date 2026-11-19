// Menu de sessão: revela links conforme o usuário autenticado e encerra a sessão.
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

        // Contador de notificações pendentes exibido ao lado do link
        // O link leva à página do veículo que tem o alerta, onde ficam os botões Concluir/Adiar
        if (badgeNotificacoes) {
            try {
                const respostaNotificacoes = await fetch('/api/notificacoes');
                if (respostaNotificacoes.ok) {
                    const dadosNotificacoes = await respostaNotificacoes.json();
                    const pendentes = dadosNotificacoes.notificacoes || [];
                    const total = pendentes.length;

                    badgeNotificacoes.textContent = total;
                    badgeNotificacoes.style.display = total > 0 ? '' : 'none';

                    if (linkNotificacoes) {
                        if (total > 0 && pendentes[0].veiculoId) {
                            linkNotificacoes.href = `./veiculo-detalhes.html?id=${pendentes[0].veiculoId}`;
                        } else {
                            // Sem notificações não há para onde levar: esconde o link
                            linkNotificacoes.style.display = 'none';
                        }
                    }
                }
            } catch (erroNotificacoes) {
                // Falha ao contar notificações não deve quebrar o menu
                badgeNotificacoes.style.display = 'none';
            }
        }
    } catch (error) {
        // Usuários sem sessão permanecem com o menu público.
    }
})();
