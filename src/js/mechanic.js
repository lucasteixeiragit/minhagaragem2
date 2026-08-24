// Mecânica: carrega veículos autorizados pela API e monta os cartões da oficina.
const alertEl = document.getElementById('alert');

function mostrarAlerta(mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert alert-${tipo} show`;
    setTimeout(() => { alertEl.className = 'alert'; }, 4000);
}

// A autorização real é feita pelo middleware/backend; esta checagem apenas orienta a navegação.
(async function verificarMecanica() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await res.json();
        if (data.user.role !== 'MECANICA' && data.user.role !== 'ADMIN') {
            window.location.href = '/index.html';
            return;
        }
        carregarVeiculos();
    } catch (error) {
        window.location.href = '/login.html';
    }
})();

document.getElementById('btnLogout').addEventListener('click', async (event) => {
    event.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
});

async function carregarVeiculos() {
    try {
        const res = await fetch('/api/mechanic/vehicles');
        if (!res.ok) throw new Error('Falha ao carregar veículos');
        const data = await res.json();
        const container = document.getElementById('listaVeiculos');
        container.innerHTML = '';

        if (!data.veiculos || data.veiculos.length === 0) {
            container.innerHTML = '<p style="color: oklch(0.6 0.01 280); text-align: center; padding: 40px;">Nenhum veículo vinculado à sua oficina.</p>';
            return;
        }

        data.veiculos.forEach((veiculo) => {
            const card = document.createElement('div');
            card.className = 'vehicle-card';
            card.innerHTML = `
                <div class="vehicle-info">
                    <h3>${veiculo.apelido || 'Veículo'}</h3>
                    <p>${veiculo.marca || ''} ${veiculo.modelo || ''} ${veiculo.versao || ''} • ${veiculo.ano || ''} • ${veiculo.placa || 'Sem placa'}</p>
                    <p>KM atual: ${veiculo.kmAtual || 0} km</p>
                </div>
                <button class="btn-primary" style="width: auto; padding: 10px 20px; margin: 0;" onclick="verDetalhes('${veiculo._id}')">
                    Ver detalhes
                </button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        mostrarAlerta('Erro ao carregar veículos.');
    }
}

window.verDetalhes = (id) => {
    window.location.href = `/veiculo-detalhes.html?id=${id}&mecanica=1`;
};
