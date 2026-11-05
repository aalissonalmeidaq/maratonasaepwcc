# Contrato: RPCs

## `public.premissas_em_validacao() → jsonb`

- `security definer`, `stable`, `search_path = ''`; `grant execute` só a `authenticated`.
- Permissão: `app.e_coordenacao_em_alguma()` ou `app.atua_como_docente_em_alguma()` (docente ou
  mentor com vínculo ativo em alguma edição); demais → `42501` "Somente coordenação, docentes e
  mentores consultam as premissas.".
- Resposta:

```json
{
  "podeResponder": true,
  "premissas": [
    {
      "codigo": "P09",
      "tema": "Pontuação",
      "ordem": 1,
      "pergunta": "Como arredondar as notas fracionárias?",
      "premissaEmUso": "2 casas, meio para cima, só no componente e no total.",
      "ondeAfeta": "Cálculo de todos os componentes, total do encontro e ranking.",
      "opcoes": [],
      "referencia": "docs/decisoes-e-pendencias.md §3",
      "resolvidaPor": null,
      "situacao": "aguardando",
      "atual": null,
      "historico": []
    }
  ]
}
```

- `atual` e cada item de `historico`: `{ id, decisao, justificativa, autorNome, registradoEm }`;
  `historico` da mais antiga para a mais recente (inclui a atual). Nunca devolve `autor_id` nem
  e-mail.
- Ordem: tema (na ordem do Apêndice A), `ordem`, `codigo`. Premissas resolvidas vêm no fim com
  `resolvidaPor` preenchido.

## `public.responder_premissa(p_codigo text, p_decisao public.decisao_premissa, p_justificativa text, p_resposta_base uuid) → jsonb`

- `security definer`, `search_path = ''`; `grant execute` só a `authenticated`.
- Ordem das verificações:
  1. `app.e_coordenacao_em_alguma()` senão `42501` "Somente a coordenação registra respostas às
     premissas.".
  2. Premissa inexistente ou com `resolvida_por` → `23514` "Premissa não encontrada ou já
     resolvida.".
  3. `p_decisao` nula → `23514`; justificativa (após `btrim`) fora de 10–2.000 → `23514`
     "Justifique com 10 a 2.000 caracteres.".
  4. Trava a linha da premissa; resposta atual diferente de `p_resposta_base` → `40001` "Esta
     premissa foi respondida por outra pessoa. Veja a resposta atual antes de registrar.".
- Insere a resposta (com `app.justificativa` definido para a auditoria) e devolve
  `{ id, decisao, justificativa, autorNome, registradoEm }`.

## Funções recriadas com `America/Fortaleza` (sem mudança de contrato)

`app.encontro_realizado`, `app.proximo_encontro_json`, `app.inicio_do_encontro`,
`public.relatorio` — mesmas assinaturas, permissões e resultados.
