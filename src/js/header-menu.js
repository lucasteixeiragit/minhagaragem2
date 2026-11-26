// ============================================================
// ARQUIVO: js/header-menu.js
// DESCRIÇÃO: Abre e fecha o menu do header em telas pequenas.
// LIGADO A:
//   - styles/responsive.css: define .header__toggle (botão) e
//     .header__nav--aberto (menu visível). Sem essas regras o botão
//     não aparece e a classe não tem efeito.
//   - HTML de todas as páginas: traz
//     <button class="header__toggle" id="btnMenu"> antes do <nav>.
// NÃO INTERFERE EM: js/session-menu.js, que apenas mostra ou esconde
//   links conforme o papel do usuário; aqui só se alterna a classe que
//   controla a visibilidade do menu inteiro.
// ============================================================
(function () {
    const botao = document.getElementById('btnMenu');
    const nav = document.querySelector('.header__nav');

    // Páginas sem header (ou sem o botão) simplesmente não fazem nada.
    if (!botao || !nav) return;

    function fecharMenu() {
        nav.classList.remove('header__nav--aberto');
        botao.setAttribute('aria-expanded', 'false');
    }

    // Clique no botão alterna o menu. stopPropagation evita que o
    // mesmo clique chegue ao listener de "clique fora" abaixo e o
    // feche imediatamente.
    botao.addEventListener('click', function (evento) {
        evento.stopPropagation();
        const aberto = nav.classList.toggle('header__nav--aberto');
        botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });

    // Clicar fora do menu fecha.
    document.addEventListener('click', function (evento) {
        if (!nav.contains(evento.target) && evento.target !== botao) {
            fecharMenu();
        }
    });

    // Escolher um link fecha, para o menu não ficar aberto na página nova.
    nav.addEventListener('click', function (evento) {
        if (evento.target.closest('a')) fecharMenu();
    });

    // Esc fecha, para quem navega pelo teclado.
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape') fecharMenu();
    });
})();
