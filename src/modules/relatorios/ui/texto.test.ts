import { describe, expect, it } from 'vitest';
import { nomeDeSaudacao } from './texto';

describe('nomeDeSaudacao', () => {
  it.each([
    ['Ana Exemplo', 'Ana'],
    ['Profa. Lúcia Exemplo — docente', 'Lúcia'],
    ['Prof. Carlos Souza', 'Carlos'],
    ['Professora Maria', 'Maria'],
    ['Coordenação (fictícia)', 'Coordenação'],
    ['  Lúcia  ', 'Lúcia'],
    ['', ''],
  ])('%j → %j', (nome, esperado) => {
    expect(nomeDeSaudacao(nome)).toBe(esperado);
  });
});
