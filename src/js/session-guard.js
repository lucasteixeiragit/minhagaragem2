// Guarda de sessão: impede o uso da página quando não existe uma sessão válida.
(async function exigirSessao() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) window.location.href = '/login.html';
    } catch (error) {
        window.location.href = '/login.html';
    }
})();
