// ============================================================
// ARQUIVO: scripts/catalogo-historico.js
// DESCRIÇÃO: Modelos e versões de 2005 em diante para o catálogo
// ============================================================
// Este arquivo é importado por scripts/seed-fabricantes.js, que mescla
// estes modelos e versões ao catálogo atual antes de gravar no MongoDB.
//
// LIGADO A:
//   - scripts/seed-fabricantes.js → mescla este array com o catálogo atual
//   - src/js/models/Fabricante.js → estrutura marca/modelo/versao/cambio/intervalos
//   - src/js/routes/fabricantes.js → expõe os dados em /api/fabricantes
//   - src/js/veiculo-novo.js → usa os intervalos no cadastro do veículo
//
// PROCEDÊNCIA DOS DADOS:
// Os intervalos são estimativas de prática de mercado brasileira, NÃO
// conferidos em manual oficial. Todos entram com confianca "baixa" e fonte
// declarando isso. Ao validar contra o manual, atualize fonte e confianca.
// ============================================================

const FONTE_PADRAO = 'Estimativa baseada em pratica de mercado brasileira; nao verificada em manual do fabricante';
const CONFIANCA_PADRAO = 'baixa';

// HELPER: intervalo()
// Monta um intervalo com as 6 propriedades exigidas pela validação do seed.
function intervalo(nome, intervaloKm, intervaloMeses, descricao) {
    return { nome, intervaloKm, intervaloMeses, descricao, fonte: FONTE_PADRAO, confianca: CONFIANCA_PADRAO };
}

// HELPER: kit()
// Conjunto padrão de 13 manutenções dos projetos mais recentes.
// O parâmetro 'over' substitui ou acrescenta itens (ex.: correiaDentada).
function kit(over = {}) {
    return {
        trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
        filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
        filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
        filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
        velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
        fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
        liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
        pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
        correiaAcessorios: intervalo('Correia de acessórios', 60000, 48, 'Substituição da correia poly-V'),
        bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
        pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
        alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento'),
        embreagem: intervalo('Embreagem', 100000, 120, 'Verificação do conjunto de embreagem'),
        ...over
    };
}

// HELPER: kitAntigo()
// Mesmo conjunto, com prazos mais curtos típicos dos projetos 2005-2014.
function kitAntigo(over = {}) {
    return kit({
        filtroAr: intervalo('Filtro de ar do motor', 20000, 24, 'Substituição do elemento filtrante'),
        velas: intervalo('Velas de ignição', 30000, 36, 'Substituição do jogo de velas'),
        fluidoFreio: intervalo('Fluido de freio', 30000, 24, 'Troca do fluido e sangria'),
        liquidoArrefecimento: intervalo('Líquido de arrefecimento', 60000, 48, 'Troca do líquido do radiador'),
        ...over
    });
}

// Correia dentada: usada apenas em motores que a possuem
const CORREIA_DENTADA = intervalo('Correia dentada', 60000, 60, 'Substituição da correia e tensor');

// HELPER: cambio()
function cambio(tipo, marchas, intervalos) {
    return { tipo, marchas: String(marchas), intervalos };
}

// HELPER: faixaAnos()
function faixaAnos(inicio, fim) {
    const lista = [];
    for (let ano = inicio; ano <= fim; ano++) lista.push(ano);
    return lista;
}

// Códigos de câmbio usados nas versões: [tipo aceito pela validação, marchas]
const CODIGOS = {
    M5: ['Manual', 5],
    M6: ['Manual', 6],
    A4: ['Automático', 4],
    A5: ['Automático', 5],
    A6: ['Automático', 6],
    A8: ['Automático', 8],
    A9: ['Automático', 9],
    CVT: ['CVT', 1],
    AM5: ['Automatizado', 5],
    AM7: ['Automatizado', 7]
};

// HELPER: versao()
// Monta a versão já com anos e câmbios. Usa kitAntigo quando o modelo
// termina até 2014 e kit nos modelos mais novos.
function versao(nome, motor, potencia, inicio, fim, codigos, extra = {}) {
    const anos = faixaAnos(inicio, fim);
    const base = fim <= 2014 ? kitAntigo(extra) : kit(extra);
    return {
        nome,
        motor,
        potencia,
        anos,
        cambios: codigos.map(codigo => {
            const [tipo, marchas] = CODIGOS[codigo];
            return cambio(tipo, marchas, base);
        })
    };
}

// HELPER: modelo()
function modelo(nome, descricao, versoes) {
    return { nome, descricao, versoes };
}

export const catalogoHistorico = [
    {
        marca: 'Chevrolet',
        modelos: [
            modelo('Onix', 'Hatch compacto', [
                versao('Joy 1.0', '1.0 12V Flex', '82 cv', 2020, 2025, ['M6']),
                versao('LT 1.0 Turbo', '1.0 12V Turbo Flex', '116 cv', 2020, 2025, ['M6', 'A6']),
                versao('LTZ 1.0', '1.0 12V Flex', '82 cv', 2020, 2024, ['M5']),
                versao('RS 1.0 Turbo', '1.0 12V Turbo Flex', '116 cv', 2020, 2025, ['A6']),
                versao('Premier 1.0 Turbo', '1.0 12V Turbo Flex', '116 cv', 2020, 2025, ['A6'])
            ]),
            modelo('Tracker', 'SUV compacto', [
                versao('LT 1.2 Turbo', '1.2 12V Turbo Flex', '133 cv', 2020, 2025, ['A6']),
                versao('Premier 1.2 Turbo', '1.2 12V Turbo Flex', '133 cv', 2020, 2025, ['A6'])
            ]),
            modelo('Celta', 'Hatch compacto', [
                versao('1.0 Life', '1.0 8V Flex', '78 cv', 2005, 2012, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 LS', '1.0 8V Flex', '78 cv', 2005, 2009, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 LT', '1.0 8V Flex', '78 cv', 2010, 2015, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 Spirit', '1.0 8V Flex', '78 cv', 2011, 2015, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 LT', '1.4 8V Flex', '95 cv', 2008, 2015, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 Advantage', '1.4 8V Flex', '95 cv', 2010, 2015, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Classic', 'Sedã compacto', [
                versao('1.0 LS', '1.0 8V Flex', '78 cv', 2005, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 Advantage', '1.0 8V Flex', '78 cv', 2010, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 Spirit', '1.0 8V Flex', '78 cv', 2012, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 LS', '1.4 8V Flex', '95 cv', 2008, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 Advantage', '1.4 8V Flex', '95 cv', 2010, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Corsa', 'Hatch compacto', [
                versao('1.0 Joy', '1.0 8V Flex', '78 cv', 2005, 2012, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 Maxx', '1.0 8V Flex', '78 cv', 2005, 2012, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 Maxx', '1.4 8V Flex', '105 cv', 2005, 2012, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 Premium', '1.4 8V Flex', '105 cv', 2008, 2012, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 SS', '1.8 8V Flex', '102 cv', 2005, 2009, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Astra', 'Hatch médio', [
                versao('1.8 Advantage', '1.8 8V Flex', '122 cv', 2005, 2011, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 Advantage', '2.0 8V Flex', '140 cv', 2005, 2011, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 Elegance', '2.0 8V Flex', '140 cv', 2005, 2011, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 SS', '2.0 8V Flex', '140 cv', 2005, 2009, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Vectra', 'Sedã médio', [
                versao('2.0 Elegance', '2.0 8V Flex', '140 cv', 2005, 2011, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 Expression', '2.0 8V Flex', '140 cv', 2007, 2011, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 GT', '2.0 16V Gasolina', '150 cv', 2005, 2009, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.4 16V', '2.4 16V Gasolina', '150 cv', 2005, 2006, ['A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Prisma', 'Sedã compacto', [
                versao('1.0 LT', '1.0 8V Flex', '78 cv', 2006, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 LTZ', '1.0 8V Flex', '78 cv', 2013, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 LT', '1.4 8V Flex', '106 cv', 2006, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 LTZ', '1.4 8V Flex', '106 cv', 2006, 2019, ['M5', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 Advantage', '1.4 8V Flex', '106 cv', 2010, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Montana', 'Picape compacta', [
                versao('1.4 LS', '1.4 8V Flex', '102 cv', 2005, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 Conquest', '1.4 8V Flex', '102 cv', 2010, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 Sport', '1.8 8V Flex', '114 cv', 2005, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 Conquest', '1.8 8V Flex', '114 cv', 2010, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('S10', 'Picape média', [
                versao('2.4 Flex', '2.4 8V Flex', '147 cv', 2005, 2019, ['M5', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.5 Flex', '2.5 8V Flex', '147 cv', 2005, 2011, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.8 Diesel 4x2', '2.8 16V Turbo Diesel', '200 cv', 2012, 2019, ['M6', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.8 Diesel 4x4', '2.8 16V Turbo Diesel', '200 cv', 2012, 2019, ['M6', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('4.3 V6', '4.3 12V Gasolina', '180 cv', 2005, 2011, ['A4'], { correiaDentada: CORREIA_DENTADA })
            ])
        ]
    },
    {
        marca: 'Volkswagen',
        modelos: [
            modelo('Polo', 'Hatch compacto', [
                versao('Track 1.0', '1.0 12V Flex', '84 cv', 2018, 2022, ['M5']),
                versao('Comfortline 1.0 TSI', '1.0 12V Turbo Flex', '128 cv', 2018, 2025, ['A6']),
                versao('GT 1.4 TSI', '1.4 16V Turbo Flex', '150 cv', 2019, 2022, ['A6'])
            ]),
            modelo('T-Cross', 'SUV compacto', [
                versao('Sense 1.0 TSI', '1.0 12V Turbo Flex', '128 cv', 2020, 2025, ['A6']),
                versao('Comfortline 1.0 TSI', '1.0 12V Turbo Flex', '128 cv', 2020, 2025, ['A6'])
            ]),
            modelo('Saveiro', 'Picape compacta', [
                versao('Robust 1.6', '1.6 8V Flex', '104 cv', 2010, 2025, ['M5']),
                versao('Startline 1.6', '1.6 8V Flex', '104 cv', 2014, 2025, ['M5']),
                versao('Trendline 1.6', '1.6 8V Flex', '104 cv', 2014, 2025, ['M5'])
            ]),
            modelo('Gol', 'Hatch compacto', [
                versao('1.0 G4', '1.0 8V Flex', '71 cv', 2005, 2013, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 G4', '1.6 8V Flex', '101 cv', 2005, 2008, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 G5', '1.0 8V Flex', '72 cv', 2008, 2013, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 G5', '1.6 8V Flex', '101 cv', 2008, 2013, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 G6', '1.0 8V Flex', '72 cv', 2013, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 G6', '1.6 8V Flex', '104 cv', 2013, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 G7', '1.0 12V Flex', '84 cv', 2016, 2023, ['M5'])
            ]),
            modelo('Parati', 'Perua compacta', [
                versao('1.0', '1.0 8V Flex', '71 cv', 2005, 2012, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Surf', '1.6 8V Flex', '101 cv', 2005, 2012, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Track', '1.6 8V Flex', '101 cv', 2005, 2010, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 GLS', '1.8 8V Gasolina', '106 cv', 2005, 2008, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Voyage', 'Sedã compacto', [
                versao('1.0 Trend', '1.0 8V Flex', '72 cv', 2008, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 Comfortline', '1.0 8V Flex', '72 cv', 2013, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Trend', '1.6 8V Flex', '104 cv', 2008, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Comfortline', '1.6 8V Flex', '104 cv', 2008, 2019, ['M5', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Highline', '1.6 8V Flex', '104 cv', 2013, 2019, ['M5', 'A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Fox', 'Hatch compacto', [
                versao('1.0 Plus', '1.0 8V Flex', '72 cv', 2005, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 Trend', '1.0 8V Flex', '72 cv', 2010, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 BlueMotion', '1.0 8V Flex', '72 cv', 2012, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Prime', '1.6 8V Flex', '104 cv', 2005, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Highline', '1.6 8V Flex', '104 cv', 2010, 2019, ['M5', 'A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Golf', 'Hatch médio', [
                versao('2.0 GTI', '2.0 16V Gasolina', '193 cv', 2005, 2008, ['M6'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Trendline', '1.6 8V Flex', '104 cv', 2009, 2013, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Comfortline', '1.6 8V Flex', '104 cv', 2009, 2013, ['M5', 'AM7'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 TSI Comfortline', '1.4 16V Turbo Flex', '150 cv', 2014, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 TSI Highline', '1.4 16V Turbo Flex', '150 cv', 2014, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Kombi', 'Utilitário de carga', [
                versao('1.4 Flex', '1.4 8V Flex', '78 cv', 2006, 2013, ['M5']),
                versao('1.4 Lotação', '1.4 8V Flex', '78 cv', 2006, 2013, ['M5'])
            ]),
            modelo('SpaceFox', 'Minivan compacta', [
                versao('1.6 Trend', '1.6 8V Flex', '104 cv', 2006, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Comfortline', '1.6 8V Flex', '104 cv', 2006, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Highline', '1.6 8V Flex', '104 cv', 2010, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Up!', 'Hatch compacto', [
                versao('1.0 Take', '1.0 12V Flex', '82 cv', 2014, 2019, ['M5']),
                versao('1.0 Move', '1.0 12V Flex', '82 cv', 2014, 2019, ['M5', 'AM5']),
                versao('1.0 High', '1.0 12V Flex', '82 cv', 2014, 2019, ['M5', 'AM5']),
                versao('1.0 TSI High', '1.0 12V Turbo Flex', '105 cv', 2016, 2019, ['M5', 'AM5'])
            ])
        ]
    },
    {
        marca: 'Fiat',
        modelos: [
            modelo('Argo', 'Hatch compacto', [
                versao('Trekking 1.3', '1.3 8V Flex', '109 cv', 2019, 2025, ['M5']),
                versao('Precision 1.8', '1.8 16V Flex', '139 cv', 2018, 2025, ['A6']),
                versao('HGT 1.8', '1.8 16V Flex', '139 cv', 2018, 2021, ['A6'])
            ]),
            modelo('Mobi', 'Hatch popular', [
                versao('Drive 1.0', '1.0 8V Flex', '77 cv', 2017, 2025, ['M5']),
                versao('Way 1.0', '1.0 8V Flex', '77 cv', 2017, 2025, ['M5'])
            ]),
            modelo('Strada', 'Picape compacta', [
                versao('Working 1.4', '1.4 8V Flex', '88 cv', 2010, 2020, ['M5']),
                versao('Endurance 1.3', '1.3 8V Flex', '109 cv', 2021, 2025, ['M5']),
                versao('Volcano 1.3', '1.3 8V Flex', '109 cv', 2021, 2025, ['A6'])
            ]),
            modelo('Toro', 'Picape média', [
                versao('Endurance 1.8', '1.8 16V Flex', '139 cv', 2016, 2025, ['A6']),
                versao('Volcano 1.8', '1.8 16V Flex', '139 cv', 2016, 2021, ['A6']),
                versao('Ultra 2.0 Diesel', '2.0 16V Turbo Diesel', '170 cv', 2017, 2025, ['A9']),
                versao('Ranch 2.0 Diesel', '2.0 16V Turbo Diesel', '170 cv', 2017, 2025, ['A9'])
            ]),
            modelo('Cronos', 'Sedã compacto', [
                versao('Drive 1.0', '1.0 8V Flex', '77 cv', 2018, 2025, ['M5']),
                versao('Precision 1.8', '1.8 16V Flex', '139 cv', 2018, 2025, ['A6'])
            ]),
            modelo('Uno', 'Hatch popular', [
                versao('1.0 Mille Fire', '1.0 8V Flex', '75 cv', 2005, 2013, ['M5']),
                versao('1.0 Mille Fire Economy', '1.0 8V Flex', '75 cv', 2010, 2013, ['M5']),
                versao('1.0 Vivace', '1.0 8V Flex', '75 cv', 2014, 2019, ['M5']),
                versao('1.0 Attractive', '1.0 8V Flex', '75 cv', 2014, 2019, ['M5']),
                versao('1.0 Way', '1.0 8V Flex', '75 cv', 2011, 2019, ['M5']),
                versao('1.4 Way', '1.4 8V Flex', '88 cv', 2011, 2019, ['M5'])
            ]),
            modelo('Palio', 'Hatch popular', [
                versao('1.0 Fire', '1.0 8V Flex', '75 cv', 2005, 2016, ['M5']),
                versao('1.0 Fire Economy', '1.0 8V Flex', '75 cv', 2010, 2016, ['M5']),
                versao('1.0 Celebration', '1.0 8V Flex', '75 cv', 2010, 2016, ['M5']),
                versao('1.4 Attractive', '1.4 8V Flex', '88 cv', 2008, 2016, ['M5']),
                versao('1.6 Essence', '1.6 16V Flex', '117 cv', 2012, 2016, ['M5']),
                versao('1.8 Sporting', '1.8 16V Flex', '132 cv', 2012, 2016, ['M5'])
            ]),
            modelo('Siena', 'Sedã compacto', [
                versao('1.0 Fire', '1.0 8V Flex', '75 cv', 2005, 2016, ['M5']),
                versao('1.0 Fire Economy', '1.0 8V Flex', '75 cv', 2010, 2016, ['M5']),
                versao('1.4 Attractive', '1.4 8V Flex', '88 cv', 2008, 2016, ['M5']),
                versao('1.6 Essence', '1.6 16V Flex', '117 cv', 2012, 2016, ['M5']),
                versao('1.8 Sporting', '1.8 16V Flex', '132 cv', 2012, 2016, ['M5'])
            ]),
            modelo('Punto', 'Hatch médio', [
                versao('1.4 Attractive', '1.4 8V Flex', '88 cv', 2008, 2016, ['M5']),
                versao('1.4 Sporting', '1.4 8V Flex', '88 cv', 2012, 2016, ['M5']),
                versao('1.4 T-Jet', '1.4 16V Turbo Gasolina', '152 cv', 2012, 2016, ['M5']),
                versao('1.8 Essence', '1.8 16V Flex', '132 cv', 2012, 2016, ['M5', 'A5']),
                versao('1.8 Sporting', '1.8 16V Flex', '132 cv', 2011, 2016, ['M5', 'A5'])
            ]),
            modelo('Idea', 'Minivan compacta', [
                versao('1.4 Attractive', '1.4 8V Flex', '88 cv', 2005, 2016, ['M5']),
                versao('1.4 Essence', '1.4 8V Flex', '88 cv', 2010, 2016, ['M5']),
                versao('1.8 Adventure', '1.8 16V Flex', '132 cv', 2008, 2016, ['M5']),
                versao('1.8 Sporting', '1.8 16V Flex', '132 cv', 2010, 2016, ['M5'])
            ]),
            modelo('Doblo', 'Utilitário', [
                versao('1.4 Attractive', '1.4 8V Flex', '85 cv', 2005, 2019, ['M5']),
                versao('1.4 Furgão', '1.4 8V Flex', '85 cv', 2010, 2019, ['M5']),
                versao('1.8 Essence', '1.8 8V Flex', '112 cv', 2010, 2019, ['M5']),
                versao('1.8 Adventure', '1.8 8V Flex', '112 cv', 2005, 2019, ['M5'])
            ]),
            modelo('Fiorino', 'Utilitário de carga', [
                versao('1.3 Furgão', '1.3 8V Flex', '73 cv', 2005, 2010, ['M5']),
                versao('1.4 Furgão', '1.4 8V Flex', '85 cv', 2005, 2019, ['M5']),
                versao('1.4 Endurance', '1.4 8V Flex', '85 cv', 2014, 2019, ['M5'])
            ]),
            modelo('Stilo', 'Hatch médio', [
                versao('1.8 8V Flex', '1.8 8V Flex', '110 cv', 2005, 2010, ['M5']),
                versao('1.8 Connect', '1.8 8V Flex', '110 cv', 2007, 2010, ['M5']),
                versao('2.4 20V', '2.4 20V Gasolina', '167 cv', 2005, 2008, ['M5', 'AM5'])
            ])
        ]
    },
    {
        marca: 'Hyundai',
        modelos: [
            modelo('HB20', 'Hatch compacto', [
                versao('Sense 1.0', '1.0 12V Flex', '80 cv', 2019, 2025, ['M5']),
                versao('Vision 1.0', '1.0 12V Flex', '80 cv', 2019, 2025, ['M5']),
                versao('Evolution 1.0 Turbo', '1.0 12V Turbo Flex', '120 cv', 2019, 2025, ['A6']),
                versao('Platinum 1.0 Turbo', '1.0 12V Turbo Flex', '120 cv', 2019, 2025, ['A6'])
            ]),
            modelo('Creta', 'SUV compacto', [
                versao('Action 1.6', '1.6 16V Flex', '130 cv', 2017, 2019, ['A6']),
                versao('Attitude 1.0', '1.0 12V Flex', '80 cv', 2017, 2025, ['M5']),
                versao('Prestige 2.0', '2.0 16V Flex', '166 cv', 2017, 2025, ['A6']),
                versao('Limited 1.0 Turbo', '1.0 12V Turbo Flex', '120 cv', 2020, 2025, ['A6'])
            ]),
            modelo('HB20S', 'Sedã compacto', [
                versao('1.0 Comfort', '1.0 12V Flex', '80 cv', 2013, 2019, ['M5']),
                versao('1.0 Comfort Plus', '1.0 12V Flex', '80 cv', 2016, 2019, ['M5']),
                versao('1.6 Comfort', '1.6 16V Flex', '128 cv', 2013, 2019, ['M5', 'A6']),
                versao('1.6 Premium', '1.6 16V Flex', '128 cv', 2013, 2019, ['M5', 'A6'])
            ]),
            modelo('i30', 'Hatch médio', [
                versao('2.0 GLS', '2.0 16V Flex', '145 cv', 2009, 2012, ['M5', 'A4']),
                versao('2.0 Comfort', '2.0 16V Flex', '145 cv', 2009, 2012, ['A4'])
            ]),
            modelo('Tucson', 'SUV médio', [
                versao('2.0 GLS', '2.0 16V Flex', '146 cv', 2005, 2015, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 Limited', '2.0 16V Flex', '146 cv', 2010, 2015, ['A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 Diesel', '2.0 16V Turbo Diesel', '150 cv', 2006, 2010, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.7 V6', '2.7 24V Gasolina', '175 cv', 2005, 2010, ['A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('ix35', 'SUV médio', [
                versao('2.0 GLS', '2.0 16V Flex', '178 cv', 2010, 2015, ['M5', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 Limited', '2.0 16V Flex', '178 cv', 2013, 2015, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Santa Fe', 'SUV grande', [
                versao('2.7 V6', '2.7 24V Gasolina', '185 cv', 2005, 2012, ['A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.2 Diesel', '2.2 16V Turbo Diesel', '197 cv', 2006, 2012, ['A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('3.3 V6', '3.3 24V Gasolina', '270 cv', 2013, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Elantra', 'Sedã médio', [
                versao('2.0 GLS', '2.0 16V Flex', '178 cv', 2011, 2016, ['M5', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 Limited', '2.0 16V Flex', '178 cv', 2014, 2016, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('HR', 'Utilitário leve', [
                versao('2.5 TCI Diesel', '2.5 16V Turbo Diesel', '130 cv', 2005, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.5 STD', '2.5 16V Turbo Diesel', '130 cv', 2005, 2012, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ])
        ]
    },
    {
        marca: 'Renault',
        modelos: [
            modelo('Kwid', 'Hatch compacto', [
                versao('Life 1.0', '1.0 12V Flex', '71 cv', 2017, 2025, ['M5']),
                versao('Zen 1.0', '1.0 12V Flex', '71 cv', 2017, 2025, ['M5']),
                versao('Outsider 1.0', '1.0 12V Flex', '71 cv', 2019, 2025, ['M5'])
            ]),
            modelo('Duster', 'SUV compacto', [
                versao('Dynamique 1.6', '1.6 16V Flex', '120 cv', 2011, 2025, ['M5']),
                versao('Technique 1.6', '1.6 16V Flex', '120 cv', 2011, 2020, ['M5']),
                versao('Dynamique 2.0', '2.0 16V Flex', '148 cv', 2011, 2020, ['A4']),
                versao('Intense 1.6 CVT', '1.6 16V Flex', '120 cv', 2020, 2025, ['CVT'])
            ]),
            modelo('Clio', 'Hatch compacto', [
                versao('1.0 16V', '1.0 16V Flex', '77 cv', 2005, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 16V Hi-Flex', '1.0 16V Flex', '77 cv', 2008, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V', '1.6 16V Flex', '115 cv', 2005, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Privilege', '1.6 16V Flex', '115 cv', 2008, 2016, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Megane', 'Hatch e sedã médio', [
                versao('1.6 16V', '1.6 16V Flex', '115 cv', 2005, 2011, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Expression', '1.6 16V Flex', '115 cv', 2008, 2011, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V', '2.0 16V Flex', '138 cv', 2005, 2011, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V Privilege', '2.0 16V Flex', '138 cv', 2008, 2011, ['A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Scenic', 'Minivan', [
                versao('1.6 16V', '1.6 16V Flex', '115 cv', 2005, 2010, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V', '2.0 16V Flex', '138 cv', 2005, 2010, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Logan', 'Sedã compacto', [
                versao('1.0 16V', '1.0 16V Flex', '77 cv', 2007, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 16V Expression', '1.0 16V Flex', '77 cv', 2010, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V', '1.6 16V Flex', '115 cv', 2007, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Dynamique', '1.6 16V Flex', '115 cv', 2010, 2019, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Stepway', '1.6 16V Flex', '115 cv', 2014, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Sandero', 'Hatch compacto', [
                versao('1.0 16V', '1.0 16V Flex', '77 cv', 2008, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 16V Expression', '1.0 16V Flex', '77 cv', 2010, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V', '1.6 16V Flex', '115 cv', 2008, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Dynamique', '1.6 16V Flex', '115 cv', 2010, 2019, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Stepway', '1.6 16V Flex', '115 cv', 2010, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Symbol', 'Sedã compacto', [
                versao('1.4 8V', '1.4 8V Flex', '98 cv', 2005, 2008, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V', '1.6 16V Flex', '115 cv', 2005, 2013, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Fluence', 'Sedã médio', [
                versao('1.6 16V', '1.6 16V Flex', '115 cv', 2011, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V', '2.0 16V Flex', '143 cv', 2011, 2019, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V Dynamique', '2.0 16V Flex', '143 cv', 2011, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Oroch', 'Picape compacta', [
                versao('1.6 16V', '1.6 16V Flex', '115 cv', 2015, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Dynamique', '1.6 16V Flex', '115 cv', 2016, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V', '2.0 16V Flex', '148 cv', 2015, 2019, ['M6', 'A4'], { correiaDentada: CORREIA_DENTADA })
            ])
        ]
    },
    {
        marca: 'Nissan',
        modelos: [
            modelo('Kicks', 'SUV compacto', [
                versao('S 1.6', '1.6 16V Flex', '114 cv', 2016, 2025, ['M5']),
                versao('SV 1.6 CVT', '1.6 16V Flex', '114 cv', 2016, 2025, ['CVT']),
                versao('SL 1.6 CVT', '1.6 16V Flex', '114 cv', 2016, 2025, ['CVT']),
                versao('Exclusive 1.6 CVT', '1.6 16V Flex', '114 cv', 2021, 2025, ['CVT'])
            ]),
            modelo('March', 'Hatch compacto', [
                versao('1.0 12V', '1.0 12V Flex', '74 cv', 2011, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 S', '1.0 12V Flex', '74 cv', 2011, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V', '1.6 16V Flex', '111 cv', 2011, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 SV', '1.6 16V Flex', '111 cv', 2011, 2019, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 SL', '1.6 16V Flex', '111 cv', 2011, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Versa', 'Sedã compacto', [
                versao('1.0 12V', '1.0 12V Flex', '74 cv', 2011, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.0 S', '1.0 12V Flex', '74 cv', 2011, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V', '1.6 16V Flex', '111 cv', 2011, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 SV', '1.6 16V Flex', '111 cv', 2011, 2019, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 SL', '1.6 16V Flex', '111 cv', 2011, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Tiida', 'Hatch e sedã médio', [
                versao('1.8 16V', '1.8 16V Flex', '126 cv', 2007, 2013, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 S', '1.8 16V Flex', '126 cv', 2007, 2013, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 SL', '1.8 16V Flex', '126 cv', 2007, 2013, ['A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Sentra', 'Sedã médio', [
                versao('2.0 16V', '2.0 16V Flex', '140 cv', 2007, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 S', '2.0 16V Flex', '140 cv', 2007, 2019, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 SV', '2.0 16V Flex', '140 cv', 2007, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 SL', '2.0 16V Flex', '140 cv', 2007, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Livina', 'Minivan compacta', [
                versao('1.8 16V', '1.8 16V Flex', '126 cv', 2007, 2013, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 S', '1.8 16V Flex', '126 cv', 2007, 2013, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 SL', '1.8 16V Flex', '126 cv', 2007, 2013, ['A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Frontier', 'Picape média', [
                versao('2.5 Flex', '2.5 16V Flex', '163 cv', 2008, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.5 S', '2.5 16V Flex', '163 cv', 2008, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.5 Diesel 4x2', '2.5 16V Turbo Diesel', '190 cv', 2008, 2019, ['M6'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.5 Diesel 4x4', '2.5 16V Turbo Diesel', '190 cv', 2008, 2019, ['M6'], { correiaDentada: CORREIA_DENTADA })
            ])
        ]
    },
    {
        marca: 'Toyota',
        modelos: [
            modelo('Corolla', 'Sedã médio', [
                versao('GLi 1.8', '1.8 16V Flex', '139 cv', 2005, 2025, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('XLi 1.8', '1.8 16V Flex', '139 cv', 2005, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('Altis 2.0', '2.0 16V Flex', '177 cv', 2008, 2025, ['CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('XEi 1.8', '1.8 16V Flex', '139 cv', 2014, 2025, ['CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('GR-S 2.0', '2.0 16V Flex', '177 cv', 2021, 2025, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Yaris', 'Hatch e sedã compacto', [
                versao('XS 1.5', '1.5 16V Flex', '107 cv', 2018, 2025, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('XLS 1.5', '1.5 16V Flex', '107 cv', 2018, 2025, ['CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('Cross 1.5', '1.5 16V Flex', '107 cv', 2021, 2025, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Etios', 'Hatch e sedã compacto', [
                versao('1.3 X', '1.3 16V Flex', '90 cv', 2012, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.3 XS', '1.3 16V Flex', '90 cv', 2012, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.5 XLS', '1.5 16V Flex', '107 cv', 2012, 2019, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.5 Platinum', '1.5 16V Flex', '107 cv', 2016, 2019, ['A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.5 Cross', '1.5 16V Flex', '107 cv', 2017, 2019, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Hilux', 'Picape média', [
                versao('2.7 Flex', '2.7 16V Flex', '163 cv', 2005, 2019, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.5 Diesel 4x2', '2.5 16V Turbo Diesel', '144 cv', 2005, 2011, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('3.0 Diesel 4x2', '3.0 16V Turbo Diesel', '163 cv', 2005, 2019, ['M5', 'A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('3.0 Diesel 4x4', '3.0 16V Turbo Diesel', '163 cv', 2005, 2019, ['M5', 'A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.8 Diesel 4x4', '2.8 16V Turbo Diesel', '177 cv', 2016, 2019, ['M6', 'A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('SW4', 'SUV grande', [
                versao('3.0 Diesel 4x4', '3.0 16V Turbo Diesel', '163 cv', 2005, 2019, ['M5', 'A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.8 Diesel 4x4', '2.8 16V Turbo Diesel', '177 cv', 2016, 2019, ['M6', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('4.0 V6', '4.0 24V Gasolina', '238 cv', 2005, 2011, ['A5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('RAV4', 'SUV médio', [
                versao('2.0 16V', '2.0 16V Flex', '145 cv', 2005, 2019, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.4 16V', '2.4 16V Gasolina', '170 cv', 2005, 2012, ['A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.5 16V', '2.5 16V Gasolina', '176 cv', 2013, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Camry', 'Sedã grande', [
                versao('2.4 16V', '2.4 16V Gasolina', '167 cv', 2005, 2011, ['A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.5 16V', '2.5 16V Gasolina', '181 cv', 2012, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('3.5 V6', '3.5 24V Gasolina', '277 cv', 2007, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Prius', 'Híbrido', [
                versao('1.5 Hybrid', '1.5 16V Híbrido', '110 cv', 2005, 2011, ['CVT']),
                versao('1.8 Hybrid', '1.8 16V Híbrido', '122 cv', 2012, 2019, ['CVT'])
            ])
        ]
    },
    {
        marca: 'Honda',
        modelos: [
            modelo('Civic', 'Sedã médio', [
                versao('LXS 1.8', '1.8 16V Flex', '140 cv', 2006, 2025, ['M5', 'A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('EX 1.8', '1.8 16V Flex', '140 cv', 2006, 2021, ['A5', 'CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('Sport 2.0', '2.0 16V Flex', '155 cv', 2014, 2025, ['CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('Si 2.4', '2.4 16V Gasolina', '206 cv', 2007, 2015, ['M6'], { correiaDentada: CORREIA_DENTADA }),
                versao('Touring 1.5 Turbo', '1.5 16V Turbo Gasolina', '173 cv', 2017, 2025, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('City', 'Sedã compacto', [
                versao('DX 1.5', '1.5 16V Flex', '116 cv', 2010, 2014, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('LX 1.5', '1.5 16V Flex', '116 cv', 2010, 2025, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('Sport 1.5', '1.5 16V Flex', '116 cv', 2015, 2025, ['CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('Touring 1.5', '1.5 16V Flex', '126 cv', 2021, 2025, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Fit', 'Hatch compacto', [
                versao('1.4 LX', '1.4 16V Flex', '101 cv', 2005, 2019, ['M5', 'A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 LXL', '1.4 16V Flex', '101 cv', 2009, 2019, ['M5', 'A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.5 DX', '1.5 16V Flex', '116 cv', 2005, 2008, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.5 EX', '1.5 16V Flex', '116 cv', 2009, 2019, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.5 EXL', '1.5 16V Flex', '116 cv', 2009, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('HR-V', 'SUV compacto', [
                versao('1.5 LX', '1.5 16V Flex', '126 cv', 2015, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 EX', '1.8 16V Flex', '139 cv', 2015, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 EXL', '1.8 16V Flex', '139 cv', 2015, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.8 Touring', '1.8 16V Flex', '139 cv', 2016, 2019, ['CVT'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('CR-V', 'SUV médio', [
                versao('2.0 LX', '2.0 16V Gasolina', '150 cv', 2005, 2019, ['A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 EXL', '2.0 16V Gasolina', '150 cv', 2010, 2019, ['A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.4 EX', '2.4 16V Gasolina', '180 cv', 2007, 2019, ['A5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Accord', 'Sedã grande', [
                versao('2.0 16V', '2.0 16V Gasolina', '155 cv', 2005, 2007, ['A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.4 16V', '2.4 16V Gasolina', '180 cv', 2005, 2019, ['A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('3.5 V6', '3.5 24V Gasolina', '280 cv', 2008, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Jazz', 'Hatch compacto', [
                versao('1.4 LX', '1.4 16V Flex', '101 cv', 2005, 2010, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.5 EX', '1.5 16V Flex', '116 cv', 2005, 2010, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA })
            ])
        ]
    },
    {
        marca: 'Jeep',
        modelos: [
            modelo('Renegade', 'SUV compacto', [
                versao('Sport 1.8', '1.8 16V Flex', '139 cv', 2015, 2025, ['A6']),
                versao('Longitude 1.8', '1.8 16V Flex', '139 cv', 2015, 2020, ['A6']),
                versao('Sport 1.3 Turbo', '1.3 16V Turbo Flex', '185 cv', 2022, 2025, ['A6']),
                versao('Trailhawk 2.0 Diesel', '2.0 16V Turbo Diesel', '170 cv', 2015, 2025, ['A9'])
            ]),
            modelo('Compass', 'SUV médio', [
                versao('2.0 Sport', '2.0 16V Flex', '166 cv', 2017, 2019, ['M6', 'A6']),
                versao('2.0 Longitude', '2.0 16V Flex', '166 cv', 2017, 2019, ['A6']),
                versao('2.0 Limited', '2.0 16V Flex', '166 cv', 2017, 2019, ['A6']),
                versao('2.0 Diesel Longitude', '2.0 16V Turbo Diesel', '170 cv', 2017, 2019, ['A9']),
                versao('2.0 Diesel Limited', '2.0 16V Turbo Diesel', '170 cv', 2017, 2019, ['A9'])
            ]),
            modelo('Cherokee', 'SUV médio', [
                versao('3.7 V6', '3.7 12V Gasolina', '213 cv', 2005, 2012, ['A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.4 Sport', '2.4 16V Flex', '177 cv', 2013, 2019, ['A9'], { correiaDentada: CORREIA_DENTADA }),
                versao('3.2 V6 Trailhawk', '3.2 24V Gasolina', '272 cv', 2014, 2019, ['A9'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Grand Cherokee', 'SUV grande', [
                versao('4.7 V8', '4.7 16V Gasolina', '231 cv', 2005, 2010, ['A5'], { correiaDentada: CORREIA_DENTADA }),
                versao('5.7 V8', '5.7 16V Gasolina', '326 cv', 2005, 2019, ['A5', 'A8'], { correiaDentada: CORREIA_DENTADA }),
                versao('3.0 Diesel', '3.0 24V Turbo Diesel', '241 cv', 2011, 2019, ['A8'], { correiaDentada: CORREIA_DENTADA }),
                versao('3.6 V6', '3.6 24V Gasolina', '286 cv', 2011, 2019, ['A8'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Wrangler', 'Off-road', [
                versao('3.8 V6', '3.8 12V Gasolina', '205 cv', 2007, 2011, ['M6', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.8 Diesel', '2.8 16V Turbo Diesel', '177 cv', 2007, 2011, ['M6'], { correiaDentada: CORREIA_DENTADA }),
                versao('3.6 V6', '3.6 24V Gasolina', '284 cv', 2012, 2019, ['M6', 'A5'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Patriot', 'SUV compacto', [
                versao('2.0 16V', '2.0 16V Flex', '156 cv', 2008, 2016, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.4 16V', '2.4 16V Flex', '170 cv', 2008, 2016, ['M5', 'CVT'], { correiaDentada: CORREIA_DENTADA })
            ])
        ]
    },
    {
        marca: 'Peugeot',
        modelos: [
            modelo('208', 'Hatch compacto', [
                versao('Active 1.6', '1.6 16V Flex', '122 cv', 2013, 2025, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('Griffe 1.6', '1.6 16V Flex', '122 cv', 2013, 2025, ['A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('GT 1.6 THP', '1.6 16V Turbo Flex', '173 cv', 2015, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('Like 1.0', '1.0 12V Flex', '75 cv', 2020, 2025, ['M5'])
            ]),
            modelo('206', 'Hatch compacto', [
                versao('1.4 Presence', '1.4 8V Flex', '80 cv', 2005, 2010, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 Sensation', '1.4 8V Flex', '80 cv', 2005, 2010, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V', '1.6 16V Flex', '110 cv', 2005, 2010, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Feline', '1.6 16V Flex', '110 cv', 2005, 2010, ['A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('207', 'Hatch compacto', [
                versao('1.4 XR', '1.4 8V Flex', '82 cv', 2009, 2014, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.4 XS', '1.4 8V Flex', '82 cv', 2009, 2014, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V', '1.6 16V Flex', '110 cv', 2009, 2014, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Griffe', '1.6 16V Flex', '110 cv', 2009, 2014, ['A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('307', 'Hatch e sedã médio', [
                versao('1.6 16V', '1.6 16V Flex', '110 cv', 2005, 2012, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Presence', '1.6 16V Flex', '110 cv', 2005, 2012, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V', '2.0 16V Flex', '151 cv', 2005, 2012, ['M5', 'A4'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V Feline', '2.0 16V Flex', '151 cv', 2005, 2012, ['A4'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('308', 'Hatch médio', [
                versao('1.6 16V', '1.6 16V Flex', '122 cv', 2012, 2019, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Griffe', '1.6 16V Flex', '122 cv', 2012, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 THP', '1.6 16V Turbo Flex', '166 cv', 2012, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V', '2.0 16V Flex', '151 cv', 2012, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('408', 'Sedã médio', [
                versao('2.0 16V', '2.0 16V Flex', '151 cv', 2011, 2019, ['M5', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('2.0 16V Griffe', '2.0 16V Flex', '151 cv', 2011, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 Turbo', '1.6 16V Turbo Flex', '166 cv', 2015, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('2008', 'SUV compacto', [
                versao('1.6 16V', '1.6 16V Flex', '122 cv', 2015, 2019, ['M5', 'A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V Griffe', '1.6 16V Flex', '122 cv', 2015, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 THP', '1.6 16V Turbo Flex', '166 cv', 2015, 2019, ['A6'], { correiaDentada: CORREIA_DENTADA })
            ]),
            modelo('Hoggar', 'Picape compacta', [
                versao('1.4 8V', '1.4 8V Flex', '82 cv', 2010, 2014, ['M5'], { correiaDentada: CORREIA_DENTADA }),
                versao('1.6 16V', '1.6 16V Flex', '113 cv', 2010, 2014, ['M5'], { correiaDentada: CORREIA_DENTADA })
            ])
        ]
    }
];
