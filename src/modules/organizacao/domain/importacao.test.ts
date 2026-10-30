import { describe, expect, it } from 'vitest';
import { LIMITE_DE_LINHAS, lerCsvDeAlunos } from './importacao';

const ok = (texto: string) => {
  const r = lerCsvDeAlunos(texto);
  if (!r.ok) throw new Error(`esperava leitura válida: ${r.erro}`);
  return r;
};

describe('lerCsvDeAlunos (FR-015)', () => {
  it('lê nome e e-mail com cabeçalho e separador vírgula', () => {
    const r = ok(
      'nome,email\nAna Exemplo,Ana@Exemplo.invalid\nBruno Exemplo,bruno@exemplo.invalid\n',
    );
    expect(r.validas).toEqual([
      { linha: 2, nome: 'Ana Exemplo', email: 'ana@exemplo.invalid' },
      { linha: 3, nome: 'Bruno Exemplo', email: 'bruno@exemplo.invalid' },
    ]);
    expect(r.recusadas).toEqual([]);
  });

  it('aceita ponto e vírgula, BOM, aspas, CRLF e cabeçalho com acentos em qualquer ordem', () => {
    const r = ok('\uFEFFE-mail;Nome\r\n"ana@exemplo.invalid";"Silva; Ana"\r\n');
    expect(r.validas).toEqual([{ linha: 2, nome: 'Silva; Ana', email: 'ana@exemplo.invalid' }]);
  });

  it('sem cabeçalho, a primeira coluna é o nome e a segunda o e-mail', () => {
    expect(ok('Ana Exemplo,ana@exemplo.invalid').validas).toEqual([
      { linha: 1, nome: 'Ana Exemplo', email: 'ana@exemplo.invalid' },
    ]);
  });

  it('ignora linhas vazias e preserva o número da linha original', () => {
    const r = ok('nome,email\n\nAna Exemplo,ana@exemplo.invalid\n   \nBruno,bruno@exemplo.invalid');
    expect(r.validas.map((l) => l.linha)).toEqual([3, 5]);
  });

  it('recusa linha a linha com motivo, sem barrar as demais', () => {
    const r = ok(
      [
        'nome,email',
        'Ana Exemplo,ana@exemplo.invalid',
        'Sem Email,nao-e-email',
        'A,curto@exemplo.invalid',
        'Repetida,ANA@exemplo.invalid',
        'so-uma-coluna',
        'Carla Exemplo,carla@exemplo.invalid',
      ].join('\n'),
    );
    expect(r.validas.map((l) => l.email)).toEqual(['ana@exemplo.invalid', 'carla@exemplo.invalid']);
    expect(r.recusadas).toEqual([
      { linha: 3, conteudo: 'Sem Email,nao-e-email', motivo: 'E-mail inválido.' },
      {
        linha: 4,
        conteudo: 'A,curto@exemplo.invalid',
        motivo: 'O nome deve ter de 2 a 160 caracteres.',
      },
      {
        linha: 5,
        conteudo: 'Repetida,ANA@exemplo.invalid',
        motivo: 'E-mail repetido no arquivo (linha 2).',
      },
      { linha: 6, conteudo: 'so-uma-coluna', motivo: 'A linha precisa ter nome e e-mail.' },
    ]);
  });

  it(`recusa o arquivo inteiro acima de ${LIMITE_DE_LINHAS} alunos ou vazio`, () => {
    const grande = Array.from(
      { length: LIMITE_DE_LINHAS + 1 },
      (_, i) => `Aluno ${i},a${i}@exemplo.invalid`,
    ).join('\n');
    expect(lerCsvDeAlunos(grande)).toEqual({
      ok: false,
      erro: `O arquivo tem mais de ${LIMITE_DE_LINHAS} alunos. Divida em arquivos menores.`,
    });
    expect(lerCsvDeAlunos('nome,email\n\n')).toEqual({
      ok: false,
      erro: 'O arquivo não tem nenhum aluno.',
    });
  });
});
