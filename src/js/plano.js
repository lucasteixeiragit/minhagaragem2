// ============================================================
// ARQUIVO: js/plano.js
// DESCRIÇÃO: Helper do plano do usuário no frontend
// ============================================================
// PAPEL: este arquivo NÃO bloqueia nada. Ele só descobre o plano e mostra
// o aviso de upgrade. Quem impede o acesso é o servidor, em
// middleware/plano.js. Esconder ou mostrar aqui é conveniência visual.
//
// FONTE DOS DADOS: GET /api/pagamento/status
//
// USADO POR:
//   - index.html        → cadeado no link "+ Adicionar Veiculo"
//   - veiculo-detalhes.js → aviso no campo de nota fiscal
//   - manutencao-nova.html e manutencao-editar.html → idem
//   - assinatura.html   → tela de assinatura
// ============================================================

// Guarda o último status para não repetir a chamada em cada uso
let cache = null;

// ============================================================
// FUNÇÃO: carregarPlano(forcar)
// PROPÓSITO: Busca o status do plano e guarda em cache
// RETORNO: objeto do /api/pagamento/status, ou null se não autenticado
// ============================================================
export async function carregarPlano(forcar = false) {
    if (cache && !forcar) return cache;

    try {
        const resposta = await fetch('/api/pagamento/status');
        if (!resposta.ok) return null;
        cache = await resposta.json();
        return cache;
    } catch (error) {
        console.error('Erro ao carregar o plano:', error);
        return null;
    }
}

// ============================================================
// FUNÇÃO: ehPro()
// PROPÓSITO: Atalho booleano para o plano ativo
// ============================================================
export async function ehPro() {
    const status = await carregarPlano();
    return Boolean(status && status.plano === 'PRO');
}

// ============================================================
// FUNÇÃO: formatarPreco(centavos)
// PROPÓSITO: Converte 2000 em "R$ 20,00"
// ============================================================
export function formatarPreco(centavos) {
    return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============================================================
// FUNÇÃO: formatarData(iso)
// PROPÓSITO: Converte a data ISO em "04/12/2026"
// ============================================================
export function formatarData(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR');
}

// ============================================================
// FUNÇÃO: abrirUpgrade(motivo)
// PROPÓSITO: Leva o usuário à tela de assinatura
// O motivo vai na query string para a tela destacar o recurso bloqueado.
// ============================================================
export function abrirUpgrade(motivo) {
    const destino = motivo ? `/assinatura.html?motivo=${encodeURIComponent(motivo)}` : '/assinatura.html';
    window.location.href = destino;
}

// ============================================================
// FUNÇÃO: montarAvisoUpgrade({ titulo, texto })
// PROPÓSITO: Cria o bloco visual de recurso pago, reaproveitado nas
// páginas que têm recurso bloqueado
// RETORNO: elemento pronto para inserir no DOM
// ============================================================
export function montarAvisoUpgrade({ titulo, texto }) {
    const caixa = document.createElement('div');
    caixa.className = 'upgrade-aviso';

    const rotulo = document.createElement('span');
    rotulo.className = 'upgrade-aviso__selo';
    rotulo.textContent = 'PRO';

    const corpo = document.createElement('div');
    corpo.className = 'upgrade-aviso__corpo';

    const tituloEl = document.createElement('strong');
    tituloEl.className = 'upgrade-aviso__titulo';
    tituloEl.textContent = titulo;

    const textoEl = document.createElement('p');
    textoEl.className = 'upgrade-aviso__texto';
    textoEl.textContent = texto;

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'upgrade-aviso__botao';
    botao.textContent = 'Assinar o Pro';
    botao.addEventListener('click', () => abrirUpgrade('geral'));

    corpo.appendChild(tituloEl);
    corpo.appendChild(textoEl);
    corpo.appendChild(botao);

    caixa.appendChild(rotulo);
    caixa.appendChild(corpo);

    return caixa;
}
