// ============================================================
// ARQUIVO: scripts/seed-fabricantes.js
// DESCRIÇÃO: Popula a coleção 'fabricantes' com o catálogo de veículos
// ============================================================
// Este script:
// - Monta o catálogo marca → modelos → versões → câmbios → intervalos
// - Valida a estrutura antes de gravar (chaves, tipos, valores positivos)
// - Faz upsert por marca, sem duplicar documentos
//
// USO:
//   npm run seed:fabricantes
//
// LIGADO A:
//   - scripts/catalogo-historico.js → modelos de 2005 em diante, mesclados aqui
//   - src/js/models/Fabricante.js → estrutura da coleção 'fabricantes'
//   - src/js/routes/fabricantes.js → consome os dados via API
//   - src/js/veiculo-novo.js → usa os intervalos ao cadastrar um veículo
//   - src/js/config/database.js → conectarBanco() e desconectarBanco()
//
// IMPORTANTE SOBRE A PROCEDÊNCIA DOS DADOS:
// Os intervalos abaixo refletem prática de mercado e conhecimento geral de
// manutenção preventiva. NÃO foram conferidos contra os manuais oficiais de
// cada fabricante. Por isso todos entram com confianca "baixa" e fonte
// declarando isso. Ao validar um modelo contra o manual real, atualize o
// campo 'fonte' e 'confianca' daquele intervalo.
// ============================================================

import 'dotenv/config';
import { conectarBanco, getBanco, desconectarBanco } from '../src/js/config/database.js';
// Catálogo complementar: modelos e versões de 2005 em diante
// Ver scripts/catalogo-historico.js para a estrutura e a procedência dos dados
import { catalogoHistorico } from './catalogo-historico.js';

const COLECAO = 'fabricantes';

// Texto padrão de procedência para os intervalos não verificados
const FONTE_PADRAO = 'Estimativa baseada em pratica de mercado brasileira; nao verificada em manual do fabricante';
const CONFIANCA_PADRAO = 'baixa';

// ============================================================
// HELPER: intervalo()
// Monta um objeto de intervalo já com as 6 propriedades exigidas
// ============================================================
function intervalo(nome, intervaloKm, intervaloMeses, descricao, fonte = FONTE_PADRAO, confianca = CONFIANCA_PADRAO) {
    return { nome, intervaloKm, intervaloMeses, descricao, fonte, confianca };
}

// ============================================================
// HELPER: cambio()
// Monta um objeto de câmbio com o mapa de intervalos
// ============================================================
function cambio(tipo, marchas, intervalos) {
    return { tipo, marchas: String(marchas), intervalos };
}

// ============================================================
// CATÁLOGO
// 20 modelos de passeio mais vendidos no Brasil
// ============================================================
const RANKING = 'Fenabrave - ranking de emplacamentos de automoveis de passeio, acumulado 2025';

const catalogo = [
    {
        marca: 'Chevrolet',
        modelos: [
            {
                nome: 'Onix',
                descricao: 'Hatch compacto',
                versoes: [
                    {
                        nome: 'LTZ 1.0 Turbo',
                        motor: '1.0 Turbo Flex',
                        potencia: '116 cv',
                        anos: [2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Manual', 6, {
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
                                embreagem: intervalo('Embreagem', 100000, 120, 'Verificação do conjunto de embreagem')
                            })
                        ]
                    },
                    {
                        nome: 'LT 1.0',
                        motor: '1.0 Aspirado Flex',
                        potencia: '78 cv',
                        anos: [2020, 2021, 2022, 2023, 2024],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaDentada: intervalo('Correia dentada', 60000, 60, 'Substituição da correia e tensor'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'Tracker',
                descricao: 'SUV compacto',
                versoes: [
                    {
                        nome: 'LTZ 1.2 Turbo',
                        motor: '1.2 Turbo Flex',
                        potencia: '133 cv',
                        anos: [2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Automático', 6, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão automática', 80000, 60, 'Troca do fluido da caixa automática'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                discosFreio: intervalo('Discos de freio', 60000, 48, 'Verificação e substituição dos discos'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            }
        ]
    },
    {
        marca: 'Volkswagen',
        modelos: [
            {
                nome: 'Polo',
                descricao: 'Hatch compacto',
                versoes: [
                    {
                        nome: 'Highline 1.0 TSI',
                        motor: '1.0 TSI Flex',
                        potencia: '128 cv',
                        anos: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Automático', 6, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão automática', 80000, 60, 'Troca do fluido da caixa automática'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaDentada: intervalo('Correia dentada', 120000, 120, 'Substituição da correia e tensor'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    },
                    {
                        nome: 'Comfortline 1.0 MPI',
                        motor: '1.0 MPI Flex',
                        potencia: '84 cv',
                        anos: [2018, 2019, 2020, 2021, 2022, 2023],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaDentada: intervalo('Correia dentada', 120000, 120, 'Substituição da correia e tensor'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'T-Cross',
                descricao: 'SUV compacto',
                versoes: [
                    {
                        nome: 'Highline 1.4 TSI',
                        motor: '1.4 TSI Flex',
                        potencia: '150 cv',
                        anos: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Automático', 6, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão automática', 80000, 60, 'Troca do fluido da caixa automática'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                discosFreio: intervalo('Discos de freio', 60000, 48, 'Verificação e substituição dos discos'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'Saveiro',
                descricao: 'Picape compacta',
                versoes: [
                    {
                        nome: 'Cross 1.6',
                        motor: '1.6 MSI Flex',
                        potencia: '116 cv',
                        anos: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaDentada: intervalo('Correia dentada', 120000, 120, 'Substituição da correia e tensor'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento'),
                                embreagem: intervalo('Embreagem', 100000, 120, 'Verificação do conjunto de embreagem')
                            })
                        ]
                    }
                ]
            }
        ]
    },
    {
        marca: 'Fiat',
        modelos: [
            {
                nome: 'Argo',
                descricao: 'Hatch compacto',
                versoes: [
                    {
                        nome: 'Drive 1.0',
                        motor: '1.0 Firefly Flex',
                        potencia: '77 cv',
                        anos: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaAcessorios: intervalo('Correia de acessórios', 60000, 48, 'Substituição da correia poly-V'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    },
                    {
                        nome: 'Drive 1.3 CVT',
                        motor: '1.3 Firefly Flex',
                        potencia: '109 cv',
                        anos: [2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('CVT', 7, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão CVT', 60000, 48, 'Troca do fluido da transmissão CVT'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'Mobi',
                descricao: 'Hatch de entrada',
                versoes: [
                    {
                        nome: 'Like 1.0',
                        motor: '1.0 Fire Flex',
                        potencia: '75 cv',
                        anos: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaAcessorios: intervalo('Correia de acessórios', 60000, 48, 'Substituição da correia poly-V'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'Strada',
                descricao: 'Picape compacta',
                versoes: [
                    {
                        nome: 'Freedom 1.3',
                        motor: '1.3 Firefly Flex',
                        potencia: '109 cv',
                        anos: [2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaAcessorios: intervalo('Correia de acessórios', 60000, 48, 'Substituição da correia poly-V'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento'),
                                embreagem: intervalo('Embreagem', 100000, 120, 'Verificação do conjunto de embreagem')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'Toro',
                descricao: 'Picape média',
                versoes: [
                    {
                        nome: 'Freedom 1.3 Turbo',
                        motor: '1.3 Turbo Flex',
                        potencia: '185 cv',
                        anos: [2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Automático', 6, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão automática', 80000, 60, 'Troca do fluido da caixa automática'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                discosFreio: intervalo('Discos de freio', 60000, 48, 'Verificação e substituição dos discos'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'Cronos',
                descricao: 'Sedã compacto',
                versoes: [
                    {
                        nome: 'Drive 1.3',
                        motor: '1.3 Firefly Flex',
                        potencia: '109 cv',
                        anos: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaAcessorios: intervalo('Correia de acessórios', 60000, 48, 'Substituição da correia poly-V'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            }
        ]
    },
    {
        marca: 'Hyundai',
        modelos: [
            {
                nome: 'HB20',
                descricao: 'Hatch compacto',
                versoes: [
                    {
                        nome: 'Comfort 1.0',
                        motor: '1.0 Kappa Flex',
                        potencia: '80 cv',
                        anos: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaDentada: intervalo('Correia dentada', 90000, 90, 'Substituição da correia e tensor'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    },
                    {
                        nome: 'Comfort 1.0 Turbo',
                        motor: '1.0 Turbo Flex',
                        potencia: '120 cv',
                        anos: [2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Automático', 6, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão automática', 80000, 60, 'Troca do fluido da caixa automática'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'Creta',
                descricao: 'SUV compacto',
                versoes: [
                    {
                        nome: 'Comfort 1.0 Turbo',
                        motor: '1.0 Turbo Flex',
                        potencia: '120 cv',
                        anos: [2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Automático', 6, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão automática', 80000, 60, 'Troca do fluido da caixa automática'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                discosFreio: intervalo('Discos de freio', 60000, 48, 'Verificação e substituição dos discos'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            }
        ]
    },
    {
        marca: 'Renault',
        modelos: [
            {
                nome: 'Kwid',
                descricao: 'Hatch de entrada',
                versoes: [
                    {
                        nome: 'Intense 1.0',
                        motor: '1.0 SCe Flex',
                        potencia: '71 cv',
                        anos: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaAcessorios: intervalo('Correia de acessórios', 60000, 48, 'Substituição da correia poly-V'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'Duster',
                descricao: 'SUV compacto',
                versoes: [
                    {
                        nome: 'Iconic 1.6',
                        motor: '1.6 SCe Flex',
                        potencia: '120 cv',
                        anos: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
                        cambios: [
                            cambio('Manual', 5, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaDentada: intervalo('Correia dentada', 90000, 90, 'Substituição da correia e tensor'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            }
        ]
    },
    {
        marca: 'Nissan',
        modelos: [
            {
                nome: 'Kicks',
                descricao: 'SUV compacto',
                versoes: [
                    {
                        nome: 'Advance 1.6 CVT',
                        motor: '1.6 16V Flex',
                        potencia: '114 cv',
                        anos: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('CVT', 6, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão CVT', 60000, 48, 'Troca do fluido da transmissão CVT'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaAcessorios: intervalo('Correia de acessórios', 60000, 48, 'Substituição da correia poly-V'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            }
        ]
    },
    {
        marca: 'Toyota',
        modelos: [
            {
                nome: 'Corolla',
                descricao: 'Sedã médio',
                versoes: [
                    {
                        nome: 'XEi 2.0',
                        motor: '2.0 Dynamic Force Flex',
                        potencia: '177 cv',
                        anos: [2020, 2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Automático', 10, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 100000, 120, 'Substituição do jogo de velas de irídio'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão automática', 80000, 60, 'Troca do fluido da caixa automática'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                discosFreio: intervalo('Discos de freio', 60000, 48, 'Verificação e substituição dos discos'),
                                correiaAcessorios: intervalo('Correia de acessórios', 80000, 60, 'Substituição da correia poly-V'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'Yaris',
                descricao: 'Hatch compacto',
                versoes: [
                    {
                        nome: 'XL 1.5',
                        motor: '1.5 Dual VVT-i Flex',
                        potencia: '110 cv',
                        anos: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
                        cambios: [
                            cambio('CVT', 7, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 100000, 120, 'Substituição do jogo de velas de irídio'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão CVT', 60000, 48, 'Troca do fluido da transmissão CVT'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            }
        ]
    },
    {
        marca: 'Honda',
        modelos: [
            {
                nome: 'Civic',
                descricao: 'Sedã médio',
                versoes: [
                    {
                        nome: 'EXL 2.0',
                        motor: '2.0 16V Flex',
                        potencia: '155 cv',
                        anos: [2017, 2018, 2019, 2020, 2021],
                        cambios: [
                            cambio('CVT', 7, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 40000, 48, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 100000, 120, 'Substituição do jogo de velas de irídio'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão CVT', 60000, 48, 'Troca do fluido da transmissão CVT'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                discosFreio: intervalo('Discos de freio', 60000, 48, 'Verificação e substituição dos discos'),
                                correiaAcessorios: intervalo('Correia de acessórios', 80000, 60, 'Substituição da correia poly-V'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            },
            {
                nome: 'City',
                descricao: 'Sedã compacto',
                versoes: [
                    {
                        nome: 'EX 1.5',
                        motor: '1.5 i-VTEC Flex',
                        potencia: '126 cv',
                        anos: [2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('CVT', 7, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 40000, 48, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 100000, 120, 'Substituição do jogo de velas de irídio'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão CVT', 60000, 48, 'Troca do fluido da transmissão CVT'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            }
        ]
    },
    {
        marca: 'Jeep',
        modelos: [
            {
                nome: 'Renegade',
                descricao: 'SUV compacto',
                versoes: [
                    {
                        nome: 'Longitude 1.3 Turbo',
                        motor: '1.3 Turbo Flex',
                        potencia: '185 cv',
                        anos: [2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Automático', 6, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão automática', 80000, 60, 'Troca do fluido da caixa automática'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                discosFreio: intervalo('Discos de freio', 60000, 48, 'Verificação e substituição dos discos'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            }
        ]
    },
    {
        marca: 'Peugeot',
        modelos: [
            {
                nome: '208',
                descricao: 'Hatch compacto',
                versoes: [
                    {
                        nome: 'Allure 1.6',
                        motor: '1.6 16V Flex',
                        potencia: '118 cv',
                        anos: [2021, 2022, 2023, 2024, 2025],
                        cambios: [
                            cambio('Automático', 6, {
                                trocaOleo: intervalo('Troca de óleo do motor', 10000, 12, 'Óleo e filtro de óleo do motor'),
                                filtroOleo: intervalo('Filtro de óleo', 10000, 12, 'Substituição do filtro de óleo'),
                                filtroAr: intervalo('Filtro de ar do motor', 30000, 24, 'Substituição do elemento filtrante'),
                                filtroCombustivel: intervalo('Filtro de combustível', 30000, 24, 'Substituição do filtro de combustível'),
                                filtroArCondicionado: intervalo('Filtro do ar-condicionado', 15000, 12, 'Substituição do filtro de cabine'),
                                velas: intervalo('Velas de ignição', 40000, 48, 'Substituição do jogo de velas'),
                                fluidoFreio: intervalo('Fluido de freio', 40000, 24, 'Troca do fluido e sangria'),
                                liquidoArrefecimento: intervalo('Líquido de arrefecimento', 80000, 60, 'Troca do líquido do radiador'),
                                oleoTransmissao: intervalo('Óleo da transmissão automática', 80000, 60, 'Troca do fluido da caixa automática'),
                                pastilhasFreio: intervalo('Pastilhas de freio', 30000, 24, 'Verificação e troca das pastilhas'),
                                correiaDentada: intervalo('Correia dentada', 90000, 90, 'Substituição da correia e tensor'),
                                bateria: intervalo('Bateria', 60000, 48, 'Verificação e substituição da bateria'),
                                pneus: intervalo('Pneus', 50000, 60, 'Rodízio e verificação de desgaste'),
                                alinhamento: intervalo('Alinhamento e balanceamento', 10000, 12, 'Alinhamento de direção e balanceamento')
                            })
                        ]
                    }
                ]
            }
        ]
    }
];

// ============================================================
// MESCLAGEM
// Junta o catálogo atual com os modelos históricos (2005+)
// ============================================================
// Regras:
// - Marca que só existe no histórico entra inteira
// - Marca que já existe recebe apenas os modelos com nome novo
// - Modelo já cadastrado recebe apenas as versões com nome novo
// Usado por validar() e executar() abaixo.
function mesclarCatalogo(base, extra) {
    const porMarca = new Map(base.map(marca => [marca.marca, marca]));

    extra.forEach(marcaExtra => {
        const existente = porMarca.get(marcaExtra.marca);

        if (!existente) {
            porMarca.set(marcaExtra.marca, marcaExtra);
            return;
        }

        marcaExtra.modelos.forEach(modeloExtra => {
            const modeloExistente = existente.modelos.find(modelo => modelo.nome === modeloExtra.nome);

            // Modelo novo: entra inteiro
            if (!modeloExistente) {
                existente.modelos.push(modeloExtra);
                return;
            }

            // Modelo já cadastrado: acrescenta só as versões com nome novo
            const versoes = new Set(modeloExistente.versoes.map(versao => versao.nome));
            modeloExtra.versoes.forEach(versaoExtra => {
                if (versoes.has(versaoExtra.nome)) return;
                modeloExistente.versoes.push(versaoExtra);
                versoes.add(versaoExtra.nome);
            });
        });
    });

    return [...porMarca.values()];
}

const catalogoCompleto = mesclarCatalogo(catalogo, catalogoHistorico);

// ============================================================
// VALIDAÇÃO
// Confere a estrutura antes de gravar, para não sujar o banco
// ============================================================
const CHAVES_VALIDAS = /^[a-z][a-zA-Z0-9]*$/;
const CONFIANCAS = ['alta', 'media', 'baixa'];
const TIPOS_CAMBIO = ['Manual', 'Automático', 'CVT', 'Automatizado'];

function validar() {
    const erros = [];

    catalogoCompleto.forEach((marca, iMarca) => {
        if (!marca.marca) erros.push(`[${iMarca}] marca sem nome`);

        (marca.modelos || []).forEach((modelo, iModelo) => {
            const ref = `${marca.marca} > ${modelo.nome}`;
            if (!modelo.nome) erros.push(`[${iMarca}] modelo sem nome`);

            (modelo.versoes || []).forEach(versao => {
                const refV = `${ref} > ${versao.nome}`;
                if (!Array.isArray(versao.anos) || versao.anos.length === 0) {
                    erros.push(`${refV}: anos vazio`);
                }
                versao.anos.forEach(ano => {
                    if (!Number.isInteger(ano)) erros.push(`${refV}: ano não inteiro (${ano})`);
                });

                (versao.cambios || []).forEach(cambioItem => {
                    const refC = `${refV} > ${cambioItem.tipo}`;
                    if (!TIPOS_CAMBIO.includes(cambioItem.tipo)) {
                        erros.push(`${refC}: tipo de câmbio inválido`);
                    }

                    const chaves = Object.keys(cambioItem.intervalos || {});
                    if (chaves.length < 4) erros.push(`${refC}: menos de 4 intervalos`);

                    chaves.forEach(chave => {
                        if (!CHAVES_VALIDAS.test(chave)) {
                            erros.push(`${refC}: chave inválida "${chave}"`);
                        }
                        const item = cambioItem.intervalos[chave];
                        ['nome', 'intervaloKm', 'intervaloMeses', 'descricao', 'fonte', 'confianca'].forEach(prop => {
                            if (item[prop] === undefined) erros.push(`${refC}.${chave}: falta "${prop}"`);
                        });
                        if (!Number.isInteger(item.intervaloKm) || item.intervaloKm <= 0) {
                            erros.push(`${refC}.${chave}: intervaloKm inválido`);
                        }
                        if (!Number.isInteger(item.intervaloMeses) || item.intervaloMeses <= 0) {
                            erros.push(`${refC}.${chave}: intervaloMeses inválido`);
                        }
                        if (!CONFIANCAS.includes(item.confianca)) {
                            erros.push(`${refC}.${chave}: confianca inválida`);
                        }
                    });
                });
            });
        });
    });

    return erros;
}

// ============================================================
// EXECUÇÃO
// ============================================================
async function executar() {
    const erros = validar();
    if (erros.length > 0) {
        console.error(`❌ ${erros.length} erro(s) de validação:`);
        erros.slice(0, 20).forEach(e => console.error('  -', e));
        process.exit(1);
    }
    console.log('✅ Validação OK');

    await conectarBanco();
    const db = getBanco();

    try {
        let inseridos = 0;
        let atualizados = 0;

        for (const marca of catalogoCompleto) {
            const resultado = await db.collection(COLECAO).updateOne(
                { marca: marca.marca },
                {
                    $set: {
                        marca: marca.marca,
                        modelos: marca.modelos,
                        fonteRanking: RANKING,
                        fonteHistorico: 'Modelos de 2005 em diante adicionados por conhecimento de mercado; intervalos nao verificados em manual',
                        atualizadoEm: new Date()
                    }
                },
                { upsert: true }
            );

            if (resultado.upsertedCount > 0) inseridos++;
            else atualizados++;
        }

        const total = await db.collection(COLECAO).countDocuments({});
        const modelos = await db.collection(COLECAO).aggregate([
            { $unwind: '$modelos' },
            { $count: 'total' }
        ]).toArray();

        console.log(`✅ Marcas inseridas: ${inseridos} | atualizadas: ${atualizados}`);
        console.log(`✅ Total de marcas na coleção: ${total}`);
        console.log(`✅ Total de modelos na coleção: ${modelos[0]?.total ?? 0}`);
    } finally {
        await desconectarBanco();
    }
}

executar()
    .then(() => {
        console.log('🏁 Seed finalizado.');
        process.exit(0);
    })
    .catch(erro => {
        console.error('❌ Falha no seed:', erro.message);
        process.exit(1);
    });
