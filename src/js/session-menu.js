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

        if (linkPerfil) linkPerfil.style.display = '';
        if (linkLogout) linkLogout.style.display = '';
        if (linkLogin) linkLogin.style.display = 'none';
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
    } catch (error) {
        // Usuários sem sessão permanecem com o menu público.
    }
})();
