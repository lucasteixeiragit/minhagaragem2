// ============================================================
// ARQUIVO: veiculo-novo.js (FRONTEND)
// DESCRIÇÃO: Formulário de cadastro de novo veículo
// ============================================================
// PÁGINA HTML: veiculo-novo.html
// RESPONSABILIDADES:
//   - Dropdowns em cascata (marca → modelo → versão → ano → câmbio)
//   - Buscar dados da API (/api/fabricantes/...)
//   - Coletar dados do veículo (apelido, placa, KM, KM/mês)
//   - Buscar intervalos de manutenção preventiva específicos por câmbio
//   - Salvar veículo no localStorage
//   - Redirecionar para página de detalhes do veículo criado
// ============================================================

// // Chave de armazenamento dos veículos
const STORAGE_KEY = "minhaGaragem.veiculos";

// Armazena intervalos de manutenção do câmbio selecionado
// Será salvo no veículo como 'intervalosManutencoesPreventivas'
let intervalosManutencoesAtual = {};

// ============================================================
// FUNÇÃO: carregarMarcas()
// ============================================================
// Busca marcas da API cadastradas no BD e popula primeiro dropdown
// ENDPOINT: GET /api/fabricantes/marcas
async function carregarMarcas() {
    try {
        const response = await fetch('/api/fabricantes/marcas'); // verifica se há informacoes de marcas no BD e extrai os dados
        const marcas = await response.json(); //transforma os dados em objetos e converte o json em array
        popularSelectMarcas(marcas); //roda a funcao popularSelectMarcas com as informacoes da const marcas
    } catch (error) {
        console.error('Erro ao carregar marcas:', error);
    }
}
// funcao responsavel por preencher as marcas recebidas de carregarMarcas no <select> do html
function popularSelectMarcas(marcas) {
    const selectMarca = document.getElementById('marca'); // procura o id 'marca' no HTML e apresenta as marcas na lista de opcoes
    selectMarca.innerHTML = '<option value="">Selecione...</option>'; //innerHTML remove as opcoes de marcas do HTML e sobrepoe com "Selecione..." dentro do <select>
    
    marcas.forEach(marca => { // percorre todas as marcas do array 
        const option = document.createElement('option'); // cria const para armazenar opcao escolhida posteriormente
        option.value = marca; // armazena a marca que o cliente escolheu na const option 
        option.textContent = marca; //apresenta no HTML a opcao(marca) escolhida
        selectMarca.appendChild(option); //adiciona as marcas nas opcoes para selecionar
    });
}

// ============================================================
// EVENT: mudança no select de MARCA
// ============================================================
// Quando usuário seleciona uma marca, busca modelos dessa marca
// Reseta dropdowns seguintes (versão, ano, câmbio)
document.getElementById('marca').addEventListener('change', async (e) => {
    const marca = e.target.value;
    const selectModelo = document.getElementById('modelo');
    const selectVersao = document.getElementById('versao');
    const selectAno = document.getElementById('ano');
    const selectCambio = document.getElementById('cambio');
    
    // Reseta e desabilita dropdowns seguintes
    selectVersao.innerHTML = '<option value="">Selecione o modelo primeiro</option>';
    selectVersao.disabled = true;
    selectAno.innerHTML = '<option value="">Selecione a versão primeiro</option>';
    selectAno.disabled = true;
    selectCambio.innerHTML = '<option value="">Selecione a versão primeiro</option>';
    selectCambio.disabled = true;
    
    // Limpa intervalos de manutenção
    intervalosManutencoesAtual = {};
    renderizarIntervalos();
    
    // Se marca foi desmarcada, desabilita select de modelo
    if (!marca) {
        selectModelo.innerHTML = '<option value="">Selecione a marca primeiro</option>';
        selectModelo.disabled = true;
        return;
    }
    
    // Busca modelos da marca selecionada
    // ENDPOINT: GET /api/fabricantes/:marca/modelos
    try {
        const response = await fetch(`/api/fabricantes/${encodeURIComponent(marca)}/modelos`);
        const modelos = await response.json();
        
        selectModelo.disabled = false;
        selectModelo.innerHTML = '<option value="">Selecione...</option>';
        
        modelos.forEach(modelo => {
            const option = document.createElement('option');
            option.value = modelo.nome;
            option.textContent = modelo.nome;
            selectModelo.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar modelos:', error);
    }
});

document.getElementById('modelo').addEventListener('change', async (e) => {
    const marca = document.getElementById('marca').value;
    const modelo = e.target.value;
    const selectVersao = document.getElementById('versao');
    const selectAno = document.getElementById('ano');
    const selectCambio = document.getElementById('cambio');
    
    selectAno.innerHTML = '<option value="">Selecione a versão primeiro</option>';
    selectAno.disabled = true;
    selectCambio.innerHTML = '<option value="">Selecione a versão primeiro</option>';
    selectCambio.disabled = true;
    intervalosManutencoesAtual = {};
    renderizarIntervalos();
    
    if (!marca || !modelo) {
        selectVersao.innerHTML = '<option value="">Selecione o modelo primeiro</option>';
        selectVersao.disabled = true;
        return;
    }
    
    try {
        const response = await fetch(`/api/fabricantes/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/versoes`);
        const versoes = await response.json();
        
        selectVersao.disabled = false;
        selectVersao.innerHTML = '<option value="">Selecione...</option>';
        
        versoes.forEach(versao => {
            const option = document.createElement('option');
            option.value = versao.nome;
            option.textContent = `${versao.nome} - ${versao.motor} (${versao.potencia})`;
            selectVersao.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar versões:', error);
    }
});

document.getElementById('versao').addEventListener('change', async (e) => {
    const marca = document.getElementById('marca').value;
    const modelo = document.getElementById('modelo').value;
    const versao = e.target.value;
    const selectAno = document.getElementById('ano');
    const selectCambio = document.getElementById('cambio');
    
    intervalosManutencoesAtual = {};
    renderizarIntervalos();
    
    if (!marca || !modelo || !versao) {
        selectAno.innerHTML = '<option value="">Selecione a versão primeiro</option>';
        selectAno.disabled = true;
        selectCambio.innerHTML = '<option value="">Selecione a versão primeiro</option>';
        selectCambio.disabled = true;
        return;
    }
    
    try {
        const [anosResponse, cambiosResponse] = await Promise.all([
            fetch(`/api/fabricantes/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/versoes/${encodeURIComponent(versao)}/anos`),
            fetch(`/api/fabricantes/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/versoes/${encodeURIComponent(versao)}/cambios`)
        ]);
        
        const anos = await anosResponse.json();
        const cambios = await cambiosResponse.json();
        
        selectAno.disabled = false;
        selectAno.innerHTML = '<option value="">Selecione...</option>';
        anos.forEach(ano => {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            selectAno.appendChild(option);
        });
        
        selectCambio.disabled = false;
        selectCambio.innerHTML = '<option value="">Selecione...</option>';
        cambios.forEach(cambio => {
            const option = document.createElement('option');
            option.value = cambio.tipo;
            option.textContent = `${cambio.tipo} (${cambio.marchas} marchas)`;
            selectCambio.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar anos e câmbios:', error);
    }
});

document.getElementById('cambio').addEventListener('change', async (e) => {
    const marca = document.getElementById('marca').value;
    const modelo = document.getElementById('modelo').value;
    const versao = document.getElementById('versao').value;
    const cambio = e.target.value;
    
    if (!marca || !modelo || !versao || !cambio) {
        intervalosManutencoesAtual = {};
        renderizarIntervalos();
        return;
    }
    
    try {
        const response = await fetch(`/api/fabricantes/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/versoes/${encodeURIComponent(versao)}/cambios/${encodeURIComponent(cambio)}/intervalos`);
        const intervalos = await response.json();
        
        intervalosManutencoesAtual = JSON.parse(JSON.stringify(intervalos));
        renderizarIntervalos();
    } catch (error) {
        console.error('Erro ao carregar intervalos:', error);
    }
});

// ============================================================
// FUNÇÕES DE ACESSO À API
// ============================================================

// Cria veículo via API (o ownerId é derivado do usuário autenticado no backend)
async function criarVeiculo(dados) {
    const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });
    return res;
}

function renderizarIntervalos() {
    const container = document.getElementById('intervalosManutencoesContainer');
    
    if (Object.keys(intervalosManutencoesAtual).length === 0) {
        container.innerHTML = '<p class="form__helper" style="color: oklch(0.5 0.02 260);">Selecione marca, modelo, versão e câmbio para carregar os intervalos automaticamente.</p>';
        return;
    }

    container.innerHTML = Object.entries(intervalosManutencoesAtual).map(([key, manutencao]) => {
        return `
            <div class="intervalo__card">
                <div class="intervalo__header">
                    <h3 class="intervalo__titulo">${manutencao.nome}</h3>
                    <button type="button" class="btn__remover__intervalo" data-key="${key}">×</button>
                </div>
                <div class="form__row">
                    <div class="form__field">
                        <label class="form__label" for="intervalo_km_${key}">INTERVALO (KM)</label>
                        <input class="form__input" type="number" id="intervalo_km_${key}" value="${manutencao.intervaloKm}" data-key="${key}" data-field="intervaloKm">
                    </div>
                    <div class="form__field">
                        <label class="form__label" for="intervalo_meses_${key}">OU A CADA (MESES)</label>
                        <input class="form__input" type="number" id="intervalo_meses_${key}" value="${manutencao.intervaloMeses}" data-key="${key}" data-field="intervaloMeses">
                    </div>
                </div>
                <div class="form__field">
                    <label class="form__label" for="intervalo_desc_${key}">DESCRIÇÃO</label>
                    <input class="form__input" type="text" id="intervalo_desc_${key}" value="${manutencao.descricao || ''}" data-key="${key}" data-field="descricao">
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('input[data-key]').forEach(input => {
        input.addEventListener('input', (e) => {
            const key = e.target.dataset.key;
            const field = e.target.dataset.field;
            if (intervalosManutencoesAtual[key]) {
                intervalosManutencoesAtual[key][field] = field === 'descricao' ? e.target.value : Number(e.target.value);
            }
        });
    });

    container.querySelectorAll('.btn__remover__intervalo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.target.dataset.key;
            delete intervalosManutencoesAtual[key];
            renderizarIntervalos();
        });
    });
}


// ao clicar em "Adicionar" em, veiculo-novo.html, armazena os dados do veiculo e verifica se todos os dados foram preenchidos
const form = document.getElementById("formNovoVeiculo");
// submit = "enviar"
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    //event.preventDefault() = diz ao navegador: "Não envie o formulário agora. Deixe o JavaScript controlar tudo.", por padrão depois de salvar o formulario a pagina é recarregada, assim impede o recarregamento

    const novoVeiculo = {
        apelido: document.getElementById("apelido").value.trim(), // .trim remove espaços do começo e do final, mas nao remove do meio. Usado para ficar bem registrado no BD
        marca: document.getElementById("marca").value,
        modelo: document.getElementById("modelo").value,
        versao: document.getElementById("versao").value,
        ano: document.getElementById("ano").value,
        cambio: document.getElementById("cambio").value,
        placa: document.getElementById("placa").value.trim(),
        kmAtual: document.getElementById("kmAtual").value,
        dataLeitura: document.getElementById("dataLeitura").value,
        kmMensal: document.getElementById("kmMensal").value,
        intervalosManutencoesPreventivas: intervalosManutencoesAtual
    };

    if (!novoVeiculo.apelido) {
        alert('Por favor, preencha o apelido do veículo.');
        return;
    }

    if (!novoVeiculo.marca || !novoVeiculo.modelo || !novoVeiculo.versao || !novoVeiculo.ano || !novoVeiculo.cambio) {
        alert('Por favor, selecione marca, modelo, versão, ano e câmbio do veículo.');
        return;
    }

    // Salva o veículo via API (ownerId é derivado do usuário autenticado)
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

    try {
        const res = await criarVeiculo(novoVeiculo);
        const data = await res.json();

        if (!res.ok) {
            alert(data.message || 'Erro ao salvar veículo.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Adicionar';
            return;
        }

        window.location.href = "./index.html"; // volta para pagina inical
    } catch (e) {
        console.error('Erro ao salvar veículo:', e);
        alert('Erro de conexão ao salvar veículo.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Adicionar';
    }
});

carregarMarcas();
renderizarIntervalos();
