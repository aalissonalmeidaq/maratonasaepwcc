import { describe, expect, it } from 'vitest';
import { mensagemDeErro } from './erros';

const pg = (code: string, message: string) => ({ code, message, details: '', hint: '' });

describe('mensagens de erro do servidor', () => {
  it('traduz unicidade conhecida por restrição', () => {
    expect(
      mensagemDeErro(
        pg('23505', 'duplicate key value violates unique constraint "cursos_edicao_id_nome_key"'),
      ),
    ).toBe('Já existe um curso com esse nome nesta edição.');
    expect(
      mensagemDeErro(
        pg('23505', 'duplicate key value violates unique constraint "atribuicoes_aluno_uma_turma"'),
      ),
    ).toBe('O estudante já está ativo em outra turma desta edição.');
  });

  it('usa mensagem genérica para unicidade desconhecida', () => {
    expect(mensagemDeErro(pg('23505', 'duplicate key value violates unique constraint "x"'))).toBe(
      'Já existe um registro com esses dados.',
    );
  });

  it('repassa mensagens de regra escritas em português pelo servidor', () => {
    expect(
      mensagemDeErro(
        pg('23514', 'Um dos estudantes já participa de outra dupla ativa nesta edição.'),
      ),
    ).toBe('Um dos estudantes já participa de outra dupla ativa nesta edição.');
  });

  it('traduz violação de verificação técnica pelo nome da restrição', () => {
    expect(
      mensagemDeErro(
        pg(
          '23514',
          'new row for relation "encontros" violates check constraint "encontros_horario_valido"',
        ),
      ),
    ).toBe('O término deve ser depois do início.');
  });

  it('permissão negada vira mensagem clara', () => {
    expect(
      mensagemDeErro(pg('42501', 'new row violates row-level security policy for table "cursos"')),
    ).toBe('Você não tem permissão para esta operação.');
  });

  it('permissão negada com explicação do servidor em português mantém a explicação', () => {
    expect(mensagemDeErro(pg('42501', 'A coordenação só corrige registros existentes.'))).toBe(
      'A coordenação só corrige registros existentes.',
    );
    expect(mensagemDeErro(pg('42501', 'permission denied for table desafios'))).toBe(
      'Você não tem permissão para esta operação.',
    );
  });

  it('falha de rede deixa claro que nada foi gravado', () => {
    expect(mensagemDeErro(new TypeError('Failed to fetch'))).toBe(
      'Sem conexão com o servidor. Nada foi gravado; tente novamente.',
    );
  });

  it('erro desconhecido recebe mensagem genérica', () => {
    expect(mensagemDeErro('???')).toBe('Não foi possível concluir a operação. Tente novamente.');
  });
});
