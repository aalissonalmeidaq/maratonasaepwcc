# Modelo de dados: encerramento da edição por turma

Nenhuma tabela nem coluna nova. Migration `20261107120000_encerramento_por_turma.sql` recria
`app.pendencias_json(p_id uuid)` e `public.edicoes_que_coordeno()`.

## Pendências do encerramento (formato novo)

```text
PendenciasDaEdicao = {
  ocorrenciasSemDecisao: number,   // spec 010, sem mudança
  revisoesAbertas: number,         // spec 010, sem mudança
  turmasSemDefinitiva: {           // spec 013, no lugar de categoriasSemRanking
    turmaId: uuid, turma: string, categoria: string,
    estado: 'sem_publicacao' | 'parcial' | 'provisorio'
  }[]
}
```

- Só turmas da edição com ao menos uma equipe ativa.
- `estado` vem da última publicação da turma (maior versão); a turma com a definitiva como última
  publicação não entra.
- Ordem: categoria e nome da turma.

## `public.edicoes.pendencias_no_encerramento`

Sem mudança de coluna. Encerramentos novos gravam o formato acima; os anteriores ficam com o
formato da spec 010 (`ocorrenciasSemDecisao`, `revisoesAbertas`, `categoriasSemRanking`), sem
migração; edições encerradas antes da spec 010 têm `null`.

## `edicoes_que_coordeno` (resposta)

Cada edição ganha `pendenciasNoEncerramento`: o JSON gravado no encerramento, ou `null`.

## Tipos do frontend (`@/modules/organizacao`)

```text
TurmaSemDefinitiva = { turmaId: string; turma: string; categoria: string;
                       estado: 'sem_publicacao' | 'parcial' | 'provisorio' }
PendenciasDaEdicao = { ocorrenciasSemDecisao: number; revisoesAbertas: number;
                       turmasSemDefinitiva: TurmaSemDefinitiva[] }
RegistroDoEncerramento = { ocorrenciasSemDecisao: number; revisoesAbertas: number;
                           turmasSemDefinitiva?: TurmaSemDefinitiva[];
                           categoriasSemRanking?: string[] }      // formato anterior
EdicaoGerida.pendenciasNoEncerramento?: RegistroDoEncerramento | null
```
