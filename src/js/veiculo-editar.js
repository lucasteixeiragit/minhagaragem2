// URL da página
//      │
//      ▼
// Pega o ID do veículo
//      │
//      ▼
// Existe ID?
//  ┌───┴───┐
//  NÃO    SIM
//   │       │
//   ▼       ▼
// volta    chama API
// index    /api/vehicles/:id
//           │
//           ▼
//       veículo encontrado?
//        ┌───┴───┐
//       NÃO    SIM
//        │       │
//        ▼       ▼
//     volta    guarda dados
//     index       │
//                 ▼
//          preenche formulário
//                 │
//                 ▼
//         carrega intervalos
//                 │
//                 ▼
//         renderiza na tela

const params = new URLSearchParams(window.location.search); // pega os parametros que aparecem na url depois de ? (ID)
const veiculoId = params.get('id');

//verifica se existe id no banco de dados, se nao exitir, retorna para index
if(!veiculoId) {
    window.location.href = './index.html'
}

let veiculoAtual = null;
let intervalosAtuais = {}; // armazena os intervalos que estao sendo editados

const form = document.getElementById('formEditarVeiculo');
const containerIntervalos = document.getElementById('intervalosManutencoesContainer');


//Essa função é responsável por:
// chamar a API;
// buscar o veículo;
// verificar se a requisição foi bem-sucedida;
// pegar os dados;
// armazenar o veículo atual;
// preencher o formulário;
// carregar os intervalos;
// exibir esses intervalos.
async function carregarVeiculo() {
    const resposta = await fetch(`/api/vehicles/${veiculoId}`); //pesquisa no banco o veiculo do id
// resposta.ok
// resposta.status
// resposta.json()


// 200 → ok = true
// 201 → ok = true
// 404 → ok = false
// 500 → ok = false
    if (!resposta.ok) {
        alert('Não foi possível carregar o veículo.');
        window.location.href = './index.html';
        return;
    } 

    const dados = await resposta.json(); // transforma o json em objeto
    veiculoAtual = dados.veiculo;

    await carregarOpcoesEPreencher(veiculoAtual);
}

async function buscarJson(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) {
        throw new Error(`Falha ao carregar ${url}`);
    }
    return resposta.json();
}

function copiarIntervalos(intervalos) {
    return JSON.parse(JSON.stringify(intervalos || {}));
}

function definirValorSelect(select, valor) {
    if (!valor) {
        select.value = '';
        return;
    }

    const valorTexto = String(valor);
    if (![...select.options].some(option => option.value === valorTexto)) {
        select.appendChild(new Option(valorTexto, valorTexto));
    }
    select.value = valorTexto;
}

function preencherOpcoes(select, opcoes, placeholder, obterValor, obterTexto) {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    opcoes.forEach(opcao => {
        const valor = obterValor(opcao);
        select.appendChild(new Option(obterTexto(opcao), valor));
    });
    select.disabled = false;
}

async function carregarOpcoesEPreencher(veiculo) {
    const marca = document.getElementById('marca');
    const modelo = document.getElementById('modelo');
    const versao = document.getElementById('versao');
    const ano = document.getElementById('ano');
    const cambio = document.getElementById('cambio');

    const marcas = await buscarJson('/api/fabricantes/marcas');
    preencherOpcoes(marca, marcas, 'Selecione...', item => item, item => item);
    definirValorSelect(marca, veiculo.marca);

    const modelos = await buscarJson(`/api/fabricantes/${encodeURIComponent(veiculo.marca)}/modelos`);
    preencherOpcoes(modelo, modelos, 'Selecione...', item => item.nome, item => item.nome);
    definirValorSelect(modelo, veiculo.modelo);

    const versoes = await buscarJson(
        `/api/fabricantes/${encodeURIComponent(veiculo.marca)}/modelos/${encodeURIComponent(veiculo.modelo)}/versoes`
    );
    preencherOpcoes(versao, versoes, 'Selecione...', item => item.nome, item => `${item.nome} - ${item.motor} (${item.potencia})`);
    definirValorSelect(versao, veiculo.versao);

    const [anos, cambios] = await Promise.all([
        buscarJson(`/api/fabricantes/${encodeURIComponent(veiculo.marca)}/modelos/${encodeURIComponent(veiculo.modelo)}/versoes/${encodeURIComponent(veiculo.versao)}/anos`),
        buscarJson(`/api/fabricantes/${encodeURIComponent(veiculo.marca)}/modelos/${encodeURIComponent(veiculo.modelo)}/versoes/${encodeURIComponent(veiculo.versao)}/cambios`)
    ]);

    preencherOpcoes(ano, anos, 'Selecione...', item => item, item => item);
    preencherOpcoes(cambio, cambios, 'Selecione...', item => item.tipo, item => `${item.tipo} (${item.marchas} marchas)`);
    definirValorSelect(ano, veiculo.ano);
    definirValorSelect(cambio, veiculo.cambio);

    preencherFormulario(veiculo);
    intervalosAtuais = copiarIntervalos(veiculo.intervalosManutencoesPreventivas);
    renderizarIntervalos();
}

function preencherFormulario(veiculo) {
    document.getElementById('apelido').value = veiculo.apelido || '';
    document.getElementById('placa').value = veiculo.placa || '';
    document.getElementById('kmAtual').value = veiculo.kmAtual || '';
    document.getElementById('dataLeitura').value = veiculo.dataLeitura || '';
    document.getElementById('kmMensal').value = veiculo.kmMensal || '';
}

// carrega os intervalos já salvos no banco e permite alterar:
// intervalo em KM;
// intervalo em meses;
// descrição;
// nome exibido.
// O nome do intervalo não precisa ser alterado, pois ele é usado para encontrar a manutenção correspondente.
function renderizarIntervalos() {
    const intervalos = Object.entries(intervalosAtuais);

    if (intervalos.length === 0) {
        containerIntervalos.innerHTML = `
            <p class="form__helper">
                Nenhum intervalo configurado para este veículo.
            </p>
        `;
        return;
    }

    containerIntervalos.innerHTML = intervalos.map(
        ([chave, intervalo]) => `
            <div class="intervalo__card">
                <div class="intervalo__header">
                    <h3 class="intervalo__titulo">
                        ${intervalo.nome || chave}
                    </h3>
                </div>

                <div class="form__row">
                    <div class="form__field">
                        <label class="form__label">
                            INTERVALO EM KM
                        </label>

                        <input
                            class="form__input"
                            type="number"
                            data-chave="${chave}"
                            data-campo="intervaloKm"
                            value="${intervalo.intervaloKm || 0}"
                        >
                    </div>

                    <div class="form__field">
                        <label class="form__label">
                            INTERVALO EM MESES
                        </label>

                        <input
                            class="form__input"
                            type="number"
                            data-chave="${chave}"
                            data-campo="intervaloMeses"
                            value="${intervalo.intervaloMeses || 0}"
                        >
                    </div>
                </div>

                <div class="form__field">
                    <label class="form__label">
                        DESCRIÇÃO
                    </label>

                    <input
                        class="form__input"
                        type="text"
                        data-chave="${chave}"
                        data-campo="descricao"
                        value="${intervalo.descricao || ''}"
                    >
                </div>
            </div>
        `
    ).join('');

    containerIntervalos
        .querySelectorAll('[data-chave]')
        .forEach(input => {
            input.addEventListener('input', event => {
                const chave = event.target.dataset.chave;
                const campo = event.target.dataset.campo;

                intervalosAtuais[chave][campo] =
                    campo === 'descricao'
                        ? event.target.value
                        : Number(event.target.value);
            });
        });
}

    async function carregarIntervalosDoManual() {
        const marca = document.getElementById('marca').value;
        const modelo = document.getElementById('modelo').value;
        const versao = document.getElementById('versao').value;
        const cambio = document.getElementById('cambio').value;

        if (!marca || !modelo || !versao || !cambio) {
            return;
        }

        try {
            const intervalos = await buscarJson(
                `/api/fabricantes/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/versoes/${encodeURIComponent(versao)}/cambios/${encodeURIComponent(cambio)}/intervalos`
            );
            intervalosAtuais = copiarIntervalos(intervalos);
            renderizarIntervalos();
        } catch (erro) {
            console.error('Erro ao carregar intervalos do manual:', erro);
            alert('Não foi possível carregar os intervalos deste câmbio.');
        }
    }

    document.getElementById('marca').addEventListener('change', async event => {
        const modelo = document.getElementById('modelo');
        const versao = document.getElementById('versao');
        const ano = document.getElementById('ano');
        const cambio = document.getElementById('cambio');
        const marca = event.target.value;

        modelo.innerHTML = '<option value="">Carregando modelos...</option>';
        modelo.disabled = true;
        versao.innerHTML = '<option value="">Selecione o modelo primeiro</option>';
        versao.disabled = true;
        ano.innerHTML = '<option value="">Selecione a versão primeiro</option>';
        ano.disabled = true;
        cambio.innerHTML = '<option value="">Selecione a versão primeiro</option>';
        cambio.disabled = true;
        intervalosAtuais = {};
        renderizarIntervalos();

        if (!marca) return;

        try {
            const modelos = await buscarJson(`/api/fabricantes/${encodeURIComponent(marca)}/modelos`);
            preencherOpcoes(modelo, modelos, 'Selecione...', item => item.nome, item => item.nome);
        } catch (erro) {
            console.error('Erro ao carregar modelos:', erro);
        }
    });

    document.getElementById('modelo').addEventListener('change', async event => {
        const marca = document.getElementById('marca').value;
        const versao = document.getElementById('versao');
        const ano = document.getElementById('ano');
        const cambio = document.getElementById('cambio');
        const modelo = event.target.value;

        versao.innerHTML = '<option value="">Carregando versões...</option>';
        versao.disabled = true;
        ano.innerHTML = '<option value="">Selecione a versão primeiro</option>';
        ano.disabled = true;
        cambio.innerHTML = '<option value="">Selecione a versão primeiro</option>';
        cambio.disabled = true;
        intervalosAtuais = {};
        renderizarIntervalos();

        if (!marca || !modelo) return;

        try {
            const versoes = await buscarJson(`/api/fabricantes/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/versoes`);
            preencherOpcoes(versao, versoes, 'Selecione...', item => item.nome, item => `${item.nome} - ${item.motor} (${item.potencia})`);
        } catch (erro) {
            console.error('Erro ao carregar versões:', erro);
        }
    });

    document.getElementById('versao').addEventListener('change', async event => {
        const marca = document.getElementById('marca').value;
        const modelo = document.getElementById('modelo').value;
        const versao = event.target.value;
        const ano = document.getElementById('ano');
        const cambio = document.getElementById('cambio');

        ano.innerHTML = '<option value="">Carregando anos...</option>';
        ano.disabled = true;
        cambio.innerHTML = '<option value="">Carregando câmbios...</option>';
        cambio.disabled = true;
        intervalosAtuais = {};
        renderizarIntervalos();

        if (!marca || !modelo || !versao) return;

        try {
            const [anos, cambios] = await Promise.all([
                buscarJson(`/api/fabricantes/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/versoes/${encodeURIComponent(versao)}/anos`),
                buscarJson(`/api/fabricantes/${encodeURIComponent(marca)}/modelos/${encodeURIComponent(modelo)}/versoes/${encodeURIComponent(versao)}/cambios`)
            ]);
            preencherOpcoes(ano, anos, 'Selecione...', item => item, item => item);
            preencherOpcoes(cambio, cambios, 'Selecione...', item => item.tipo, item => `${item.tipo} (${item.marchas} marchas)`);
        } catch (erro) {
            console.error('Erro ao carregar anos e câmbios:', erro);
        }
    });

    document.getElementById('cambio').addEventListener('change', carregarIntervalosDoManual);

//Captura os dados atualizados
form.addEventListener('submit', async event => {
    event.preventDefault();  // Usuário clica em Salvar > submit > JavaScript intercepta > preventDefault() > navegador NÃO recarrega a página > JavaScript pode enviar os dados para a API


    const dadosAtualizados = {
        apelido: document.getElementById('apelido').value.trim(),
        marca: document.getElementById('marca').value.trim(),
        modelo: document.getElementById('modelo').value.trim(),
        versao: document.getElementById('versao').value.trim(),
        ano: Number(document.getElementById('ano').value) || null,
        cambio: document.getElementById('cambio').value.trim(),
        placa: document.getElementById('placa').value.trim(),
        kmAtual: Number(document.getElementById('kmAtual').value) || 0,
        dataLeitura: document.getElementById('dataLeitura').value.trim(),
        kmMensal: Number(document.getElementById('kmMensal').value) || 0,
        intervalosManutencoesPreventivas: intervalosAtuais
    };

    if (!dadosAtualizados.apelido) {
        alert('Informe o apelido do veículo');
        return;
    }

    try {
        const resposta = await fetch(`/api/vehicles/${veiculoId}`, { //envia os dados para o backend/api com endereco dinamica com base no veiculoId
            method: 'PUT', // PUT = Atualizar um recurso existente
            headers: { // Informa ao servidor que a requisicao está em JSON
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados) // transforma o objeto (dadosAtualizados) em JSON para leitura no banco de dados
        });

        const dados = await resposta.json(); //transforma a resposta em objeto JavaScript para retornar status

        if (!resposta.ok) {
            alert(dados.message || `Erro ao atualizar veículo.`);
            return; 
        }

        alert('Veículo atualizado com sucesso!');
        window.location.href = `./veiculo-detalhes.html?id=${veiculoId}`;
    } catch (erro) {
        console.error('Erro ao atualizar veículo.', erro);
        alert('Erro de conexão ao atualizar veículo');               
    }
});

document.getElementById('btnVoltar').addEventListener('click', () => {
    window.location.href =
        `./veiculo-detalhes.html?id=${veiculoId}`;
});

carregarVeiculo().catch(erro => {
    console.error('Erro ao carregar dados do veículo para edição:', erro);
    alert('Não foi possível carregar os dados do veículo.');
    window.location.href = './index.html';
});