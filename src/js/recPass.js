// script da tela de recuperação (recPass.html). 
// Ele faz uma única coisa: pega o e-mail que o usuário digitou, envia para a API (POST /api/auth/forgot-password) e mostra a resposta na tela.

//quando a página carrega, o JS procura no HTML os elementos pelos seus id e guarda as referências em constantes.
const form = document.getElementById('recPassForm');
const alertEl = document.getElementById('alert');
const btnRecPass = document.getElementById('btnRecPass');

//função recebe uma mensagem e um tipo (error ou success), coloca o texto no div de alerta e troca as classes CSS.
function mostrarAlertra (mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert__box alert__${tipo} alert__box--show`;
}

form.addEventListener('submit', async (event) => {
    event.preventDefault(); //Quando um form é enviado, o navegador recarrega a página por padrão. Se a página recarregar, todo o JS é perdido e o usuário vê um flash. O preventDefault() cancela esse comportamento padrão, deixando o envio nas mãos do nosso código.
    btnRecPass.disabled = true;
    btnRecPass.textContent = 'Enviando...';

    const email = document.getElementById('email').value.trim();

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;//padrão de busca em texto

    // / ... / — delimita a regex
    // ^ — "começa aqui"
    // [^\s@]+ — "um ou mais caracteres que NÃO sejam espaço nem @"
    // @ — "um @ literal"
    // [^\s@]+ — "um ou mais caracteres que não sejam espaço nem @"
    // \. — "um ponto literal" (o \ é necessário porque o ponto sozinho significa "qualquer caractere")
    // [^\s@]+ — "um ou mais caracteres que não sejam espaço nem @"
    // $ — "termina aqui"

    if(!regexEmail.test(email)) {
        mostrarAlertra('Informa um e-mail válido.');
        btnRecPass.disabled = false;
        btnRecPass.textContent = 'Enviar link de recuperação';
        return;
    }

    try {
        const res = await fetch('/api/auth/forgot-password', { //fetch — função nativa do navegador para fazer requisições HTTP. Ela retorna uma "promessa" (um valor que ainda não chegou), e o await faz o código pausar até a resposta chegar.
            method: 'POST',
            headers: {'Content-Type': 'application/json'}, //avisa o servidor: "o corpo desta requisição está no formato JSON".
            body: JSON.stringify({ email })
        });

        const data = await res.json(); //lê o corpo da resposta e converte de JSON (texto) de volta para objeto JS. O data.message é a mensagem que o servidor mandou.
        mostrarAlertra(data.message || 'Erro ao processar solicitação.', res.ok ? 'success' : 'error');
        btnRecPass.disabled = false;
        btnRecPass.textContent = 'Enviar link de recuperação';
             
    } catch (error) {
        mostrarAlertra('Erro de conexão. Tente novamente.');
        btnRecPass.disabled = false;
        btnRecPass.textContent = 'Enviar link de recuperação.';
    }

});