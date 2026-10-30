# Contrato RPC: `painel_da_turma`

```sql
public.painel_da_turma(p_turma uuid) returns jsonb
-- language plpgsql stable security definer set search_path = ''
-- revoke all from public, anon; grant execute to authenticated
```

## Acesso (FR-002)

| Pessoa                                                                                                       | Resultado                                        |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Coordenação ativa da edição da turma                                                                         | `visao = 'gestao'`                               |
| Docente ou mentor ativo vinculado à turma                                                                    | `visao = 'gestao'`                               |
| Aluno com atribuição ativa na turma                                                                          | `visao = 'aluno'`                                |
| Turma inexistente                                                                                            | erro `P0002` `Turma não encontrada.`             |
| Qualquer outra (docente de outra turma, aluno de outra turma, aluno desativado, coordenação de outra edição) | erro `42501` `Você não tem acesso a esta turma.` |
| `anon`                                                                                                       | sem permissão de execução                        |

## Resposta

```json
{
  "visao": "gestao",
  "turma": {
    "id": "…",
    "nome": "3º ano A",
    "anoLetivo": 2026,
    "cursoNome": "…",
    "categoria": "…",
    "edicaoId": "…"
  },
  "alunos": [{ "id": "…", "nome": "…", "temEquipe": true }],
  "equipes": [
    {
      "id": "…",
      "nome": "Equipe Órbita",
      "integrantes": [{ "estudanteId": "…", "nome": "…", "integranteInativo": false }]
    }
  ],
  "convitesPendentes": 2,
  "pontuacao": null,
  "encontros": [
    {
      "id": "…",
      "numero": 1,
      "titulo": "…",
      "data": "2026-11-05",
      "inicio": "13:30",
      "fim": "17:00",
      "estado": "agendado",
      "ambienteNome": "Lab 2"
    }
  ]
}
```

Regras:

- `alunos`: atribuições `aluno` ativas da turma; `temEquipe = app.tem_equipe_ativa(edição, aluno)`.
- `equipes`: `duplas` ativas da turma; integrantes com `saida_em is null`; `integranteInativo` só na visão `gestao` (na visão `aluno` é `false`).
- `convitesPendentes`: `count(*)` de `convites_equipe` da turma com `situacao = 'pendente'` (visão `gestao`); `null` para aluno.
- `encontros`: todos os encontros da edição da turma (valem para todas as turmas, spec 002).
- `pontuacao`: sempre `null` nesta versão (sem lançamentos reais; Incrementos 3/4). O repositório
  da demonstração preenche o campo com dados fictícios (ver data-model `PontuacaoDoPainel`).
- Listas vazias são `[]`, nunca `null`.
