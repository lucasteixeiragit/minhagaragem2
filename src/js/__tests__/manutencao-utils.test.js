import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularKmAtualEstimado, calcularProximasManutencoes } from '../manutencao-utils.js';

test('calcularKmAtualEstimado estima a quilometragem a partir da média mensal', () => {
  const veiculo = {
    kmAtual: 10000,
    kmMensal: 3000,
    dataLeitura: '2025-01-01'
  };

  const kmEstimado = calcularKmAtualEstimado(veiculo, new Date('2025-01-31T00:00:00'));

  assert.equal(kmEstimado, 13000);
});

test('calcularProximasManutencoes usa o KM estimado para os alertas', () => {
  const veiculo = {
    kmAtual: 10000,
    kmMensal: 3000,
    dataLeitura: '2025-01-01',
    intervalosManutencoesPreventivas: {
      trocaOleo: {
        nome: 'Troca de óleo',
        descricao: 'Troca de óleo',
        intervaloKm: 1000,
        intervaloMeses: 6
      }
    },
    manutencoes: []
  };

  const proximas = calcularProximasManutencoes(veiculo, new Date('2025-01-31T00:00:00'));

  assert.equal(proximas[0].kmRestantes, 1000);
  assert.equal(proximas[0].kmProximaManutencao, 14000);
});
